export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'production' | 'test' | 'staging'
  PORT: number
  HOST: string

  CLIENT_URL: string
  ENABLE_DEV_TOOLS: boolean
  DATABASE_URL: string

  ID_LEAGUE_ARG: number
  API_FOOTBALL_KEY: string
  GOOGLE_CLIENT_ID: string

  JWT_ACCESS_SECRET: string
  JWT_REFRESH_SECRET: string
  JWT_ACCESS_EXPIRES_IN: string
  JWT_REFRESH_EXPIRES_IN: string
  BCRYPT_SALT_ROUNDS: number

  FRONTEND_SUCCESS_URL: string
  FRONTEND_FAILURE_URL: string
  FRONTEND_PENDING_URL: string
  FRONTEND_URL: string

  MERCADO_PAGO_API_URL: string
  MERCADO_PAGO_ACCESS_TOKEN: string
  MERCADO_PAGO_RECEIVER_ID?: string
  MERCADO_PAGO_WEBHOOK_URL: string
  MERCADO_PAGO_WEBHOOK_SECRET: string

  CLOUDINARY_CLOUD_NAME: string
  CLOUDINARY_API_KEY: string
  CLOUDINARY_API_SECRET: string

  RESEND_API_KEY: string
  DISCORD_INTERNAL_SECRET: string
  DISCORD_BOT_URL: string

  REDIS_HOST: string
  REDIS_PORT: number
  REDIS_PASSWORD: string
}
