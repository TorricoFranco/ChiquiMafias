// import { Injectable } from '@nestjs/common'
// import { Cron, CronExpression } from '@nestjs/schedule'
// import { PrismaService } from 'src/prisma/prisma.service'
// // import { updateTeamSeasonStats } from '../../standings/standings/updateTeamSeasonStats'
// // import { getAnnualStandings } from '../../standings/standings/getAnnualStandings'
// // import { calculateStageTable } from '../../standings/standings/getStageGroupStanding'

// @Injectable()
// export class FinalizeFinishedMatchesCron {
//   constructor(private readonly prisma: PrismaService) {}

//   @Cron(CronExpression.EVERY_5_MINUTES)
//   async finalizeFinishedMatches() {
//     const matches = await this.prisma.matches.findMany({
//       where: {
//         status_short: 'FT',
//         events_finalized: false,
//       },
//       select: { id: true },
//     })

//     for (const match of matches) {
//       await this.finalizeMatch(match.id)

//       await this.prisma.matches.update({
//         where: { id: match.id },
//         data: { events_finalized: true },
//       })

//       // await updateTeamSeasonStats(this.prisma, match.id)

//       // await calculateStageTable({
//       //   prisma: this.prisma,
//       //   leagueId: 'LIGA_ID',
//       //   season: 2025,
//       //   stage: 'apertura',
//       // })

//       // await calculateStageTable({
//       //   prisma: this.prisma,
//       //   leagueId: 'LIGA_ID',
//       //   season: 2025,
//       //   stage: 'clausura',
//       // })

//       // await getAnnualStandings(this.prisma, 'LIGA_ID', 2025)
//     }
//   }

//   async finalizeMatch(matchId: string) {
//     await this.prisma.matchEvents.updateMany({
//       where: {
//         match_id: matchId,
//         status: 'PENDING',
//       },
//       data: {
//         status: 'CANCELLED',
//         is_valid: false,
//       },
//     })

//     await this.prisma.goals.updateMany({
//       where: {
//         match_id: matchId,
//         status: 'PENDING',
//       },
//       data: {
//         status: 'CANCELLED',
//         is_valid: false,
//       },
//     })

//     await this.prisma.matchEvents.updateMany({
//       where: {
//         match_id: matchId,
//         status: { not: 'CANCELLED' },
//       },
//       data: {
//         status: 'CONFIRMED',
//         is_valid: true,
//       },
//     })

//     await this.prisma.goals.updateMany({
//       where: {
//         match_id: matchId,
//         status: { not: 'CANCELLED' },
//       },
//       data: {
//         status: 'CONFIRMED',
//         is_valid: true,
//       },
//     })
//   }
// }
