// import { Injectable } from '@nestjs/common'
// import { PrismaService } from 'src/prisma/prisma.service'
// import { ApiFootballHttp } from '../http/api-football.http'

// import { mapStatus } from '../mappers/mapStatus'
// import { parseRound } from '../functions/parseRounds'
// import { detectTournament } from '../functions/detectTournament'

// import { ApiFixture } from '../interfaces/fixture'
// import { ApiFootballResponse } from '../interfaces/types'
// import { upsertTeam } from '../upserts/upsert-team'
// import { upsertVenue } from '../upserts/upsert-venue'

// import { Logger } from '@nestjs/common'
// import { match } from 'assert'

// @Injectable()
// export class ApiFootballFixturesService {
//   private readonly logger = new Logger(ApiFootballFixturesService.name)
//   constructor(
//     private http: ApiFootballHttp,
//     private prisma: PrismaService,
//   ) { }

//   // FIXTURE
//   async getBySeason(season: number, league?: number) {
//     const res = await this.http.get<ApiFootballResponse<ApiFixture[]>>(
//       '/fixtures',
//       {
//         league,
//         season,
//       },
//     )

//     const fixtures = res.data.response
//     // Obtener liga del primer fixture
//     const leagueDate = await this.prisma.leagues.findUnique({
//       where: { api_league_id: fixtures[0].league.id },
//     })

//     if (!leagueDate) {
//       throw new Error('League not found in database')
//     }

//     await this.prisma.matches.updateMany({
//       where: {
//         league_id: leagueDate.id,
//         update: {
//           date: new Date(f.fixture.date),
//           timestamp: f.fixture.timestamp,
//           status: mapStatus(f.fixture.status.short),
//           status_short: f.fixture.status.short,
//           status_long: f.fixture.status.long,
//           referee: f.fixture.referee ?? null,
//           venue_id: venueId,
//           round: roundForDb,
//           tournament: tournamentForDb ?? '',
//           home_goals: f.goals.home ?? 0,
//           away_goals: f.goals.away ?? 0,
//           elapsed: f.fixture.status.elapsed,
//           // extra_time: f.fixture.status.elapsed
//           home_penalty_goals: f.score.penalty.home ?? null,
//           away_penalty_goals: f.score.penalty.away ?? null,
//         },
//         create: {
//           api_fixture_id: f.fixture.id,
//           league_id: league.id,
//           season: f.league.season,
//           round: roundForDb,
//           tournament: tournamentForDb ?? '',
//           date: new Date(f.fixture.date),
//           timestamp: f.fixture.timestamp,
//           timezone: f.fixture.timezone,
//           status: mapStatus(f.fixture.status.short),
//           status_short: f.fixture.status.short,
//           status_long: f.fixture.status.long,
//           referee: f.fixture.referee ?? null,
//           home_team_id: homeTeam.id,
//           away_team_id: awayTeam.id,
//           venue_id: venueId,
//           home_goals: f.goals.home ?? 0,
//           away_goals: f.goals.away ?? 0,
//           elapsed: f.fixture.status.elapsed,
//           home_penalty_goals: f.score.penalty.home ?? null,
//           away_penalty_goals: f.score.penalty.away ?? null,
//         },
//           season: f.league.season,
//           round: f.league.round,
//           tournament,
//           date: new Date(f.fixture.date),
//           timestamp: f.fixture.timestamp,
//           timezone: f.fixture.timezone,
//           status: mapStatus(f.fixture.status.short),
//           status_short: f.fixture.status.short,
//           status_long: f.fixture.status.long,
//           referee: f.fixture.referee,
//           home_team_id: homeTeam.id,
//           away_team_id: awayTeam.id,
//           venue_id: venueId,
//         },
//       })
//     }

//     return fixtures
//   }
//   // ROUNDS
//   async getRounds(season: number, leagueApiId = 128) {
//     // const res = await this.http.get<ApiFootballResponse<string[]>>(
//     //   '/fixtures/rounds',
//     //   {
//     //     league: leagueApiId,
//     //     season,
//     //   },
//     // )

//     // const league = await this.prisma.leagues.findFirst({
//     //   where: { api_league_id: leagueApiId },
//     // })

//     // if (!league) throw new Error('League not found')

//     // const rounds: string[] = res.data.response

//     // await this.prisma.$transaction(async (tx) => {
//     //   for (const roundName of rounds) {
//     //     const { phase, type, order } = parseRound(roundName)

//     //     await tx.rounds.upsert({
//     //       where: {
//     //         league_id_season_name: {
//     //           league_id: league.id,
//     //           season,
//     //           name: roundName,
//     //         },
//     //       },
//     //       update: {},
//     //       create: {
//     //         league_id: league.id,
//     //         season,
//     //         name: roundName,
//     //         phase,
//     //         type,
//     //         order,
//     //       },
//     //     })
//     //   }
//     // })

//     return 'nashei'
//   }

//   // EVENTS DE LA API Y DE LA DB
//   async getMatchEvents(matchUuid: string) {
//     // 1. Traer el estado actual del partido en nuestra DB
//     const matchDb = await this.prisma.matches.findUnique({
//       where: { id: matchUuid },
//       select: {
//         api_fixture_id: true,
//         lineup_fetched: true,
//         events_fetched: true,
//         events_finalized: true,
//         status_short: true,
//         away_goals: true,
//         home_goals: true,
//       },
//     })

//     if (!matchDb) throw new Error('Match no encontrado en DB')

//     // 2. Disparar consultas en paralelo: API vs DB (Eventos y Formaciones)
//     const [apiEventsRes, apiLineupsRes, dbEvents, dbLineups] =
//       await Promise.all([
//         // Eventos API
//         this.http.get<ApiFootballResponse<any[]>>('/fixtures/events', {
//           fixture: matchDb.api_fixture_id,
//         }),
//         // Formaciones API
//         this.http.get<ApiFootballResponse<any[]>>('/fixtures/lineups', {
//           fixture: matchDb.api_fixture_id,
//         }),
//         // Eventos DB
//         this.prisma.matchEvents.findMany({ where: { match_id: matchUuid } }),
//         // Formaciones DB
//         this.prisma.matchLineup.findMany({
//           where: { match_id: matchUuid },
//           include: { players: true },
//         }),
//       ])

//     const apiEvents = apiEventsRes.data.response || []
//     const apiLineups = apiLineupsRes.data.response || []

//     // 3. Construir el reporte
//     const report = {
//       metadata: {
//         matchUuid,
//         apiId: matchDb.api_fixture_id,
//         dbStatus: matchDb.status_short,
//         awayGoals: matchDb.away_goals,
//         homeGoals: matchDb.home_goals,
//       },
//       flagsControl: {
//         lineup_fetched: matchDb.lineup_fetched,
//         events_fetched: matchDb.events_fetched,
//         events_finalized: matchDb.events_finalized,
//         status_matchs: matchDb.status_short,
//       },
//       diagnosticoEventos: {
//         cantidadApi: apiEvents.length,
//         cantidadDb: dbEvents.length,
//         estaSincronizado: apiEvents.length === dbEvents.length,
//         // Mapeo rápido para ver qué ID falta
//         checkList: apiEvents.map((ae) => {
//           const expectedId =
//             `${ae.time.elapsed}-${ae.team.id}-${ae.player.id || 0}-${ae.type}-${ae.detail}`.replace(
//               /\s+/g,
//               '_',
//             )
//           return {
//             min: ae.time.elapsed,
//             teamId: ae.team.id,
//             playerId: ae.player?.name || null,
//             assist: ae.assist?.name || null,
//             type: ae.type,
//             inDb: dbEvents.some((de) => de.api_event_id === expectedId),
//           }
//         }),
//       },
//       diagnosticoLineups: {
//         hayLineupsEnApi: apiLineups.length > 0,
//         equiposEnApi: apiLineups.map((l) => l.team.name),
//         cantidadEquiposEnDb: dbLineups.length,
//         jugadoresEnDb: dbLineups.reduce(
//           (acc, curr) => acc + curr.players.length,
//           0,
//         ),
//       },
//     }

//     if (!report.diagnosticoEventos.estaSincronizado) {
//       console.warn(
//         `❌ EVENTOS DESFASADOS: API(${report.diagnosticoEventos.cantidadApi}) vs DB(${report.diagnosticoEventos.cantidadDb})`,
//       )
//     } else {
//       console.log(
//         `✅ EVENTOS OK: ${report.diagnosticoEventos.cantidadDb} sincronizados.`,
//       )
//     }

//     if (
//       report.diagnosticoLineups.hayLineupsEnApi &&
//       report.diagnosticoLineups.cantidadEquiposEnDb === 0
//     ) {
//       console.error(
//         `❌ FORMACIONES: La API tiene data pero tu DB está en 0. lineup_fetched está en: ${matchDb.lineup_fetched}`,
//       )
//     }

//     return report
//   }

//   // Static

//   async getStatics(matchId: string) {
//     const matchDb = await this.prisma.matches.findUnique({
//       where: { id: matchId },
//       select: {
//         api_fixture_id: true,
//       },
//     })

//     if (!matchDb) throw new Error('Match no encontrado en DB')

//     const res = await this.http.get<ApiFootballResponse<any[]>>(
//       '/fixtures/statistics',
//       { fixture: matchDb.api_fixture_id },
//     )

//     const result = res.data.response

//     return result
//   }

//   async getTrackedMatches() {
//     const trackedMatches = await this.prisma.matches.findMany({
//       where: {
//         tracked: true,
//       },
//       select: {
//         id: true,
//         api_fixture_id: true,
//         date: true,
//         status_short: true,
//         home_team: { select: { name: true } },
//         away_team: { select: { name: true } },
//       },
//       orderBy: {
//         date: 'desc',
//       },
//     })

//     trackedMatches.forEach((m) => {
//       console.log(`Consultado: ${m.home_team.name} vs ${m.away_team.name}`)
//     })

//     // OBLIGATORIO: Retornar el array para que NestJS lo envíe como JSON
//     return trackedMatches
//   }

//   async getTest(league, season) {
//     try {
//       const res = await this.http.get<ApiFootballResponse<ApiFixture[]>>(
//         '/fixtures',
//         {
//           league: league,
//           season: season,
//         },
//       )

//       const allFixtures = res.data.response || []

//       const rounds = await this.http.get<ApiFootballResponse<any[]>>(
//         '/fixtures/rounds',
//         {
//           league: league,
//           season: season,
//         },
//       )

//       const allRounds = rounds.data.response || []

//       return { allRounds, allFixtures }

//       // Filtramos para ver solo lo que no es fase regular
//       const playoffMatches = allFixtures.filter(
//         (f) =>
//           !f.league.round.toLowerCase().includes('group') &&
//           !f.league.round.toLowerCase().includes('1st phase') && // A veces la Copa de la Liga usa esto
//           !f.league.round.toLowerCase().includes('regular'),
//       )

//       return {
//         totalFixtures: allFixtures.length,
//         playoffCount: playoffMatches.length,
//         roundsFound: [...new Set(allFixtures.map((f) => f.league.round))], // Para ver qué nombres de rondas hay
//         matches: playoffMatches.map((m) => ({
//           round: m.league.round,
//           matchId: m.fixture.id,
//           teams: `${m.teams.home.name} vs ${m.teams.away.name}`,
//           status: m.fixture.status.short,
//         })),
//       }
//     } catch (error) {
//       return {
//         error: 'Error al conectar con API Football',
//         detail: error.message,
//       }
//     }
//   }
// }
