const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all charge points (Filtered by role, includes parent locations and company structures)
exports.getAllChargePoints = async (req, res) => {
    try {
        const { role, companyId } = req.user;
        const isSuperAdmin = role === 'SUPER_ADMIN';

        const chargePoints = await prisma.chargePoint.findMany({
            where: isSuperAdmin ? {} : {
                location: { companyId: parseInt(companyId) }
            },
            include: {
                location: {
                    include: {
                        company: { select: { name: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: chargePoints });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to fetch charge point registry nodes." });
    }
};

// Create a new charge point (Including OCPI floorLevel definitions)
exports.createChargePoint = async (req, res) => {
    try {
        const { hardwareId, locationId, status, floorLevel } = req.body;
        const { id: userId, role, companyId: userCompanyId } = req.user;

        // Security Check: Ensure the target parent location belongs to the user's company tenancy
        if (role !== 'SUPER_ADMIN') {
            const targetLocation = await prisma.location.findUnique({ where: { id: parseInt(locationId) } });
            if (!targetLocation || targetLocation.companyId !== userCompanyId) {
                return res.status(403).json({ success: false, message: "Unauthorized: Target location belongs to a different network operator profile." });
            }
        }

        const chargePoint = await prisma.chargePoint.create({
            data: {
                hardwareId,
                locationId: parseInt(locationId),
                status: status || 'UNKNOWN',

                // --- NEW OCPI DATA ATTRIBUTE ---
                floorLevel: floorLevel || null
            }
        });

        // Log transaction inside global audit stream
        await prisma.auditLog.create({
            data: {
                action: 'CREATE',
                entity: 'CHARGE_POINT',
                entityId: chargePoint.id,
                details: `Created new OCPI compliant EVSE hardware node: "${hardwareId}" at floor context [${floorLevel || 'Ground'}]`,
                userId: userId
            }
        });

        res.status(201).json({ success: true, data: chargePoint });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to provision new charge point asset mapping." });
    }
};

// Update an existing charge point
exports.updateChargePoint = async (req, res) => {
    try {
        const { id } = req.params;
        const { hardwareId, locationId, status, isApproved, floorLevel } = req.body;
        const { id: userId, role, companyId: userCompanyId } = req.user;

        // Security Check: Verify absolute asset ownership matrix boundary fields
        const existingCP = await prisma.chargePoint.findUnique({
            where: { id: parseInt(id) },
            include: { location: true }
        });

        if (!existingCP) {
            return res.status(404).json({ success: false, message: "Target charge point hardware node not found." });
        }

        if (role !== 'SUPER_ADMIN' && existingCP.location.companyId !== userCompanyId) {
            return res.status(403).json({ success: false, message: "Unauthorized access or modification attempt to this asset index." });
        }

        const chargePoint = await prisma.chargePoint.update({
            where: { id: parseInt(id) },
            data: {
                ...(hardwareId && { hardwareId }),
                ...(locationId && { locationId: parseInt(locationId) }),
                ...(status && { status }),
                ...(isApproved !== undefined && { isApproved }),

                // --- NEW MUTABLE OCPI ATTR ---
                ...(floorLevel !== undefined && { floorLevel })
            }
        });

        // Commit profile action state to security logging
        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'CHARGE_POINT',
                entityId: chargePoint.id,
                details: `Updated charge point configuration data matrices for: "${chargePoint.hardwareId}"`,
                userId: userId
            }
        });

        res.json({ success: true, data: chargePoint });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to compile updates to target asset profile configuration." });
    }
};

// Delete a charge point
exports.deleteChargePoint = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, role, companyId: userCompanyId } = req.user;

        // Security Check: Verify absolute tenancy boundaries before wiping tracking nodes
        const cpToDelete = await prisma.chargePoint.findUnique({
            where: { id: parseInt(id) },
            include: { location: true }
        });

        if (!cpToDelete) {
            return res.status(404).json({ success: false, message: "Target entity reference trace not found." });
        }

        if (role !== 'SUPER_ADMIN' && cpToDelete.location.companyId !== userCompanyId) {
            return res.status(403).json({ success: false, message: "Unauthorized to invoke deletion sequences on this asset container." });
        }

        await prisma.chargePoint.delete({ where: { id: parseInt(id) } });

        // Log final asset deletion drop sequence status
        await prisma.auditLog.create({
            data: {
                action: 'DELETE',
                entity: 'CHARGE_POINT',
                entityId: parseInt(id),
                details: `Permanently unmapped and dropped charge point node: "${cpToDelete.hardwareId}"`,
                userId: userId
            }
        });

        res.json({ success: true, message: "Hardware tracking point unmapped successfully." });
    } catch (error) {
        console.error(error);
        // Protect database row relationships against invalid orphaned connector arrays
        if (error.code === 'P2003') {
            return res.status(400).json({
                success: false,
                message: "Cannot isolate and drop charge point. Active downstream connectors and plug vectors remain mapped to this hardware parent entry."
            });
        }
        res.status(500).json({ success: false, message: "Failed to execute absolute deletion cycle." });
    }
};