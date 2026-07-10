const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all connectors (Filtered by role, includes Charge Point, Location, Company, and Tariff metadata)
exports.getAllConnectors = async (req, res) => {
    try {
        const { role, companyId } = req.user;
        const isSuperAdmin = role === 'SUPER_ADMIN';

        const connectors = await prisma.connector.findMany({
            where: isSuperAdmin ? {} : {
                chargePoint: {
                    location: { companyId: parseInt(companyId) }
                }
            },
            include: {
                chargePoint: {
                    select: {
                        hardwareId: true,
                        location: {
                            select: { name: true }
                        }
                    }
                },
                tariff: {
                    select: { name: true, pricePerKwh: true, currency: true }
                }
            },
            orderBy: { id: 'desc' }
        });
        res.json({ success: true, data: connectors });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to fetch connectors registry matrix." });
    }
};

// Create a new connector mapping full dynamic OCPI properties
exports.createConnector = async (req, res) => {
    try {
        const {
            type, maxPowerKw, status, chargePointId, tariffId,
            standard, format, powerType, voltage, amperage
        } = req.body;
        const { id: userId, role, companyId: userCompanyId } = req.user;

        // Security Check: Verify Charge Point belongs to the operating company tenancy
        if (role !== 'SUPER_ADMIN') {
            const targetCP = await prisma.chargePoint.findUnique({
                where: { id: parseInt(chargePointId) },
                include: { location: true }
            });
            if (!targetCP || targetCP.location.companyId !== userCompanyId) {
                return res.status(403).json({ success: false, message: "Unauthorized: Targeted charge point hardware node belongs to a different network tenancy." });
            }
        }

        const connector = await prisma.connector.create({
            data: {
                type,
                maxPowerKw: parseFloat(maxPowerKw),
                status: status || 'AVAILABLE',
                chargePointId: parseInt(chargePointId),
                ...(tariffId && { tariffId: parseInt(tariffId) }),

                // --- NEW EXTENDED OCPI COMPLIANCE SPECIFICATIONS ---
                standard: standard || "IEC_62196_T2",
                format: format || "SOCKET",
                powerType: powerType || "AC_3_PHASE",
                voltage: voltage ? parseInt(voltage) : 230,
                amperage: amperage ? parseInt(amperage) : 32
            }
        });

        // Log action trace inside platform transaction auditing logs
        await prisma.auditLog.create({
            data: {
                action: 'CREATE',
                entity: 'CONNECTOR',
                entityId: connector.id,
                details: `Created OCPI compliant connector (ID: ${connector.id}): Standard [${connector.standard}], Format [${connector.format}], Outputting ${maxPowerKw}kW max capacity.`,
                userId: userId
            }
        });

        res.status(201).json({ success: true, data: connector });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to provision new hardware connector endpoint." });
    }
};

// Update an existing connector including structural mutable OCPI parameters
exports.updateConnector = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            type, maxPowerKw, status, tariffId,
            standard, format, powerType, voltage, amperage
        } = req.body;
        const { id: userId, role, companyId: userCompanyId } = req.user;

        // Security Check: Verify absolute asset ownership matrix boundary fields
        const existingConnector = await prisma.connector.findUnique({
            where: { id: parseInt(id) },
            include: { chargePoint: { include: { location: true } } }
        });

        if (!existingConnector) {
            return res.status(404).json({ success: false, message: "Target connector endpoint item not found." });
        }

        if (role !== 'SUPER_ADMIN' && existingConnector.chargePoint.location.companyId !== userCompanyId) {
            return res.status(403).json({ success: false, message: "Unauthorized access or modification sequence violation to this asset tracker." });
        }

        const connector = await prisma.connector.update({
            where: { id: parseInt(id) },
            data: {
                ...(type && { type }),
                ...(maxPowerKw && { maxPowerKw: parseFloat(maxPowerKw) }),
                ...(status && { status }),
                ...(tariffId !== undefined && { tariffId: tariffId ? parseInt(tariffId) : null }),

                // --- NEW EXTENDED OCPI DATA MUTABLE SPECIFICATIONS ---
                ...(standard && { standard }),
                ...(format && { format }),
                ...(powerType && { powerType }),
                ...(voltage && { voltage: parseInt(voltage) }),
                ...(amperage && { amperage: parseInt(amperage) })
            }
        });

        // Commit transaction history to system auditing metrics
        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'CONNECTOR',
                entityId: connector.id,
                details: `Updated compliance configurations and parameters for Connector Plug ID: ${connector.id}`,
                userId: userId
            }
        });

        res.json({ success: true, data: connector });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to synchronize changes to target hardware connector plug." });
    }
};

// Delete a connector plug safely
exports.deleteConnector = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, role, companyId: userCompanyId } = req.user;

        // Security Check: Verify tenancy before dropping rows from relational chains
        const connectorToDelete = await prisma.connector.findUnique({
            where: { id: parseInt(id) },
            include: { chargePoint: { include: { location: true } } }
        });

        if (!connectorToDelete) {
            return res.status(404).json({ success: false, message: "Target connector entity not found." });
        }

        if (role !== 'SUPER_ADMIN' && connectorToDelete.chargePoint.location.companyId !== userCompanyId) {
            return res.status(403).json({ success: false, message: "Unauthorized execution attempt on this connector resource." });
        }

        await prisma.connector.delete({
            where: { id: parseInt(id) }
        });

        // Commit action to logging pool
        await prisma.auditLog.create({
            data: {
                action: 'DELETE',
                entity: 'CONNECTOR',
                entityId: parseInt(id),
                details: `Permanently dropped ${connectorToDelete.type} connector node (Plug ID: ${id}) from Parent Hardware CP.`,
                userId: userId
            }
        });

        res.json({ success: true, message: "Connector node dropped successfully." });
    } catch (error) {
        console.error(error);
        // Prevent deletion if historical telemetry data sessions remain mapped to it in SQL Server database
        if (error.code === 'P2003') {
            return res.status(400).json({
                success: false,
                message: "Cannot isolate and delete connector. Active or historical charging session data registers remain tied to this specific plug asset resource."
            });
        }
        res.status(500).json({ success: false, message: "Failed to execute absolute deletion cycle." });
    }
};