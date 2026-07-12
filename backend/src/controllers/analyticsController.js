const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getOverviewStats = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication context missing.' });
        }

        const { role, companyId } = req.user;
        const isSuperAdmin = role === 'SUPER_ADMIN';

        // Parse the optional dropdown company filter sent by the frontend UI
        const targetCompanyId = req.query.filterCompanyId ? parseInt(req.query.filterCompanyId) : null;
        const activeCompanyId = isSuperAdmin ? targetCompanyId : parseInt(companyId);

        // --- 1. SET UP RELATION-SAFE WHERE CLAUSES ---
        let locationWhere = {};
        let cpWhereClause = {};

        if (activeCompanyId) {
            locationWhere = { companyId: activeCompanyId };
            cpWhereClause = { location: { companyId: activeCompanyId } };
        }

        // --- 2. INFRASTRUCTURE METRICS ---
        const totalCompanies = isSuperAdmin ? await prisma.company.count() : 1;
        const totalLocations = await prisma.location.count({ where: locationWhere });
        const totalChargePoints = await prisma.chargePoint.count({ where: cpWhereClause });

        // --- 3. HARDWARE HEALTH STATUS BREAKDOWN (WITH APPROVAL CHECK) ---
        // Fetch all charge points matching the multi-tenant context to calculate realistic states
        const allChargePoints = await prisma.chargePoint.findMany({
            where: cpWhereClause,
            select: {
                status: true,
                isApproved: true,
                location: {
                    select: { isApproved: true }
                }
            }
        });

        // Initialize status tracker object with explicit defaults
        const formattedStatuses = {
            AVAILABLE: 0,
            OCCUPIED: 0,
            CHARGING: 0,
            RESERVED: 0,
            FAULTED: 0,
            OUT_OF_SERVICE: 0,
            PLANNED: 0,
            OPERATIONAL: 0
        };

        // Process every node realistically
        allChargePoints.forEach(cp => {
            const isPlatformApproved = cp.isApproved && cp.location?.isApproved;

            if (!isPlatformApproved) {
                // 🔥 REALISTIC FIX: If the hardware or site isn't approved, it cannot be live!
                // Force it to register under PLANNED (or staging status) instead of AVAILABLE.
                formattedStatuses.PLANNED += 1;
            } else {
                // If fully verified, parse the active network state reported by the station hardware
                const statusKey = cp.status || 'AVAILABLE';
                if (formattedStatuses[statusKey] !== undefined) {
                    formattedStatuses[statusKey] += 1;
                } else {
                    formattedStatuses.AVAILABLE += 1; // Fallback container safe check
                }
            }
        });

        // --- 4. DATA MODERATION PIPELINE METRICS ---
        const approvedLocations = await prisma.location.count({
            where: { ...locationWhere, isApproved: true }
        });
        const approvedChargePoints = await prisma.chargePoint.count({
            where: { ...cpWhereClause, isApproved: true }
        });

        // --- 5. COMPACT CLEANED PAYLOAD OUTPUT ---
        res.json({
            success: true,
            data: {
                metrics: {
                    companies: totalCompanies,
                    locations: totalLocations,
                    chargePoints: totalChargePoints
                },
                health: formattedStatuses,
                approvals: {
                    locations: {
                        total: totalLocations,
                        approved: approvedLocations,
                        pending: totalLocations - approvedLocations
                    },
                    chargePoints: {
                        total: totalChargePoints,
                        approved: approvedChargePoints,
                        pending: totalChargePoints - approvedChargePoints
                    }
                }
            }
        });

    } catch (error) {
        console.error("Analytics extraction engine breakdown error:", error);
        res.status(500).json({ success: false, message: "Analytics computation pipeline failure." });
    }
};