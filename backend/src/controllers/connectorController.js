const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper Extraction Module: Pulls real client IP down behind Nginx proxies safely
const getClientIp = (req) => {
    return req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;
};

// Safe JSON parser helper
const safeJsonParse = (str) => {
    if (!str) return null;
    try {
        return JSON.parse(str);
    } catch (_) {
        return str;
    }
};

// 1. GET ALL CONNECTORS (Supports Role Boundaries, OCPI 1:1 Pass-Through Mapping, & Tariff Metadata)
exports.getAllConnectors = async (req, res) => {
    try {
        const { role, companyId } = req.user;
        const isSuperAdmin = role === 'SUPER_ADMIN';

        const connectors = await prisma.connector.findMany({
            where: isSuperAdmin ? {} : {
                chargePoint: {
                    location: { companyId: parseInt(companyId, 10) }
                }
            },
            include: {
                chargePoint: {
                    select: {
                        id: true,
                        hardwareId: true,
                        evseUid: true,
                        location: {
                            select: {
                                id: true,
                                name: true,
                                locationUid: true,
                                company: { select: { id: true, name: true, operatorReferenceId: true } }
                            }
                        }
                    }
                },
                tariff: {
                    select: { id: true, name: true, pricePerKwh: true, currency: true }
                }
            },
            orderBy: { id: 'desc' }
        });

        const mappedConnectors = connectors.map((conn) => {
            const parsedTariffIds = safeJsonParse(conn.tariffIdsJson);

            return {
                id: conn.id,
                connectorUid: conn.connectorUid || `conn_${conn.id}`,
                type: conn.type,
                standard: conn.standard || 'IEC_62196_T2',
                format: conn.format || 'SOCKET',
                powerType: conn.powerType || 'AC_3_PHASE',
                maxPowerKw: conn.maxPowerKw,
                voltage: conn.voltage,
                amperage: conn.amperage,
                status: conn.status || 'AVAILABLE',
                termsAndConditions: conn.termsAndConditions || '',
                tariffIds: Array.isArray(parsedTariffIds) ? parsedTariffIds : [],
                createdAt: conn.createdAt,
                updatedAt: conn.updatedAt,

                // Parent Charge Point & Location Context
                chargePointId: conn.chargePointId,
                hardwareId: conn.chargePoint?.hardwareId || 'Unknown EVSE',
                evseUid: conn.chargePoint?.evseUid || null,
                locationId: conn.chargePoint?.location?.id || null,
                locationName: conn.chargePoint?.location?.name || 'Unknown Location',
                locationUid: conn.chargePoint?.location?.locationUid || null,
                companyId: conn.chargePoint?.location?.company?.id || null,
                companyName: conn.chargePoint?.location?.company?.name || 'Independent Operator',

                // Direct Relational Tariff Reference
                tariffId: conn.tariffId,
                tariff: conn.tariff || null
            };
        });

        res.json({ success: true, data: mappedConnectors });
    } catch (error) {
        console.error("Failed to query connectors matrix:", error);
        res.status(500).json({ success: false, message: "Failed to fetch connectors registry matrix." });
    }
};

// 2. CREATE A NEW CONNECTOR
exports.createConnector = async (req, res) => {
    try {
        const {
            type, maxPowerKw, status, chargePointId, tariffId,
            standard, format, powerType, voltage, amperage,
            connectorUid, termsAndConditions, tariffIds
        } = req.body;
        const { id: userId, role, companyId: userCompanyId } = req.user;
        const clientIp = getClientIp(req);

        const targetCpId = parseInt(chargePointId, 10);
        if (isNaN(targetCpId)) {
            return res.status(400).json({ success: false, message: "Valid chargePointId is required." });
        }

        // Security Check: Verify Charge Point ownership
        const targetCP = await prisma.chargePoint.findUnique({
            where: { id: targetCpId },
            include: { location: true }
        });

        if (!targetCP) {
            return res.status(404).json({ success: false, message: "Target charge point hardware node not found." });
        }

        if (role !== 'SUPER_ADMIN' && targetCP.location.companyId !== userCompanyId) {
            return res.status(403).json({ success: false, message: "Unauthorized: Targeted charge point hardware node belongs to a different network tenancy." });
        }

        const connector = await prisma.connector.create({
            data: {
                type: type || (powerType && powerType.includes("AC") ? "AC" : "DC"),
                maxPowerKw: parseFloat(maxPowerKw) || 22.0,
                status: status || 'AVAILABLE',
                chargePointId: targetCpId,
                connectorUid: connectorUid || null,
                ...(tariffId && { tariffId: parseInt(tariffId, 10) }),

                standard: standard || "IEC_62196_T2",
                format: format || "SOCKET",
                powerType: powerType || "AC_3_PHASE",
                voltage: voltage ? parseInt(voltage, 10) : 230,
                amperage: amperage ? parseInt(amperage, 10) : 32,
                termsAndConditions: termsAndConditions || null,
                tariffIdsJson: Array.isArray(tariffIds) ? JSON.stringify(tariffIds) : (tariffIds ? JSON.stringify([tariffIds]) : null)
            }
        });

        await prisma.auditLog.create({
            data: {
                action: 'CREATE',
                entity: 'CONNECTOR',
                entityId: connector.id,
                details: `Created OCPI compliant connector (ID: ${connector.id}): Standard [${connector.standard}], Format [${connector.format}], Capacity [${maxPowerKw}kW].`,
                ipAddress: clientIp,
                userId: userId
            }
        });

        res.status(201).json({ success: true, data: connector });
    } catch (error) {
        console.error("Create connector error:", error);
        res.status(500).json({ success: false, message: "Failed to provision new hardware connector endpoint." });
    }
};

// 3. UPDATE AN EXISTING CONNECTOR
exports.updateConnector = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            type, maxPowerKw, status, tariffId,
            standard, format, powerType, voltage, amperage,
            connectorUid, termsAndConditions, tariffIds
        } = req.body;
        const { id: userId, role, companyId: userCompanyId } = req.user;
        const clientIp = getClientIp(req);

        const parsedConnId = parseInt(id, 10);
        const existingConnector = await prisma.connector.findUnique({
            where: { id: parsedConnId },
            include: { chargePoint: { include: { location: true } } }
        });

        if (!existingConnector) {
            return res.status(404).json({ success: false, message: "Target connector endpoint item not found." });
        }

        if (role !== 'SUPER_ADMIN' && existingConnector.chargePoint.location.companyId !== userCompanyId) {
            return res.status(403).json({ success: false, message: "Unauthorized access or modification sequence violation to this asset tracker." });
        }

        const updateData = {
            ...(type && { type }),
            ...(maxPowerKw !== undefined && { maxPowerKw: parseFloat(maxPowerKw) }),
            ...(status && { status }),
            ...(tariffId !== undefined && { tariffId: tariffId ? parseInt(tariffId, 10) : null }),
            ...(connectorUid !== undefined && { connectorUid }),
            ...(standard && { standard }),
            ...(format && { format }),
            ...(powerType && { powerType }),
            ...(voltage !== undefined && { voltage: parseInt(voltage, 10) }),
            ...(amperage !== undefined && { amperage: parseInt(amperage, 10) }),
            ...(termsAndConditions !== undefined && { termsAndConditions }),
            ...(tariffIds !== undefined && { tariffIdsJson: Array.isArray(tariffIds) ? JSON.stringify(tariffIds) : JSON.stringify([tariffIds]) })
        };

        const connector = await prisma.connector.update({
            where: { id: parsedConnId },
            data: updateData
        });

        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'CONNECTOR',
                entityId: connector.id,
                details: `Updated compliance configurations for Connector Plug ID: ${connector.id}`,
                ipAddress: clientIp,
                userId: userId
            }
        });

        res.json({ success: true, data: connector });
    } catch (error) {
        console.error("Update connector error:", error);
        res.status(500).json({ success: false, message: "Failed to synchronize changes to target hardware connector plug." });
    }
};

// 4. DELETE A CONNECTOR (Transactional Cascading Purge)
exports.deleteConnector = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, role, companyId: userCompanyId } = req.user;
        const parsedConnId = parseInt(id, 10);
        const clientIp = getClientIp(req);

        const connectorToDelete = await prisma.connector.findUnique({
            where: { id: parsedConnId },
            include: { chargePoint: { include: { location: true } } }
        });

        if (!connectorToDelete) {
            return res.status(404).json({ success: false, message: "Target connector entity not found." });
        }

        if (role !== 'SUPER_ADMIN' && connectorToDelete.chargePoint.location.companyId !== userCompanyId) {
            return res.status(403).json({ success: false, message: "Unauthorized execution attempt on this connector resource." });
        }

        // Execute Cascading Transaction to wipe dependent sessions first
        await prisma.$transaction(async (tx) => {
            await tx.session.deleteMany({ where: { connectorId: parsedConnId } });
            await tx.connector.delete({ where: { id: parsedConnId } });
        });

        await prisma.auditLog.create({
            data: {
                action: 'DELETE',
                entity: 'CONNECTOR',
                entityId: parsedConnId,
                details: `Permanently dropped ${connectorToDelete.type} connector node (Plug ID: ${parsedConnId})`,
                ipAddress: clientIp,
                userId: userId
            }
        });

        res.json({ success: true, message: "Connector node dropped successfully." });
    } catch (error) {
        console.error("Delete connector error:", error);
        res.status(500).json({ success: false, message: "Failed to execute absolute deletion cycle." });
    }
};