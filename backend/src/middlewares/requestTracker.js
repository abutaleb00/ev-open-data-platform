const expressRateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Strict 30-Second Rate Limiter per IP
const feedRateLimiter = expressRateLimit({
    windowMs: 30 * 1000, // 30 seconds
    limit: 1, // Limit each IP to 1 request per 30 seconds
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        return res.status(429).json({
            name: "TOO_MANY_REQUESTS",
            message: "Rate limit exceeded. Requests are restricted to 1 call per 30 seconds.",
            meta: { timestamp: new Date().toISOString() }
        });
    }
});

// 2. Request Tracker Middleware (Persists IP & Metrics to DB)
const logApiRequest = async (req, res, next) => {
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || "0.0.0.0";
    const clientIp = Array.isArray(rawIp) ? rawIp[0] : rawIp.split(',')[0].trim();

    // Capture response event to record status code
    res.on('finish', async () => {
        try {
            const operatorRef = req.query.operator_reference_id || req.body?.operator_reference_id || null;

            await prisma.requestLog.create({
                data: {
                    ipAddress: clientIp,
                    endpoint: req.originalUrl.split('?')[0],
                    method: req.method,
                    operatorReferenceId: operatorRef ? String(operatorRef) : null,
                    statusCode: res.statusCode,
                    userAgent: req.headers['user-agent'] || null
                }
            });
        } catch (err) {
            console.error("Failed to persist request log:", err);
        }
    });

    next();
};

// Export BOTH middlewares
module.exports = { feedRateLimiter, logApiRequest };