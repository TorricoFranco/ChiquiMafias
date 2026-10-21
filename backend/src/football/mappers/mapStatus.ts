import { MatchStatus } from '@prisma/client'

export function mapStatus(short: string): MatchStatus {
  switch (short) {
    case 'TBD':
    case 'NS':
      return 'SCHEDULED'

    case '1H':
    case 'HT':
    case '2H':
    case 'ET':
    case 'BT':
    case 'P':
    case 'LIVE':
      return 'LIVE'

    case 'FT':
    case 'AET':
    case 'PEN':
      return 'FINISHED'

    case 'PST':
      return 'POSTPONED'

    case 'SUSP':
    case 'INT':
      return 'SUSPENDED'

    case 'CANC':
      return 'CANCELLED'

    case 'ABD':
      return 'ABANDONED'

    case 'AWD':
    case 'WO':
      return 'NOT_PLAYED'

    default:
      return 'SCHEDULED'
  }
}

/**
 * Maps API-Football short status to internal MatchStatus enum
 * https://www.api-football.com/documentation-v3#tag/Fixtures
 */
