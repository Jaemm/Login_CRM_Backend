export default () => ({
  jwt: {
    access: {
      secret: process.env.CRM_ACCESS_TOKEN_SECRET,
      time: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRATION_TIME, 10),
    },
    confirmation: {
      secret: process.env.JWT_CONFIRMATION_SECRET,
      time: parseInt(process.env.JWT_CONFIRMATION_TIME, 10),
    },
    resetPassword: {
      secret: process.env.JWT_RESET_PASSWORD_SECRET,
      time: parseInt(process.env.JWT_RESET_PASSWORD_TIME, 10),
    },
    refresh: {
      secret: process.env.JWT_REFRESH_TOKEN_SECRET,
      time: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRATION_TIME, 10),
    },
  },
});
