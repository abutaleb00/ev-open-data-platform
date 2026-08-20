const rateLimit = require('express-rate-limit');

const publicFeedLimiter = rateLimit({
    windowMs: 30 * 1000, // 30 seconds
    max: 1, // Limit each IP to 1 request per 30 seconds
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        name: "TOO_MANY_REQUESTS",
        message: "Rate limit exceeded. Requests are restricted to 1 call per 30 seconds.",
        meta: { timestamp: new Date().toISOString() }
    }
});

module.exports = { publicFeedLimiter };