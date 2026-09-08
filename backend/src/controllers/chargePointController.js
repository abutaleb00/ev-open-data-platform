const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { touchCompany } = require('../utils/touchCompany');

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

// 1. GET ALL CHARGE POINTS (Supports role boundary guards, 1:1 OCPI pass-through parsing, and child connectors)
exports.getAllChargePoints = async (req, res) => {
    try {
        const { role, companyId } = req.user;
        const isSuperAdmin = role === 'SUPER_ADMIN';

        const chargePoints = await prisma.chargePoint.findMany({
            where: isSuperAdmin ? {} : {
                location: { companyId: parseInt(companyId, 10) }
            },
            include: {
                location: {
                    select: {
                        id: true,
                        locationUid: true,
                        name: true,
                        address: true,
                        city: true,
                        postcode: true,
                        companyId: true,
                        company: { select: { id: true, name: true, operatorReferenceId: true } }
                    }
                },
                connectors: true
            },
            orderBy: { createdAt: 'desc' }
        });

        const mappedChargePoints = chargePoints.map((cp) => {
            const parsedDirections = safeJsonParse(cp.directions);
            const parsedStatusSchedule = safeJsonParse(cp.statusSchedule);
            const parsedEvseImages = safeJsonParse(cp.evseImages);

            return {
                id: cp.id,
                hardwareId: cp.hardwareId,
                evseUid: cp.evseUid || `evse_${cp.id}`,
                status: cp.status || 'AVAILABLE',
                floorLevel: cp.floorLevel || '',
                physicalReference: cp.physicalReference || null,
                isApproved: cp.isApproved,
                createdAt: cp.createdAt,
                updatedAt: cp.updatedAt,

                // Spatial & Direction Attributes
                evseLatitude: cp.evseLatitude || cp.location?.latitude || null,
                evseLongitude: cp.evseLongitude || cp.location?.longitude || null,
                directions: Array.isArray(parsedDirections) ? parsedDirections : (parsedDirections ? [parsedDirections] : []),
                capabilities: cp.capabilities ? cp.capabilities.split(',').map(c => c.trim()) : [],
                parkingRestrictions: cp.parkingRestrictions ? cp.parkingRestrictions.split(',').map(p => p.trim()) : [],
                statusSchedule: parsedStatusSchedule,
                images: Array.isArray(parsedEvseImages) ? parsedEvseImages : [],

                // Parent Location Relation
                locationId: cp.locationId,
                locationName: cp.location?.name || 'Unknown Location',
                locationUid: cp.location?.locationUid || null,
                companyId: cp.location?.companyId || null,
                companyName: cp.location?.company?.name || 'Independent Operator',

                // Child Connectors
                connectorsCount: cp.connectors?.length || 0,
                connectors: (cp.connectors || []).map((conn) => ({
                    id: conn.id,
                    connectorUid: conn.connectorUid || `conn_${conn.id}`,
                    type: conn.type,
                    standard: conn.standard,
                    format: conn.format,
                    powerType: conn.powerType,
                    maxPowerKw: conn.maxPowerKw,
                    voltage: conn.voltage,
                    amperage: conn.amperage,
                    status: conn.status,
                    termsAndConditions: conn.termsAndConditions,
                    tariffIds: safeJsonParse(conn.tariffIdsJson) || []
                }))
            };
        });

        res.json({ success: true, data: mappedChargePoints });
    } catch (error) {
        console.error("Failed to query charge point registry:", error);
        res.status(500).json({ success: false, message: "Failed to fetch charge point registry nodes." });
    }
};

// 2. CREATE A NEW CHARGE POINT
exports.createChargePoint = async (req, res) => {
    try {
        const {
            hardwareId, locationId, status, floorLevel, evseUid,
            physicalReference, parkingRestrictions, capabilities,
            directions, evseLatitude, evseLongitude
        } = req.body;
        const { id: userId, role, companyId: userCompanyId } = req.user;
        const clientIp = getClientIp(req);

        const targetLocationId = parseInt(locationId, 10);
        if (isNaN(targetLocationId)) {
            return res.status(400).json({ success: false, message: "Valid parent locationId is required." });
        }

        // Security Check: Verify location tenancy
        const targetLocation = await prisma.location.findUnique({ where: { id: targetLocationId } });
        if (!targetLocation) {
            return res.status(404).json({ success: false, message: "Target location node not found." });
        }

        if (role !== 'SUPER_ADMIN' && targetLocation.companyId !== userCompanyId) {
            return res.status(403).json({ success: false, message: "Unauthorized: Target location belongs to a different network operator profile." });
        }

        const chargePoint = await prisma.chargePoint.create({
            data: {
                hardwareId,
                locationId: targetLocationId,
                evseUid: evseUid || null,
                status: status || 'AVAILABLE',
                floorLevel: floorLevel || null,
                physicalReference: physicalReference || null,
                parkingRestrictions: Array.isArray(parkingRestrictions) ? parkingRestrictions.join(',') : parkingRestrictions || null,
                capabilities: Array.isArray(capabilities) ? capabilities.join(',') : capabilities || 'REMOTE_START_STOP_CAPABLE',
                directions: typeof directions === 'object' ? JSON.stringify(directions) : directions || null,
                evseLatitude: evseLatitude ? parseFloat(evseLatitude) : null,
                evseLongitude: evseLongitude ? parseFloat(evseLongitude) : null,
                // See locationController.createLocation for the moderation rationale.
                isApproved: role === 'SUPER_ADMIN'
            }
        });

        await prisma.auditLog.create({
            data: {
                action: 'CREATE',
                entity: 'CHARGE_POINT',
                entityId: chargePoint.id,
                details: `Created new OCPI compliant EVSE hardware node: "${hardwareId}" at floor context [${floorLevel || 'Ground'}]`,
                ipAddress: clientIp,
                userId: userId
            }
        });

        await touchCompany(targetLocation.companyId);

        res.status(201).json({ success: true, data: chargePoint });
    } catch (error) {
        console.error("Create charge point error:", error);
        res.status(500).json({ success: false, message: "Failed to provision new charge point asset mapping." });
    }
};

// 3. UPDATE AN EXISTING CHARGE POINT
exports.updateChargePoint = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            hardwareId, locationId, status, isApproved, floorLevel, evseUid,
            physicalReference, parkingRestrictions, capabilities, directions,
            evseLatitude, evseLongitude
        } = req.body;
        const { id: userId, role, companyId: userCompanyId } = req.user;
        const clientIp = getClientIp(req);

        const parsedCpId = parseInt(id, 10);
        const existingCP = await prisma.chargePoint.findUnique({
            where: { id: parsedCpId },
            include: { location: true }
        });

        if (!existingCP) {
            return res.status(404).json({ success: false, message: "Target charge point hardware node not found." });
        }

        if (role !== 'SUPER_ADMIN' && existingCP.location.companyId !== userCompanyId) {
            return res.status(403).json({ success: false, message: "Unauthorized access or modification attempt to this asset index." });
        }

        const updateData = {
            ...(hardwareId && { hardwareId }),
            ...(evseUid !== undefined && { evseUid }),
            ...(locationId && { locationId: parseInt(locationId, 10) }),
            ...(status && { status }),
            // Moderation approval is a Super Admin-only decision - see createChargePoint.
            ...(isApproved !== undefined && role === 'SUPER_ADMIN' && { isApproved: Boolean(isApproved) }),
            ...(floorLevel !== undefined && { floorLevel }),
            ...(physicalReference !== undefined && { physicalReference }),
            ...(parkingRestrictions !== undefined && { parkingRestrictions: Array.isArray(parkingRestrictions) ? parkingRestrictions.join(',') : parkingRestrictions }),
            ...(capabilities !== undefined && { capabilities: Array.isArray(capabilities) ? capabilities.join(',') : capabilities }),
            ...(directions !== undefined && { directions: typeof directions === 'object' ? JSON.stringify(directions) : directions }),
            ...(evseLatitude !== undefined && { evseLatitude: parseFloat(evseLatitude) }),
            ...(evseLongitude !== undefined && { evseLongitude: parseFloat(evseLongitude) })
        };

        const chargePoint = await prisma.chargePoint.update({
            where: { id: parsedCpId },
            data: updateData
        });

        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'CHARGE_POINT',
                entityId: chargePoint.id,
                details: `Updated charge point configuration data matrices for: "${chargePoint.hardwareId}"`,
                ipAddress: clientIp,
                userId: userId
            }
        });

        await touchCompany(existingCP.location.companyId);

        res.json({ success: true, data: chargePoint });
    } catch (error) {
        console.error("Update charge point error:", error);
        res.status(500).json({ success: false, message: "Failed to compile updates to target asset profile configuration." });
    }
};

// 4. DELETE A CHARGE POINT (Transactional Cascading Purge)
exports.deleteChargePoint = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, role, companyId: userCompanyId } = req.user;
        const parsedCpId = parseInt(id, 10);
        const clientIp = getClientIp(req);

        const cpToDelete = await prisma.chargePoint.findUnique({
            where: { id: parsedCpId },
            include: { location: true }
        });

        if (!cpToDelete) {
            return res.status(404).json({ success: false, message: "Target entity reference trace not found." });
        }

        if (role !== 'SUPER_ADMIN' && cpToDelete.location.companyId !== userCompanyId) {
            return res.status(403).json({ success: false, message: "Unauthorized to invoke deletion sequences on this asset container." });
        }

        // Execute Cascading Purge Transaction
        await prisma.$transaction(async (tx) => {
            const connectors = await tx.connector.findMany({
                where: { chargePointId: parsedCpId },
                select: { id: true }
            });
            const connectorIds = connectors.map(c => c.id);

            if (connectorIds.length > 0) {
                await tx.session.deleteMany({ where: { connectorId: { in: connectorIds } } });
                await tx.connector.deleteMany({ where: { chargePointId: parsedCpId } });
            }

            await tx.media.deleteMany({ where: { chargePointId: parsedCpId } });
            await tx.chargePoint.delete({ where: { id: parsedCpId } });
        });

        await prisma.auditLog.create({
            data: {
                action: 'DELETE',
                entity: 'CHARGE_POINT',
                entityId: parsedCpId,
                details: `Permanently unmapped and dropped charge point node: "${cpToDelete.hardwareId}"`,
                ipAddress: clientIp,
                userId: userId
            }
        });

        await touchCompany(cpToDelete.location.companyId);

        res.json({ success: true, message: "Hardware tracking point unmapped successfully." });
    } catch (error) {
        console.error("Delete charge point error:", error);
        res.status(500).json({ success: false, message: "Failed to execute deletion cycle." });
    }
};