const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper Extraction Module: Pulls real client IP safely behind proxies
const getClientIp = (req) => {
    return req.headers['x-forwarded-for']
        ? req.headers['x-forwarded-for'].split(',')[0].trim()
        : req.ip || req.socket?.remoteAddress || '127.0.0.1';
};

// 1. GET TRAFFIC METRICS (Aggregated Request Counts, Top IPs, and Status Distribution)
exports.getTrafficMetrics = async (req, res) => {
    try {
        const { role, companyId } = req.user;
        const { days = 7, limit = 50, operator_reference_id } = req.query;

        const parsedDays = Math.max(1, parseInt(days, 10));
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parsedDays);

        const whereClause = { createdAt: { gte: startDate } };

        // Multitenancy Guard
        if (role !== 'SUPER_ADMIN') {
            const userCompany = await prisma.company.findUnique({
                where: { id: parseInt(companyId, 10) },
                select: { operatorReferenceId: true }
            });
            if (userCompany && userCompany.operatorReferenceId) {
                whereClause.operatorReferenceId = userCompany.operatorReferenceId;
            }
        } else if (operator_reference_id && operator_reference_id.trim() !== '') {
            whereClause.operatorReferenceId = String(operator_reference_id).trim();
        }

        const [
            totalRequests,
            rateLimitedRequests,
            topIPs,
            statusDistribution,
            recentLogs
        ] = await prisma.$transaction([
            prisma.requestLog.count({ where: whereClause }),
            prisma.requestLog.count({
                where: { ...whereClause, statusCode: 429 }
            }),
            prisma.requestLog.groupBy({
                by: ['ipAddress'],
                where: whereClause,
                _count: { ipAddress: true },
                orderBy: { _count: { ipAddress: 'desc' } },
                take: 10
            }),
            prisma.requestLog.groupBy({
                by: ['statusCode'],
                where: whereClause,
                _count: { statusCode: true }
            }),
            prisma.requestLog.findMany({
                where: whereClause,
                take: Math.min(100, parseInt(limit, 10)),
                orderBy: { createdAt: 'desc' }
            })
        ]);

        const statusSummary = {};
        statusDistribution.forEach(item => {
            statusSummary[item.statusCode] = item._count.statusCode;
        });

        res.json({
            success: true,
            summary: {
                timeframe_days: parsedDays,
                total_requests: totalRequests,
                rate_limited_requests: rateLimitedRequests,
                success_requests: (statusSummary[200] || 0) + (statusSummary[201] || 0),
                status_breakdown: statusSummary
            },
            top_client_ips: topIPs.map(i => ({
                ip: i.ipAddress || '127.0.0.1',
                count: i._count.ipAddress
            })),
            recent_logs: recentLogs.map(log => ({
                id: log.id,
                ip: log.ipAddress,
                endpoint: log.endpoint,
                method: log.method,
                statusCode: log.statusCode,
                operatorReferenceId: log.operatorReferenceId,
                userAgent: log.userAgent,
                timestamp: log.createdAt
            }))
        });
    } catch (error) {
        console.error("Traffic metrics calculation error:", error);
        res.status(500).json({ success: false, message: "Failed to compile traffic analytics matrix." });
    }
};

// 2. GET PAGINATED TRAFFIC REQUEST LOGS
exports.getTrafficLogs = async (req, res) => {
    try {
        const { role, companyId } = req.user;
        const { page = 1, limit = 20, ip, status } = req.query;

        const parsedPage = Math.max(1, parseInt(page, 10));
        const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10)));
        const offset = (parsedPage - 1) * parsedLimit;

        const whereClause = {};

        if (role !== 'SUPER_ADMIN') {
            const userCompany = await prisma.company.findUnique({
                where: { id: parseInt(companyId, 10) },
                select: { operatorReferenceId: true }
            });
            if (userCompany && userCompany.operatorReferenceId) {
                whereClause.operatorReferenceId = userCompany.operatorReferenceId;
            }
        }

        if (ip && ip.trim() !== '') {
            whereClause.ipAddress = { contains: ip.trim() };
        }

        if (status) {
            whereClause.statusCode = parseInt(status, 10);
        }

        const [logs, totalCount] = await prisma.$transaction([
            prisma.requestLog.findMany({
                where: whereClause,
                skip: offset,
                take: parsedLimit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.requestLog.count({ where: whereClause })
        ]);

        res.json({
            success: true,
            meta: {
                total_records: totalCount,
                total_pages: Math.ceil(totalCount / parsedLimit),
                current_page: parsedPage,
                limit: parsedLimit
            },
            data: logs
        });
    } catch (error) {
        console.error("Traffic log query error:", error);
        res.status(500).json({ success: false, message: "Failed to query system request logs." });
    }
};

// 3. GET SYSTEM RATE LIMITER STATUS
exports.getRateLimitTelemetry = async (req, res) => {
    try {
        const config = await prisma.systemConfig.findFirst();

        res.json({
            success: true,
            data: {
                rateLimitingEnabled: config?.rateLimitingEnabled ?? true,
                feedRateLimitMax: config?.feedRateLimitMax || 100,
                feedRateLimitWindow: config?.feedRateLimitWindow || 300,
                lastUpdated: config?.updatedAt || new Date().toISOString()
            }
        });
    } catch (error) {
        console.error("Failed to query rate limit telemetry:", error);
        res.status(500).json({ success: false, message: "Failed to fetch rate limiter parameters." });
    }
};