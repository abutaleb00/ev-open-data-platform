const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAuditLogs = async (req, res) => {
    try {
        const { role, companyId } = req.user;
        const isSuperAdmin = role === 'SUPER_ADMIN';

        const logs = await prisma.auditLog.findMany({
            where: isSuperAdmin ? {} : {
                user: { companyId: parseInt(companyId) }
            },
            include: {
                user: { select: { name: true, email: true, role: true } }
            },
            orderBy: { timestamp: 'desc' },
            take: 100 // Limit to the 100 most recent logs for performance
        });

        res.json({ success: true, data: logs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to fetch audit logs" });
    }
};