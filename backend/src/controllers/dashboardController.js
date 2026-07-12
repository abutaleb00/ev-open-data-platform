const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getDashboardMetrics = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication context missing.' });
        }

        const { role, companyId } = req.user;
        const isSuperAdmin = role === 'SUPER_ADMIN';
        const targetCompanyId = req.query.filterCompanyId ? parseInt(req.query.filterCompanyId) : null;

        // Defensive Verification: If they aren't a Super Admin and have no companyId, block execution safely
        if (!isSuperAdmin && !companyId) {
            return res.status(403).json({
                success: false,
                message: 'Access Denied: Your user profile is not linked to any active company operator instance.'
            });
        }

        const activeCompanyId = !isSuperAdmin ? parseInt(companyId) : targetCompanyId;

        // --- 1. PRESERVED ORIGINAL WORKING SCOPE CLAUSES ---
        // This keeps your exact working global vs tenant scoping architecture intact
        let scopeWhereClause = {};
        if (!isSuperAdmin) {
            scopeWhereClause = { companyId: activeCompanyId };
        } else if (targetCompanyId) {
            scopeWhereClause = { companyId: activeCompanyId };
        }

        const cpWhereClause = isSuperAdmin && !targetCompanyId ? {} : {
            location: { companyId: activeCompanyId }
        };

        const connectorWhereClause = isSuperAdmin && !targetCompanyId ? {} : {
            chargePoint: { location: { companyId: activeCompanyId } }
        };

        const sessionWhereClause = isSuperAdmin && !targetCompanyId ? {} : {
            connector: { chargePoint: { location: { companyId: activeCompanyId } } }
        };

        // --- 2. INFRASTRUCTURE & OPEN DATA MODERATION TALLIES ---
        const totalLocations = await prisma.location.count({ where: scopeWhereClause });
        const locationsPendingApproval = await prisma.location.count({
            where: { ...scopeWhereClause, isApproved: false }
        });

        const totalHardwareUnits = await prisma.chargePoint.count({ where: cpWhereClause });
        const chargePointsPendingApproval = await prisma.chargePoint.count({
            where: { ...cpWhereClause, isApproved: false }
        });

        // --- 3. TELEMETRY STATUS METRICS & UTILIZATION RATES ---
        const connectors = await prisma.connector.findMany({ where: connectorWhereClause });

        const availableCount = connectors.filter(c => c.status === 'AVAILABLE').length;
        const occupiedCount = connectors.filter(c => ['OCCUPIED', 'RESERVED', 'CHARGING'].includes(c.status)).length;
        const faultedCount = connectors.filter(c => ['FAULTED', 'OUTOFORDER'].includes(c.status)).length;
        const totalConnectors = connectors.length;

        const liveUtilizationRate = totalConnectors > 0 
            ? parseFloat(((occupiedCount / totalConnectors) * 100).toFixed(1)) 
            : 0;

        // --- 4. FINANCIAL AND SESSION ACCUMULATIONS ---
        const completedSessionsAgg = await prisma.session.aggregate({
            where: { ...sessionWhereClause, status: 'COMPLETED' },
            _sum: { totalCost: true, kwhConsumed: true },
            _count: { id: true }
        });

        const activeSessionsCount = await prisma.session.count({
            where: { ...sessionWhereClause, status: 'ACTIVE' }
        });

        const totalRevenue = completedSessionsAgg._sum.totalCost || 0;
        const totalPowerDelivered = completedSessionsAgg._sum.kwhConsumed || 0;
        const completedSessionsCount = completedSessionsAgg._count.id || 0;

        const averageRevenuePerSession = completedSessionsCount > 0 
            ? parseFloat((totalRevenue / completedSessionsCount).toFixed(2)) 
            : 0;

        // --- 5. ROLLING 7-DAY HISTORICAL TIMESERIES MATRIX ---
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const historicalSessions = await prisma.session.findMany({
            where: {
                ...sessionWhereClause,
                status: 'COMPLETED',
                createdAt: { gte: sevenDaysAgo }
            },
            select: {
                totalCost: true,
                kwhConsumed: true,
                createdAt: true
            }
        });

        const daysMap = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const label = d.toLocaleDateString('en-GB', { weekday: 'short' }); 
            daysMap[label] = { date: label, revenue: 0, kwh: 0, sessions: 0 };
        }

        historicalSessions.forEach(session => {
            const dayLabel = new Date(session.createdAt).toLocaleDateString('en-GB', { weekday: 'short' });
            if (daysMap[dayLabel]) {
                daysMap[dayLabel].revenue += session.totalCost;
                daysMap[dayLabel].kwh += session.kwhConsumed;
                daysMap[dayLabel].sessions += 1;
            }
        });

        const chartData = Object.values(daysMap).map(day => ({
            ...day,
            revenue: parseFloat(day.revenue.toFixed(2)),
            kwh: parseFloat(day.kwh.toFixed(1))
        }));

        // --- 6. CORE PLATFORM DIAGNOSTICS (SUPER_ADMIN EXCLUSIVE) ---
        let systemStats = null;
        let companiesLookup = [];

        if (isSuperAdmin) {
            companiesLookup = await prisma.company.findMany({ select: { id: true, name: true } });
            
            const totalCompanies = companiesLookup.length;
            const totalUsers = await prisma.user.count();
            const pendingUsers = await prisma.user.count({ where: { isActivated: false } });
            const activeApiKeys = await prisma.apiKey.count({ where: { isActive: true } });

            systemStats = {
                totalCompanies,
                totalUsers,
                pendingUsersCount: pendingUsers,
                activeApiKeysCount: activeApiKeys
            };
        }

        // --- 7. NEW PREMIUM STRUCTURE OUTPUT DELIVERY ---
        res.json({
            success: true,
            role,
            summary: {
                locations: {
                    total: totalLocations,
                    pendingApproval: locationsPendingApproval,
                    active: totalLocations - locationsPendingApproval
                },
                hardware: {
                    totalUnits: totalHardwareUnits,
                    pendingApproval: chargePointsPendingApproval,
                    connectors: {
                        total: totalConnectors,
                        available: availableCount,
                        occupied: occupiedCount,
                        faulted: faultedCount
                    }
                },
                telemetry: {
                    liveUtilizationRatePercentage: liveUtilizationRate,
                    activeChargingSessions: activeSessionsCount,
                    completedSessionsTotal: completedSessionsCount
                },
                financials: {
                    totalRevenueCollected: parseFloat(totalRevenue.toFixed(2)),
                    totalKwhDispensated: parseFloat(totalPowerDelivered.toFixed(1)),
                    averageSessionValue: averageRevenuePerSession
                }
            },
            chartData,
            systemStats, 
            companies: companiesLookup
        });

    } catch (error) {
        console.error("Dashboard calculation breakdown error:", error);
        res.status(500).json({ success: false, message: 'Dashboard matrix computation failed.' });
    }
};