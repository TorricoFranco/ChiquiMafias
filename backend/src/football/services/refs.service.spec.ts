import { FootballRefsService } from './refs.service'

const makePrisma = () => ({
  providerRef: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    createMany: jest.fn(),
  },
  teams: { findUnique: jest.fn(), upsert: jest.fn() },
  players: { create: jest.fn(), upsert: jest.fn(), delete: jest.fn() },
})

const build = (name: 'api-football' | 'highlightly') => {
  const prisma = makePrisma()
  const service = new FootballRefsService(prisma as never, { name } as never)
  return { prisma, service }
}

describe('FootballRefsService', () => {
  describe('con api-football (columnas api_*)', () => {
    it('Debe devolver el ID de la columna sin consultar ProviderRef', async () => {
      const { prisma, service } = build('api-football')

      await expect(service.externalId('MATCH', 'm1', 1001)).resolves.toBe(1001)
      await expect(service.externalId('MATCH', 'm2', null)).resolves.toBeNull()
      expect(prisma.providerRef.findUnique).not.toHaveBeenCalled()
    })

    it('Debe armar el mapa de IDs de varios partidos sin consultar ProviderRef', async () => {
      const { prisma, service } = build('api-football')

      const ids = await service.matchExternalIds([
        { id: 'a', api_fixture_id: 1 },
        { id: 'b', api_fixture_id: null },
      ])

      expect([...ids]).toEqual([['a', 1]])
      expect(prisma.providerRef.findMany).not.toHaveBeenCalled()
    })

    it('Debe crear o actualizar el equipo como siempre', async () => {
      const { prisma, service } = build('api-football')
      prisma.teams.upsert.mockResolvedValue({ id: 't1', name: 'Boca' })

      const team = await service.resolveTeam(prisma as never, {
        externalId: 451,
        name: 'Boca',
      })

      expect(team).toEqual({ id: 't1', name: 'Boca' })
      expect(prisma.teams.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { api_team_id: 451 } }),
      )
    })

    it('Debe crear o actualizar al jugador como siempre y no crear vínculos', async () => {
      const { prisma, service } = build('api-football')
      prisma.players.upsert.mockResolvedValue({ id: 'p1' })

      const player = await service.resolvePlayer(prisma as never, {
        externalId: 10,
        name: 'Cavani',
      })

      expect(player).toEqual({ id: 'p1' })
      expect(prisma.providerRef.createMany).not.toHaveBeenCalled()
    })
  })

  describe('con otro proveedor (ProviderRef)', () => {
    it('Debe buscar el ID del proveedor activo en ProviderRef', async () => {
      const { prisma, service } = build('highlightly')
      prisma.providerRef.findUnique.mockResolvedValue({ external_id: 777 })

      await expect(service.externalId('MATCH', 'm1', 1001)).resolves.toBe(777)
      expect(prisma.providerRef.findUnique).toHaveBeenCalledWith({
        where: {
          entity_entity_id_provider: {
            entity: 'MATCH',
            entity_id: 'm1',
            provider: 'highlightly',
          },
        },
        select: { external_id: true },
      })
    })

    it('Debe devolver null si la entidad no está vinculada', async () => {
      const { prisma, service } = build('highlightly')
      prisma.providerRef.findUnique.mockResolvedValue(null)

      await expect(service.externalId('MATCH', 'm1', 1001)).resolves.toBeNull()
    })

    it('Debe armar el mapa de IDs de varios partidos con una sola consulta', async () => {
      const { prisma, service } = build('highlightly')
      prisma.providerRef.findMany.mockResolvedValue([
        { entity_id: 'a', external_id: 11 },
      ])

      const ids = await service.matchExternalIds([
        { id: 'a', api_fixture_id: 1 },
        { id: 'b', api_fixture_id: 2 },
      ])

      expect([...ids]).toEqual([['a', 11]])
      expect(prisma.providerRef.findMany).toHaveBeenCalledTimes(1)
    })

    it('Debe devolver el equipo vinculado y NO crear uno si no está vinculado', async () => {
      const { prisma, service } = build('highlightly')
      prisma.providerRef.findUnique.mockResolvedValueOnce({ entity_id: 't1' })
      prisma.teams.findUnique.mockResolvedValueOnce({ id: 't1', name: 'Boca' })

      const linked = await service.resolveTeam(prisma as never, {
        externalId: 5,
        name: 'Boca',
      })
      expect(linked).toEqual({ id: 't1', name: 'Boca' })

      prisma.providerRef.findUnique.mockResolvedValueOnce(null)
      const missing = await service.resolveTeam(prisma as never, {
        externalId: 6,
        name: 'Otro',
      })

      expect(missing).toBeNull()
      expect(prisma.teams.upsert).not.toHaveBeenCalled()
    })

    it('Debe reutilizar al jugador vinculado', async () => {
      const { prisma, service } = build('highlightly')
      prisma.providerRef.findUnique.mockResolvedValue({ entity_id: 'p1' })

      const player = await service.resolvePlayer(prisma as never, {
        externalId: 99,
        name: 'Cavani',
      })

      expect(player).toEqual({ id: 'p1' })
      expect(prisma.players.create).not.toHaveBeenCalled()
    })

    it('Debe crear al jugador sin ID de API-Football y vincularlo si no existe', async () => {
      const { prisma, service } = build('highlightly')
      // 1ª lectura: no existe; 2ª (después de vincular): apunta al recién creado.
      prisma.providerRef.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ entity_id: 'p-new' })
      prisma.players.create.mockResolvedValue({ id: 'p-new' })

      const player = await service.resolvePlayer(prisma as never, {
        externalId: 99,
        name: 'Cavani',
        position: 'F',
      })

      expect(player).toEqual({ id: 'p-new' })
      expect(prisma.players.create).toHaveBeenCalledWith({
        data: { name: 'Cavani', position: 'F' },
        select: { id: true },
      })
      expect(prisma.providerRef.createMany).toHaveBeenCalledWith({
        data: [
          {
            entity: 'PLAYER',
            entity_id: 'p-new',
            provider: 'highlightly',
            external_id: 99,
          },
        ],
        skipDuplicates: true,
      })
      expect(prisma.players.delete).not.toHaveBeenCalled()
    })

    it('Debe usar al jugador que creó otro cron en paralelo y descartar el propio', async () => {
      const { prisma, service } = build('highlightly')
      prisma.providerRef.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ entity_id: 'p-otro' })
      prisma.players.create.mockResolvedValue({ id: 'p-mio' })

      const player = await service.resolvePlayer(prisma as never, {
        externalId: 99,
        name: 'Cavani',
      })

      expect(player).toEqual({ id: 'p-otro' })
      expect(prisma.players.delete).toHaveBeenCalledWith({
        where: { id: 'p-mio' },
      })
    })

    it('No debe crear un jugador si el proveedor no informa su ID', async () => {
      const { prisma, service } = build('highlightly')

      await expect(
        service.resolvePlayer(prisma as never, {
          externalId: null,
          name: 'Cavani',
        }),
      ).resolves.toBeNull()
      expect(prisma.players.create).not.toHaveBeenCalled()
    })

    it('link debe devolver la entidad a la que quedó apuntando el ID externo', async () => {
      const { prisma, service } = build('highlightly')
      prisma.providerRef.findUnique.mockResolvedValue({ entity_id: 'm1' })

      await expect(service.link('MATCH', 'm1', 5)).resolves.toBe('m1')
    })

    it('link debe devolver otra entidad si el ID externo ya era de ella', async () => {
      const { prisma, service } = build('highlightly')
      prisma.providerRef.findUnique.mockResolvedValue({ entity_id: 'otra' })

      await expect(service.link('MATCH', 'm1', 5)).resolves.toBe('otra')
    })

    it('link debe devolver null si la entidad ya tenía otro ID externo', async () => {
      const { prisma, service } = build('highlightly')
      prisma.providerRef.findUnique.mockResolvedValue(null)

      await expect(service.link('MATCH', 'm1', 5)).resolves.toBeNull()
    })
  })
})
