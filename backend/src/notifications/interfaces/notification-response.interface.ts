export interface INotificationResponse {
  id: string
  title: string
  message: string
  type: string
  isGlobal: boolean
  readAt: Date | null
  createdAt: Date
  referenceId?: string | null
  metadata?: any
}
