const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getOverviewStats = async (req, res) => {
    try {
        const { role, companyId } = req.user; // Assuming your auth middleware injects req.user

        // Determine base filters based on role
        const isSuperAdmin = role === 'SUPER_ADMIN';
        const companyFilter = isSuperAdmin ? {} : { companyId: parseInt(companyId) };

        // 1. Total Counts
        const totalCompanies = isSuperAdmin ? await prisma.company.count() : 1;
        const totalLocations = await prisma.location.count({ where: companyFilter });
        const totalChargePoints = await prisma.chargePoint.count({
            where: isSuperAdmin ? {} : { location: { companyId: parseInt(companyId) } }
        });

        // 2. Charge Point Status Breakdown
        const cpStatuses = await prisma.chargePoint.groupBy({
            by: ['status'],
            _count: { status: true },
            where: isSuperAdmin ? {} : { location: { companyId: parseInt(companyId) } }
        });

        // Format statuses into a friendly object (e.g., { OPERATIONAL: 15, FAULTED: 2 })
        const formattedStatuses = cpStatuses.reduce((acc, curr) => {
            acc[curr.status] = curr._count.status;
            return acc;
        }, { OPERATIONAL: 0, PLANNED: 0, OUT_OF_SERVICE: 0, FAULTED: 0 });

        // 3. Approval Pipeline Metrics
        const approvedLocations = await prisma.location.count({
            where: { ...companyFilter, isApproved: true }
        });
        const approvedChargePoints = await prisma.chargePoint.count({
            where: {
                ...(isSuperAdmin ? {} : { location: { companyId: parseInt(companyId) } }),
                isApproved: true
            }
        });

        res.json({
            success: true,
            data: {
                metrics: {
                    companies: totalCompanies,
                    locations: totalLocations,
                    chargePoints: totalChargePoints,
                },
                health: formattedStatuses,
                approvals: {
                    locations: { total: totalLocations, approved: approvedLocations },
                    chargePoints: { total: totalChargePoints, approved: approvedChargePoints }
                }
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to fetch analytics" });
    }
};