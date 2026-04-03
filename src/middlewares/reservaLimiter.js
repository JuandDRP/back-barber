const rateLimit = require("express-rate-limit");

const reservaLimiter = rateLimit({
  windowMs: 2 * 60 * 60 * 1000,
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Demasiadas reservas desde esta IP."
  }
});

module.exports = reservaLimiter;