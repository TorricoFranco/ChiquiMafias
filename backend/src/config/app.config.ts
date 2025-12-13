export const AppConfiguration = () => ({
  port: process.env.PORT || 3000,
  enviroment: process.env.NODE_ENV || 'development',
})
