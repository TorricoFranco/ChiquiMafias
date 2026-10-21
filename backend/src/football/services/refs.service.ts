import { Injectable, Logger } from '@nestjs/common'
import { FootballEntity, Prisma } from '@prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'
import { FootballDataProvider } from '../football-data.provider'
import { FootballPlayerRef, FootballTeamRef } from '../football.types'
import { upsertPlayer } from '../upserts/upsert-players'
import { upsertTeam } from '../upserts/upsert-team'

type Client = PrismaService | Prisma.TransactionClient

/**
 * Traduce entre las entidades internas (uuid) y los IDs del proveedor activo.
 *
 * - Con `api-football` el comportamiento es el de siempre: los IDs viven en las
 *   columnas `api_*` y los upserts crean lo que falte.
 * - Con cualquier otro proveedor los IDs se buscan en `ProviderRef`. Equipos,
 *   ligas y partidos que no estén vinculados NO se crean (se saltean con un
 *   aviso) para no duplicar datos; los jugadores sí se crean, porque no hay con
 *   qué vincularlos de antemano.
 */
@Injectable()
export class FootballRefsService {
  private readonly logger = new Logger(FootballRefsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: FootballDataProvider,
  ) {}

  get providerName(): string {
    return this.provider.name
  }

  /** true si los IDs del proveedor activo son los de las columnas `api_*`. */
  get usesLegacyColumns(): boolean {
    return this.provider.name === 'api-football'
  }

  // --- ID interno -> ID del proveedor ---

  async externalId(
    entity: FootballEntity,
    internalId: string,
    legacyId: number | null | undefined,
    client: Client = this.prisma,
  ): Promise<number | null> {
    if (this.usesLegacyColumns) return legacyId ?? null

    const ref = await client.providerRef.findUnique({
      where: {
        entity_entity_id_provider: {
          entity,
          entity_id: internalId,
          provider: this.provider.name,
        },
      },
      select: { external_id: true },
    })
    return ref?.external_id ?? null
  }

  /** Igual que `externalId` para muchas entidades con una sola consulta. */
  async externalIds(
    entity: FootballEntity,
    rows: { id: string; legacyId: number | null }[],
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>()
    if (this.usesLegacyColumns) {
      for (const r of rows)
        if (r.legacyId !== null) result.set(r.id, r.legacyId)
      return result
    }

    const refs = await this.prisma.providerRef.findMany({
      where: {
        entity,
        provider: this.provider.name,
        entity_id: { in: rows.map((r) => r.id) },
      },
      select: { entity_id: true, external_id: true },
    })
    for (const ref of refs) result.set(ref.entity_id, ref.external_id)
    return result
  }

  leagueExternalId(league: { id: string; api_league_id: number | null }) {
    return this.externalId('LEAGUE', league.id, league.api_league_id)
  }

  teamExternalId(team: { id: string; api_team_id: number | null }) {
    return this.externalId('TEAM', team.id, team.api_team_id)
  }

  matchExternalIds(matches: { id: string; api_fixture_id: number | null }[]) {
    return this.externalIds(
      'MATCH',
      matches.map((m) => ({ id: m.id, legacyId: m.api_fixture_id })),
    )
  }

  // --- ID del proveedor -> entidad interna ---

  async findInternalId(
    entity: FootballEntity,
    externalId: number,
    client: Client = this.prisma,
  ): Promise<string | null> {
    const ref = await client.providerRef.findUnique({
      where: {
        entity_provider_external_id: {
          entity,
          provider: this.provider.name,
          external_id: externalId,
        },
      },
      select: { entity_id: true },
    })
    return ref?.entity_id ?? null
  }

  /**
   * Registra el vínculo de una entidad con el ID del proveedor activo y devuelve
   * la entidad interna a la que ese ID quedó apuntando:
   * - el mismo `internalId` si el vínculo se creó o ya existía;
   * - otra entidad si otro proceso se adelantó con ese ID externo;
   * - null si `internalId` ya está vinculado a otro ID externo.
   * Usa `skipDuplicates` (ON CONFLICT DO NOTHING) para no abortar una transacción
   * de Postgres cuando dos crons vinculan lo mismo a la vez.
   */
  async link(
    entity: FootballEntity,
    internalId: string,
    externalId: number,
    client: Client = this.prisma,
  ): Promise<string | null> {
    await client.providerRef.createMany({
      data: [
        {
          entity,
          entity_id: internalId,
          provider: this.provider.name,
          external_id: externalId,
        },
      ],
      skipDuplicates: true,
    })
    return this.findInternalId(entity, externalId, client)
  }

  // --- Entidades a partir de lo que informa el proveedor ---

  /** Equipo interno de un equipo del proveedor; null si no existe o no está vinculado. */
  async findTeam(
    client: Client,
    ref: Pick<FootballTeamRef, 'externalId'>,
  ): Promise<{ id: string; name: string } | null> {
    if (this.usesLegacyColumns) {
      return client.teams.findUnique({
        where: { api_team_id: ref.externalId },
        select: { id: true, name: true },
      })
    }
    const id = await this.findInternalId('TEAM', ref.externalId, client)
    if (!id) return null
    return client.teams.findUnique({
      where: { id },
      select: { id: true, name: true },
    })
  }

  /**
   * Con API-Football crea o actualiza el equipo (como siempre). Con otro
   * proveedor solo lo busca: si no está vinculado devuelve null.
   */
  async resolveTeam(
    client: Client,
    ref: Pick<FootballTeamRef, 'externalId' | 'name'> &
      Partial<FootballTeamRef>,
  ): Promise<{ id: string; name: string } | null> {
    if (this.usesLegacyColumns) return upsertTeam(client, ref)

    const team = await this.findTeam(client, ref)
    if (!team) {
      this.logger.warn(
        `Equipo sin vincular: ${ref.name} (${this.provider.name}:${ref.externalId}). Corré la vinculación de IDs.`,
      )
    }
    return team
  }

  /**
   * Con API-Football crea o actualiza al jugador. Con otro proveedor lo busca
   * por vínculo y, si no existe, crea uno nuevo (sin ID de API-Football).
   */
  async resolvePlayer(
    client: Client,
    ref: FootballPlayerRef | null | undefined,
  ): Promise<{ id: string } | null> {
    if (!ref || ref.externalId === null || ref.externalId === undefined) {
      return null
    }
    if (this.usesLegacyColumns) return upsertPlayer(client, ref)

    const existing = await this.findInternalId('PLAYER', ref.externalId, client)
    if (existing) return { id: existing }

    const created = await client.players.create({
      data: {
        name: ref.name || 'Unknown',
        position: ref.position || null,
      },
      select: { id: true },
    })
    const linkedId = await this.link(
      'PLAYER',
      created.id,
      ref.externalId,
      client,
    )
    if (linkedId !== created.id) {
      // Otro cron creó y vinculó a este jugador en paralelo: se usa ese y se
      // descarta el que acabamos de crear.
      await client.players.delete({ where: { id: created.id } })
      return linkedId ? { id: linkedId } : null
    }
    return created
  }
}
