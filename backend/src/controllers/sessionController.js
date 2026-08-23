const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get active ongoing sessions
exports.getLiveSessions = async (req, res) => {
    try {
        const { role, companyId } = req.user;
        const isSuperAdmin = role === 'SUPER_ADMIN';

        const sessions = await prisma.session.findMany({
            where: {
                status: 'ACTIVE',
                // If not Super Admin, only show sessions for their company's charge points
                ...(isSuperAdmin ? {} : {
                    connector: { chargePoint: { location: { companyId: parseInt(companyId) } } }
                })
            },
            include: {
                connector: {
                    include: {
                        tariff: true,
                        chargePoint: { include: { location: true } }
                    }
                }
            },
            orderBy: { startTime: 'desc' }
        });

        res.json({ success: true, data: sessions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to fetch live sessions" });
    }
};

// Get completed transactions (Billing)
exports.getTransactions = async (req, res) => {
    try {
        const { role, companyId } = req.user;
        const isSuperAdmin = role === 'SUPER_ADMIN';

        const transactions = await prisma.session.findMany({
            where: {
                status: 'COMPLETED',
                ...(isSuperAdmin ? {} : {
                    connector: { chargePoint: { location: { companyId: parseInt(companyId) } } }
                })
            },
            include: {
                connector: {
                    include: {
                        tariff: true,
                        chargePoint: { select: { hardwareId: true, location: { select: { name: true } } } }
                    }
                }
            },
            orderBy: { endTime: 'desc' }
        });

        res.json({ success: true, data: transactions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to fetch transactions" });
    }
};

// Simulated endpoint to start a charging session (Usually triggered by a physical hardware webhook)
exports.startSession = async (req, res) => {
    try {
        const { connectorId } = req.body;
        const { role, companyId: userCompanyId } = req.user;

        // Verify connector exists and is available
        const connector = await prisma.connector.findUnique({
            where: { id: parseInt(connectorId) },
            include: { chargePoint: { include: { location: true } } }
        });
        if (!connector || connector.status !== 'AVAILABLE') {
            return res.status(400).json({ success: false, message: "Connector is not available" });
        }

        if (role !== 'SUPER_ADMIN' && connector.chargePoint.location.companyId !== userCompanyId) {
            return res.status(403).json({ success: false, message: "Unauthorized: Connector belongs to a different network operator profile." });
        }

        // Start session and update connector status
        const session = await prisma.$transaction([
            prisma.session.create({ data: { connectorId: parseInt(connectorId), status: 'ACTIVE' } }),
            prisma.connector.update({ where: { id: parseInt(connectorId) }, data: { status: 'OCCUPIED' } })
        ]);

        res.status(201).json({ success: true, data: session[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to start session" });
    }
};

// Stop a session and calculate the final bill
exports.stopSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { kwhConsumed } = req.body; // Usually sent by the hardware metric hook
        const { role, companyId: userCompanyId } = req.user;

        const session = await prisma.session.findUnique({
            where: { id: parseInt(id) },
            include: { connector: { include: { tariff: true, chargePoint: { include: { location: true } } } } }
        });

        if (!session || session.status !== 'ACTIVE') {
            return res.status(400).json({ success: false, message: "Valid active session not found" });
        }

        if (role !== 'SUPER_ADMIN' && session.connector.chargePoint.location.companyId !== userCompanyId) {
            return res.status(403).json({ success: false, message: "Unauthorized: Session belongs to a different network operator profile." });
        }

        // Sanity-bound the hardware-reported reading - a single session realistically
        // cannot exceed a few hundred kWh even on the fastest DC chargers.
        const parsedKwh = parseFloat(kwhConsumed);
        if (isNaN(parsedKwh) || parsedKwh < 0 || parsedKwh > 1000) {
            return res.status(400).json({ success: false, message: "kwhConsumed must be a number between 0 and 1000." });
        }

        // Calculate total cost
        let totalCost = 0;
        if (session.connector.tariff) {
            totalCost = parsedKwh * session.connector.tariff.pricePerKwh;
        }

        // Complete the session and free up the connector
        const completedSession = await prisma.$transaction([
            prisma.session.update({
                where: { id: parseInt(id) },
                data: {
                    status: 'COMPLETED',
                    endTime: new Date(),
                    kwhConsumed: parsedKwh,
                    totalCost: totalCost
                }
            }),
            prisma.connector.update({
                where: { id: session.connectorId },
                data: { status: 'AVAILABLE' }
            })
        ]);

        res.json({ success: true, data: completedSession[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to stop session" });
    }
};