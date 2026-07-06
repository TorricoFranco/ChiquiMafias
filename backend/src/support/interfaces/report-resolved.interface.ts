export interface ReportResolvedPayload {
  reportId: string
  targetUserId: string
  action: 'BAN' | 'MUTE' | 'WARN' | 'UNBAN'
  durationHours?: number
  reason?: string
}
