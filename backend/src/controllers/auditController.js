const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get Paginated, Filtered, and Tenant-Scoped System Audit Logs
exports.getAuditLogs = async (req, res) => {
    try {
        const { role, companyId } = req.user;
        const isSuperAdmin = role === 'SUPER_ADMIN';

        // 1. Extract and sanitize pipeline parameters from the query string
        const {
            search,
            action,
            entity,
            page = 1,
            limit = 20
        } = req.query;

        const parsedPage = Math.max(1, parseInt(page));
        const parsedLimit = Math.max(1, Math.min(100, parseInt(limit))); // Hard cap to safeguard node performance
        const offset = (parsedPage - 1) * parsedLimit;

        // 2. Build multi-tenant boundary constraint layer
        const whereClause = isSuperAdmin ? {} : {
            user: { companyId: parseInt(companyId) }
        };

        // 3. Apply explicit structural action filter (e.g., LOGIN, CREATE, UPDATE, DELETE)
        if (action && action.trim() !== '') {
            whereClause.action = action.trim().toUpperCase();
        }

        // 4. Apply system entity categorization boundary (e.g., USER, LOCATION, CHARGE_POINT)
        if (entity && entity.trim() !== '') {
            whereClause.entity = entity.trim().toUpperCase();
        }

        // 5. Build dynamic string text matching array across multiple parameters
        if (search && search.trim() !== '') {
            const searchString = search.trim();
            whereClause.AND = [
                ...(whereClause.AND || []),
                {
                    OR: [
                        { details: { contains: searchString } },
                        { ipAddress: { contains: searchString } },
                        {
                            user: {
                                OR: [
                                    { name: { contains: searchString } },
                                    { email: { contains: searchString } }
                                ]
                            }
                        }
                    ]
                }
            ];
        }

        // 6. Execute atomic query transaction matrix split to resolve counts and rows together
        const [logs, totalCount] = await prisma.$transaction([
            prisma.auditLog.findMany({
                where: whereClause,
                skip: offset,
                take: parsedLimit,
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true,
                            role: true,
                            company: { select: { name: true } } // Includes operator context labels on super views
                        }
                    }
                },
                orderBy: { timestamp: 'desc' }
            }),
            prisma.auditLog.count({ where: whereClause })
        ]);

        // 7. Map standardized real application pagination metadata blocks
        res.json({
            success: true,
            meta: {
                total_records: totalCount,
                current_page: parsedPage,
                limit_per_page: parsedLimit,
                total_pages: Math.ceil(totalCount / parsedLimit),
                timestamp: new Date().toISOString()
            },
            data: logs
        });

    } catch (error) {
        console.error("Audit infrastructure indexing exception:", error);
        res.status(500).json({ success: false, message: "Failed to compile scalable system logs." });
    }
};