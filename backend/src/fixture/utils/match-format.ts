import { BracketMatch, LiveMatchData } from '../types/fixtures'

export const isPlayoffRound = (round: string): boolean => {
  if (!round) return false
  const normalized = round.toLowerCase()
  return (
    normalized.includes('octavos') ||
    normalized.includes('cuartos') ||
    normalized.includes('semifinal') ||
    normalized.includes('final')
  )
}

export const formatMatch = (m: any, liveData?: LiveMatchData) => {
  const finishedStatuses = ['FT', 'AET', 'PEN', 'TBD']

  const isLive = liveData
    ? !finishedStatuses.includes(liveData.status_short)
    : false

  return {
    id: m.id,
    date: m.date,

    home_goals: isLive ? liveData!.home_goals : m.home_goals,
    away_goals: isLive ? liveData!.away_goals : m.away_goals,

    home_penalty_goals: isLive
      ? liveData!.home_penalty_goals
      : m.home_penalty_goals,
    away_penalty_goals: isLive
      ? liveData!.away_penalty_goals
      : m.away_penalty_goals,

    status_short: isLive ? liveData!.status_short : m.status_short,
    elapsed: isLive ? liveData!.elapsed : m.elapsed || 0,

    is_live: isLive,
    is_playoff: isPlayoffRound(m.round),

    round: m.round,
    home_team: m.home_team,
    away_team: m.away_team,
    home_team_id: m.home_team_id,
    away_team_id: m.away_team_id,
  }
}
