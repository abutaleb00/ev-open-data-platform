const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

// Helper Extraction Module: Pulls real client IP down behind Nginx proxies safely
const getClientIp = (req) => {
    return req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;
};

// Helper function to extract a file name from a public URL and purge it from the server's disk
const purgePhysicalFile = (url) => {
    try {
        if (!url) return false;
        const filename = url.split('/uploads/locations/')[1];
        if (filename) {
            const physicalPath = path.join(__dirname, '../../uploads/locations', filename);
            if (fs.existsSync(physicalPath)) {
                fs.unlinkSync(physicalPath);
                return true;
            }
        }
    } catch (err) {
        console.error(`Failed to unlink local server file trace for path [${url}]:`, err);
    }
    return false;
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

// 1. GET ALL LOCATIONS (Supports Role-based filtering, Search, Status, and 1:1 OCPI Payload Parsing)
exports.getAllLocations = async (req, res) => {
    try {
        const { role, companyId } = req.user;
        const { search, status } = req.query;
        const isSuperAdmin = role === 'SUPER_ADMIN';

        // 1. Core Role-Based Boundary Guard
        const whereClause = isSuperAdmin ? {} : { companyId: parseInt(companyId, 10) };

        // 2. Add Status Filter if provided ('approved' or 'pending')
        if (status) {
            whereClause.isApproved = status === 'approved';
        }

        // 3. Add Dynamic Text Search across Company Name, Postcode, Location Name, and Location UID
        if (search && search.trim() !== '') {
            const searchString = search.trim();

            whereClause.AND = [
                ...(whereClause.AND || []),
                {
                    OR: [
                        { name: { contains: searchString } },
                        { postcode: { contains: searchString } },
                        { city: { contains: searchString } },
                        { locationUid: { contains: searchString } },
                        { operatorReferenceId: { contains: searchString } },
                        {
                            company: {
                                name: { contains: searchString }
                            }
                        }
                    ]
                }
            ];
        }

        const locations = await prisma.location.findMany({
            where: whereClause,
            include: {
                company: {
                    select: { id: true, name: true, operatorReferenceId: true }
                },
                media: {
                    select: { id: true, url: true, type: true, category: true }
                },
                chargePoints: {
                    include: {
                        connectors: true
                    }
                },
                _count: {
                    select: { chargePoints: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Map and parse stored JSON attributes cleanly for UI & API consumption
        const mappedLocations = locations.map((loc) => {
            const parsedOperator = safeJsonParse(loc.operatorData);
            const parsedOwner = safeJsonParse(loc.ownerData);
            const parsedSuboperator = safeJsonParse(loc.suboperatorData);
            const parsedOpeningTimes = safeJsonParse(loc.openingTimesData);
            const parsedDirections = safeJsonParse(loc.directions);
            const parsedRelatedLocations = safeJsonParse(loc.relatedLocations);
            const parsedPublishAllowedTo = safeJsonParse(loc.publishAllowedTo);
            const parsedEnergyMix = safeJsonParse(loc.energyMix);

            return {
                id: loc.id,
                locationUid: loc.locationUid || `loc_${loc.id}`,
                name: loc.name,
                address: loc.address,
                postcode: loc.postcode,
                city: loc.city,
                state: loc.state,
                countryCode: loc.countryCode,
                partyId: loc.partyId,
                countryISO: loc.countryISO,
                latitude: loc.latitude,
                longitude: loc.longitude,
                parkingType: loc.parkingType,
                timeZone: loc.timeZone,
                amenities: loc.amenities ? loc.amenities.split(',').map(a => a.trim()) : [],
                facilities: loc.amenities ? loc.amenities.split(',').map(a => a.trim()) : [],
                chargingWhenClosed: loc.chargingWhenClosed,
                publish: loc.publish,
                isApproved: loc.isApproved,
                rejectionNote: loc.rejectionNote,
                createdAt: loc.createdAt,
                updatedAt: loc.updatedAt,
                companyId: loc.companyId,
                companyName: loc.company?.name || "Independent Operator",
                operatorReferenceId: loc.operatorReferenceId || loc.company?.operatorReferenceId || null,

                // Rich OCPI JSON Structures
                operator: parsedOperator || { name: loc.company?.name || "Independent Operator" },
                suboperator: parsedSuboperator,
                owner: parsedOwner,
                opening_times: parsedOpeningTimes,
                directions: Array.isArray(parsedDirections) ? parsedDirections : [],
                related_locations: parsedRelatedLocations,
                publish_allowed_to: parsedPublishAllowedTo,
                energy_mix: parsedEnergyMix,

                // Media Assets & Infrastructure Metrics
                images: loc.media.map(m => ({
                    id: m.id,
                    url: m.url,
                    category: m.category || "ENTRANCE",
                    type: m.type
                })),
                chargePointsCount: loc._count?.chargePoints || 0,
                chargePoints: loc.chargePoints.map(cp => ({
                    id: cp.id,
                    hardwareId: cp.hardwareId,
                    evseUid: cp.evseUid,
                    status: cp.status,
                    capabilities: cp.capabilities ? cp.capabilities.split(',').map(c => c.trim()) : [],
                    connectorsCount: cp.connectors?.length || 0,
                    connectors: cp.connectors.map(conn => ({
                        id: conn.id,
                        connectorUid: conn.connectorUid,
                        standard: conn.standard,
                        format: conn.format,
                        powerType: conn.powerType,
                        maxPowerKw: conn.maxPowerKw,
                        voltage: conn.voltage,
                        amperage: conn.amperage,
                        tariffIds: safeJsonParse(conn.tariffIdsJson) || []
                    }))
                }))
            };
        });

        res.json({ success: true, data: mappedLocations });
    } catch (error) {
        console.error("Filter matrix failure:", error);
        res.status(500).json({ success: false, message: "Failed to query searchable locations registry." });
    }
};

// 2. CREATE A NEW LOCATION
exports.createLocation = async (req, res) => {
    try {
        const {
            name, address, postcode, latitude, longitude, amenities, companyId,
            city, state, countryCode, partyId, countryISO, parkingType, timeZone,
            operatorData, suboperatorData, ownerData, openingTimesData, directions
        } = req.body;
        const { id: userId, role, companyId: userCompanyId } = req.user;
        const clientIp = getClientIp(req);

        const targetCompanyId = role === 'SUPER_ADMIN' ? parseInt(companyId, 10) : parseInt(userCompanyId, 10);

        if (!targetCompanyId) {
            return res.status(400).json({ success: false, message: "A valid company context ID is required." });
        }

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
            return res.status(400).json({
                success: false,
                message: "Latitude (-90 to 90) or Longitude (-180 to 180) values fall outside valid global coordinates."
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            const location = await tx.location.create({
                data: {
                    name,
                    address,
                    postcode,
                    latitude: lat,
                    longitude: lng,
                    amenities: Array.isArray(amenities) ? amenities.join(',') : amenities || null,
                    companyId: targetCompanyId,
                    city: city || "Unknown City",
                    state: state || null,
                    countryCode: countryCode || "GB",
                    partyId: partyId || "Ada",
                    countryISO: countryISO || "United Kingdom",
                    parkingType: parkingType || "ON_STREET",
                    timeZone: timeZone || "Europe/London",

                    // Preserve raw JSON payloads if provided
                    operatorData: typeof operatorData === 'object' ? JSON.stringify(operatorData) : operatorData || null,
                    suboperatorData: typeof suboperatorData === 'object' ? JSON.stringify(suboperatorData) : suboperatorData || null,
                    ownerData: typeof ownerData === 'object' ? JSON.stringify(ownerData) : ownerData || null,
                    openingTimesData: typeof openingTimesData === 'object' ? JSON.stringify(openingTimesData) : openingTimesData || null,
                    directions: typeof directions === 'object' ? JSON.stringify(directions) : directions || null,
                    isApproved: true
                }
            });

            if (req.files && req.files.length > 0) {
                const hostUrl = process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL).host : req.get('host');
                const mediaData = req.files.map(file => ({
                    url: `${req.protocol}://${hostUrl}/uploads/locations/${file.filename}`,
                    type: file.mimetype,
                    category: "ENTRANCE",
                    locationId: location.id
                }));

                await tx.media.createMany({ data: mediaData });
            }

            return location;
        });

        await prisma.auditLog.create({
            data: {
                action: 'CREATE',
                entity: 'LOCATION',
                entityId: result.id,
                details: `Created new location entry: "${name}".`,
                ipAddress: clientIp,
                userId: userId
            }
        });

        res.status(201).json({ success: true, data: result });
    } catch (error) {
        console.error("Create location error:", error);
        res.status(500).json({ success: false, message: "Failed to create location entry." });
    }
};

// 3. UPDATE AN EXISTING LOCATION
exports.updateLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, address, postcode, latitude, longitude, amenities, isApproved,
            city, state, countryCode, partyId, countryISO, parkingType, timeZone,
            chargingWhenClosed, operatorData, suboperatorData, ownerData, openingTimesData, directions
        } = req.body;
        const userId = req.user.id;
        const clientIp = getClientIp(req);

        let parsedIsApproved = undefined;
        if (isApproved !== undefined) {
            parsedIsApproved = isApproved === 'true' || isApproved === true;
        }

        const updateData = {
            ...(name && { name }),
            ...(address && { address }),
            ...(postcode && { postcode }),
            ...(amenities !== undefined && { amenities: Array.isArray(amenities) ? amenities.join(',') : amenities }),
            ...(parsedIsApproved !== undefined && { isApproved: parsedIsApproved }),
            ...(city && { city }),
            ...(state !== undefined && { state }),
            ...(countryCode && { countryCode }),
            ...(partyId && { partyId }),
            ...(countryISO && { countryISO }),
            ...(parkingType && { parkingType }),
            ...(timeZone && { timeZone }),
            ...(chargingWhenClosed !== undefined && { chargingWhenClosed: Boolean(chargingWhenClosed) }),

            ...(operatorData !== undefined && { operatorData: typeof operatorData === 'object' ? JSON.stringify(operatorData) : operatorData }),
            ...(suboperatorData !== undefined && { suboperatorData: typeof suboperatorData === 'object' ? JSON.stringify(suboperatorData) : suboperatorData }),
            ...(ownerData !== undefined && { ownerData: typeof ownerData === 'object' ? JSON.stringify(ownerData) : ownerData }),
            ...(openingTimesData !== undefined && { openingTimesData: typeof openingTimesData === 'object' ? JSON.stringify(openingTimesData) : openingTimesData }),
            ...(directions !== undefined && { directions: typeof directions === 'object' ? JSON.stringify(directions) : directions })
        };

        if (latitude !== undefined || longitude !== undefined) {
            if (latitude) updateData.latitude = parseFloat(latitude);
            if (longitude) updateData.longitude = parseFloat(longitude);

            const finalLat = updateData.latitude;
            const finalLng = updateData.longitude;

            if ((finalLat !== undefined && (isNaN(finalLat) || finalLat < -90 || finalLat > 90)) ||
                (finalLng !== undefined && (isNaN(finalLng) || finalLng < -180 || finalLng > 180))) {
                return res.status(400).json({
                    success: false,
                    message: "Geospatial parameters violate projection bounds."
                });
            }
        }

        const location = await prisma.location.update({
            where: { id: parseInt(id, 10) },
            data: updateData
        });

        if (req.files && req.files.length > 0) {
            const hostUrl = process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL).host : req.get('host');
            const mediaData = req.files.map(file => ({
                url: `${req.protocol}://${hostUrl}/uploads/locations/${file.filename}`,
                type: file.mimetype,
                category: "ENTRANCE",
                locationId: location.id
            }));

            await prisma.media.createMany({ data: mediaData });
        }

        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'LOCATION',
                entityId: location.id,
                details: `Updated properties for location: "${location.name}"`,
                ipAddress: clientIp,
                userId: userId
            }
        });

        res.json({ success: true, data: location });
    } catch (error) {
        console.error("Update location error:", error);
        res.status(500).json({ success: false, message: "Failed to apply changes to target location." });
    }
};

// 4. DELETE A LOCATION (Cascading Clean Up)
exports.deleteLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const parsedId = parseInt(id, 10);
        const clientIp = getClientIp(req);

        const locationToDelete = await prisma.location.findUnique({
            where: { id: parsedId },
            include: {
                media: { select: { url: true } },
                chargePoints: { select: { id: true } }
            }
        });

        if (!locationToDelete) {
            return res.status(404).json({ success: false, message: "Target location entry not found." });
        }

        // Execute Cascading Purge inside a Transaction
        await prisma.$transaction(async (tx) => {
            const chargePointIds = locationToDelete.chargePoints.map(cp => cp.id);

            if (chargePointIds.length > 0) {
                const connectors = await tx.connector.findMany({
                    where: { chargePointId: { in: chargePointIds } },
                    select: { id: true }
                });
                const connectorIds = connectors.map(c => c.id);

                if (connectorIds.length > 0) {
                    await tx.session.deleteMany({ where: { connectorId: { in: connectorIds } } });
                    await tx.connector.deleteMany({ where: { chargePointId: { in: chargePointIds } } });
                }

                await tx.media.deleteMany({ where: { chargePointId: { in: chargePointIds } } });
                await tx.chargePoint.deleteMany({ where: { locationId: parsedId } });
            }

            if (locationToDelete.media && locationToDelete.media.length > 0) {
                locationToDelete.media.forEach(mediaItem => {
                    purgePhysicalFile(mediaItem.url);
                });
                await tx.media.deleteMany({ where: { locationId: parsedId } });
            }

            await tx.location.delete({ where: { id: parsedId } });
        });

        await prisma.auditLog.create({
            data: {
                action: 'DELETE',
                entity: 'LOCATION',
                entityId: parsedId,
                details: `Deleted location node: "${locationToDelete.name}" and purged associated media/hardware nodes.`,
                ipAddress: clientIp,
                userId: userId
            }
        });

        res.json({ success: true, message: "Location and associated infrastructure deleted successfully." });
    } catch (error) {
        console.error("Delete location error:", error);
        res.status(500).json({ success: false, message: "Failed to erase location from platform records." });
    }
};

// 5. DELETE A SINGLE LOCATION IMAGE
exports.deleteLocationImage = async (req, res) => {
    try {
        const { mediaId } = req.params;
        const parsedMediaId = parseInt(mediaId, 10);

        const mediaItem = await prisma.media.findUnique({
            where: { id: parsedMediaId }
        });

        if (!mediaItem) {
            return res.status(404).json({ success: false, message: "Target media asset not found." });
        }

        purgePhysicalFile(mediaItem.url);

        await prisma.media.delete({
            where: { id: parsedMediaId }
        });

        res.json({ success: true, message: "Media file deleted successfully." });
    } catch (error) {
        console.error("Image deletion execution error:", error);
        res.status(500).json({ success: false, message: "Failed to erase target media asset." });
    }
};