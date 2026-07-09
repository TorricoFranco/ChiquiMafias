import * as Joi from 'joi'

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().port().default(3007),
  HOST: Joi.string().default('0.0.0.0'),
  CLIENT_URL: Joi.string().uri().required(),

  ID_LEAGUE_ARG: Joi.number().required(),
  DATABASE_URL: Joi.string().required(),
  API_FOOTBALL_KEY: Joi.string().required(),
  GOOGLE_CLIENT_ID: Joi.string().required(),

  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  JWT_REFRESH_SECRET: Joi.string().required(),

  FRONTEND_SUCCESS_URL: Joi.string().required(),
  FRONTEND_FAILURE_URL: Joi.string().required(),
  FRONTEND_PENDING_URL: Joi.string().required(),
  FRONTEND_URL: Joi.string().uri().required(),

  MERCADO_PAGO_API_URL: Joi.string().uri().required(),
  MERCADO_PAGO_ACCESS_TOKEN: Joi.string().required(),
  MERCADO_PAGO_RECEIVER_ID: Joi.string().allow('').optional(),
  MERCADO_PAGO_WEBHOOK_URL: Joi.string().uri().required(),

  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),

  RESEND_API_KEY: Joi.string().required(),
  DISCORD_INTERNAL_SECRET: Joi.string().required(),
  DISCORD_BOT_URL: Joi.string().uri().required(),

  REDIS_HOST: Joi.string().default('redis'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().required(),
})
