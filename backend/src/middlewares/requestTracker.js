const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// In-memory cache for rate limiter configuration
let rateLimitCache = {
    max: 100,
    windowMs: 300 * 1000, // 300 seconds default
    enabled: true,
    lastFetched: 0
};

// Refresh configuration from Database
const refreshRateLimitCache = async () => {
    try {
        const config = await prisma.systemConfig.findFirst();
        if (config) {
            rateLimitCache = {
                max: config.feedRateLimitMax || 100,
                windowMs: (config.feedRateLimitWindow || 300) * 1000,
                enabled: config.rateLimitingEnabled ?? true,
                lastFetched: Date.now()
            };
        }
    } catch (error) {
        console.error("Failed to refresh rate limit cache:", error);
    }
};

// Initial load on server startup
refreshRateLimitCache();

// Helper to extract clean IP address
const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    return ip === '::1' ? '127.0.0.1' : ip;
};

// Dynamic Rate Limiter Middleware
const feedRateLimiter = rateLimit({
    windowMs: 300 * 1000,
    max: () => rateLimitCache.max,

    // Custom IP Key Generator for proxies and localhost ::1
    keyGenerator: (req) => getClientIp(req),

    // Disables internal express-rate-limit v7 custom keyGenerator IPv6 validation warning
    validate: {
        keyGeneratorIpFallback: false
    },

    skip: () => !rateLimitCache.enabled,

    standardHeaders: true,
    legacyHeaders: false,

    handler: async (req, res, next, options) => {
        const retryAfterSec = Math.ceil(options.windowMs / 1000);
        const clientIp = getClientIp(req);

        // Explicitly write the 429 Throttle Event to database
        try {
            await prisma.requestLog.create({
                data: {
                    ipAddress: clientIp || '127.0.0.1',
                    endpoint: req.originalUrl || req.url,
                    method: req.method,
                    operatorReferenceId: req.query.operator_reference_id ? String(req.query.operator_reference_id) : null,
                    statusCode: 429,
                    userAgent: req.headers['user-agent'] || null
                }
            });
        } catch (err) {
            console.error("Failed to write 429 request log to DB:", err.message);
        }

        res.setHeader('Retry-After', retryAfterSec);

        return res.status(429).json({
            name: "TOO_MANY_REQUESTS",
            message: `Rate limit exceeded. Maximum ${rateLimitCache.max} requests allowed per ${rateLimitCache.windowMs / 1000} second(s). Please wait ${retryAfterSec} seconds.`,
            meta: {
                max_allowed: rateLimitCache.max,
                window_seconds: rateLimitCache.windowMs / 1000,
                timestamp: new Date().toISOString()
            }
        });
    }
});

// Express Request Logger Middleware (For Allowed 2xx / 4xx / 5xx Calls)
const logApiRequest = async (req, res, next) => {
    try {
        const ipAddress = getClientIp(req);

        res.on('finish', async () => {
            // Skip logging here if the status code was 429 (already logged inside the rate-limit handler)
            if (res.statusCode === 429) return;

            try {
                await prisma.requestLog.create({
                    data: {
                        ipAddress: ipAddress || '127.0.0.1',
                        endpoint: req.originalUrl || req.url,
                        method: req.method,
                        operatorReferenceId: req.query.operator_reference_id ? String(req.query.operator_reference_id) : null,
                        statusCode: res.statusCode,
                        userAgent: req.headers['user-agent'] || null
                    }
                });
            } catch (_) { }
        });
    } catch (_) { }
    next();
};

module.exports = {
    feedRateLimiter,
    logApiRequest,
    refreshRateLimitCache
};