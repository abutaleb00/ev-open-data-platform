const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all submissions requiring review (both locations and charge points)
exports.getPendingSubmissions = async (req, res) => {
    try {
        // Fetch locations that are not yet approved
        const locations = await prisma.location.findMany({
            where: { isApproved: false },
            include: {
                company: { select: { name: true } },
                _count: { select: { chargePoints: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Fetch charge points grouped or listed for moderation
        const chargePoints = await prisma.chargePoint.findMany({
            where: { isApproved: false },
            include: {
                location: { select: { name: true } },
                connectors: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: { locations, chargePoints }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to fetch moderation queue" });
    }
};

// Update Location Approval Status
exports.moderateLocation = async (req, res) => {
    const { id } = req.params;
    const { approved, note } = req.body;
    const userId = req.user.id;

    try {
        const updatedLocation = await prisma.location.update({
            where: { id: parseInt(id) },
            data: {
                isApproved: approved === true || approved === 'true',
                rejectionNote: approved ? null : note // Clear note if approved, save if rejected
            },
            include: { company: true }
        });

        // Write an immutable log trace inside the Audit ledger system
        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'LOCATION',
                entityId: updatedLocation.id,
                details: `Super Admin completed moderation review for location #${id}. Result: ${approved ? 'APPROVED' : 'REJECTED'}`,
                userId: userId
            }
        });

        res.json({
            success: true,
            message: `Location was successfully ${approved ? 'approved' : 'rejected'}`,
            data: updatedLocation
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to update location status" });
    }
};

// --- FIX: ADDED MISSING CHARGE POINT MODERATION CONTROLLER ---
// Update Charge Point Approval Status
exports.moderateChargePoint = async (req, res) => {
    const { id } = req.params;
    const { approved, note } = req.body;
    const userId = req.user.id;

    try {
        const updatedChargePoint = await prisma.chargePoint.update({
            where: { id: parseInt(id) },
            data: {
                isApproved: approved === true || approved === 'true',
                rejectionNote: approved ? null : note // Clear note if approved, save if rejected
            }
        });

        // Write an immutable log trace inside the Audit ledger system
        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'CHARGE_POINT',
                entityId: updatedChargePoint.id,
                details: `Super Admin completed moderation review for charge point #${id}. Result: ${approved ? 'APPROVED' : 'REJECTED'}`,
                userId: userId
            }
        });

        res.json({
            success: true,
            message: `Charge point hardware was successfully ${approved ? 'approved' : 'rejected'}`,
            data: updatedChargePoint
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to update charge point hardware status" });
    }
};

// Fetch the current active system maintenance and pipeline settings (ID #1)
exports.getMainMaintenanceSettings = async (req, res) => {
    try {
        // Attempt to find the single global configuration record row
        let config = await prisma.systemConfig.findUnique({
            where: { id: 1 }
        });

        // Fallback: If no system config row exists yet, return a mock safe state 
        // to prevent the frontend UI from crashing on first boot
        if (!config) {
            config = {
                id: 1,
                globalAlert: false,
                alertMessage: "",
                locationsBlocked: false,
                tariffsBlocked: false,
                portalBlocked: false,
                keysBlocked: false
            };
        }

        res.json({ success: true, data: config });
    } catch (error) {
        console.error("Failed to read system config settings:", error);
        res.status(500).json({ success: false, message: "Failed to fetch platform configuration matrix variables." });
    }
};

// Update or create (upsert) the global maintenance and gate overrides
// Update or create (upsert fallback) the global maintenance and gate overrides safely for SQL Server
exports.updateMaintenanceSettings = async (req, res) => {
    try {
        const { globalAlert, alertMessage, affectedServices } = req.body;
        const userId = req.user.id;

        // Clean up data objects safely
        const dataPayload = {
            globalAlert: globalAlert === true || globalAlert === 'true',
            alertMessage: alertMessage || "",
            locationsBlocked: affectedServices?.locationsFeed === true,
            tariffsBlocked: affectedServices?.tariffsFeed === true,
            portalBlocked: affectedServices?.operatorPortal === true,
            keysBlocked: affectedServices?.developerKeys === true
        };

        // 1. Look for the first configuration record in the system
        let config = await prisma.systemConfig.findFirst();

        if (config) {
            // 2. If it exists, update it by its unique sequential id
            config = await prisma.systemConfig.update({
                where: { id: config.id },
                data: dataPayload
            });
        } else {
            // 3. If it doesn't exist, create it WITHOUT passing an explicit 'id' attribute,
            // letting SQL Server use its native AUTOINCREMENT identity tracking safely.
            config = await prisma.systemConfig.create({
                data: dataPayload
            });
        }

        // Write an immutable log trace inside the Audit ledger system
        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'SYSTEM_CONFIG',
                entityId: config.id,
                details: `Super Admin modified platform operational gates. Global Intercept: ${config.globalAlert}`,
                userId: userId
            }
        });

        res.json({ success: true, data: config });
    } catch (error) {
        console.error("Failed to save system config settings:", error);
        res.status(500).json({ success: false, message: "Failed to propagate configuration changes down to storage nodes." });
    }
};

// Toggle active validation parameters manually via Super Admin moderation layout matrices
exports.toggleUserActivation = async (req, res) => {
    try {
        const { userId } = req.params;
        const { activate } = req.body; // boolean true/false

        const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
        if (!user) return res.status(404).json({ success: false, message: "User profile target not located." });

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                isActivated: activate === true || activate === 'true',
                // Clear out token markers dynamically if explicitly activated by admin panel
                ...(activate && { activationToken: null })
            }
        });

        // Log this administrative mutation into audit log files
        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'USER',
                entityId: user.id,
                details: `Super Admin modified account clearance. User status for <${user.email}> set to: ${activate ? 'ACTIVE' : 'SUSPENDED'}`,
                userId: req.user.id
            }
        });

        res.json({
            success: true,
            message: `User account has been successfully ${activate ? 'activated' : 'deactivated'} via moderation parameters.`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to update target account visibility state parameters." });
    }
};