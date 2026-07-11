const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minut
    max: 5, // 10 minut ichida 5 ta xabar yuborish mumkin
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests. Please try again later."
    }
});

module.exports = limiter;