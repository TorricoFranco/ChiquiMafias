import { GoalType } from '@prisma/client'

export function mapGoalType(detail: string): GoalType {
  if (detail.includes('Own')) return 'OWN_GOAL'
  if (detail.includes('Penalty')) return 'PENALTY'
  return 'NORMAL'
}
