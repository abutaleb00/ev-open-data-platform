const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

// Helper Extraction Module: Pulls real client IP down behind proxies safely
const getClientIp = (req) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress;
};

// 1. PUBLIC COMPLIANCE FEED REGISTRY ENDPOINT
exports.getPublicFeed = async (req, res) => {
    try {
        const { search, companyId, page = 1, limit = 50, preview } = req.query;

        const parsedPage = Math.max(1, parseInt(page) || 1);
        const parsedLimit = Math.max(1, Math.min(100, parseInt(limit) || 50));
        const offset = (parsedPage - 1) * parsedLimit;

        // Establish compliance check boundaries
        const shouldFilterApproved = preview !== 'true';

        // Define root query filter criteria
        const whereClause = shouldFilterApproved ? { isApproved: true } : {};

        // Tenancy filter boundary integration
        if (companyId && !isNaN(parseInt(companyId))) {
            whereClause.companyId = parseInt(companyId);
        }

        // Apply dynamic parameter search mapping
        if (search && search.trim() !== '') {
            const searchString = search.trim();
            const parsedSearchId = parseInt(searchString);

            const orConditions = [
                { name: { contains: searchString } },
                { postcode: { contains: searchString } },
                { city: { contains: searchString } }
            ];

            if (!isNaN(parsedSearchId)) {
                orConditions.push({ id: parsedSearchId });
            }

            whereClause.AND = [
                {
                    OR: orConditions
                }
            ];
        }

        // Run sequential transactions safely over database indexes
        const [locations, totalCount] = await prisma.$transaction([
            prisma.location.findMany({
                where: whereClause,
                skip: offset,
                take: parsedLimit,
                include: {
                    chargePoints: {
                        include: { connectors: true }
                    },
                    media: {
                        select: { url: true, type: true }
                    },
                    company: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.location.count({ where: whereClause })
        ]);

        // Map database matrices down into highly resilient structural objects
        const ocpiFormattedData = locations.map(loc => {
            const relevantChargePoints = (loc.chargePoints || []).filter(cp => {
                if (!shouldFilterApproved) return true;
                return cp.isApproved === true;
            });

            // Safe String/JSON parsing fault blocks
            let parsedPublishAllowed = [];
            let parsedRelatedLocations = [];
            let parsedEnergyMix = null;

            try { if (loc.publishAllowedTo) parsedPublishAllowed = JSON.parse(loc.publishAllowedTo); } catch (_) { }
            try { if (loc.relatedLocations) parsedRelatedLocations = JSON.parse(loc.relatedLocations); } catch (_) { }
            try { if (loc.energyMix) parsedEnergyMix = JSON.parse(loc.energyMix); } catch (_) { }

            return {
                country_code: loc.countryCode || "GB",
                party_id: loc.partyId || "UNSET",
                id: `loc_${loc.id}`,
                publish: loc.publish ?? true,
                publish_allowed_to: Array.isArray(parsedPublishAllowed) ? parsedPublishAllowed : [],
                name: loc.name || "Unnamed Charging Hub",
                address: loc.address || "No Physical Address Registered",
                city: loc.city || "Unknown",
                postal_code: loc.postcode || "",
                state: loc.state || null,
                country: loc.countryISO || "GBR",
                coordinates: {
                    latitude: loc.latitude ? loc.latitude.toString() : "0.000000",
                    longitude: loc.longitude ? loc.longitude.toString() : "0.000000"
                },
                related_locations: Array.isArray(parsedRelatedLocations) ? parsedRelatedLocations : [],
                parking_type: loc.parkingType || "UNKNOWN",

                // Map Child Hardware metrics safely
                evses: relevantChargePoints.map(cp => {
                    let parsedEvseImages = [];
                    try { if (cp.evseImages) parsedEvseImages = JSON.parse(cp.evseImages); } catch (_) { }

                    return {
                        uid: cp.hardwareId ? `GB*${loc.partyId || 'CPO'}*E${cp.hardwareId}-1` : `GB*${loc.partyId || 'CPO'}*E${cp.id}-1`,
                        evse_id: cp.hardwareId || `GB*${loc.partyId || 'CPO'}*E${cp.id}`,
                        status: cp.status || "UNKNOWN",
                        status_schedule: cp.statusSchedule ? (typeof cp.statusSchedule === 'string' ? JSON.parse(cp.statusSchedule) : cp.statusSchedule) : [],
                        capabilities: cp.capabilities ? cp.capabilities.split(',').map(c => c.trim()) : ["REMOTE_START_STOP_CAPABLE"],
                        connectors: (cp.connectors || []).map(conn => ({
                            id: conn.id.toString(),
                            status: conn.status || "AVAILABLE",
                            standard: conn.standard || "IEC_62196_T2",
                            format: conn.format || "SOCKET",
                            power_type: conn.powerType || "AC_3_PHASE",
                            max_voltage: conn.voltage || 230,
                            max_amperage: conn.amperage || 32,
                            max_electric_power: conn.maxPowerKw ? Math.round(conn.maxPowerKw * 1000) : null,
                            tariff_ids: conn.tariffId ? [conn.tariffId.toString()] : [],
                            terms_and_conditions: conn.termsAndConditions || null,
                            last_updated: cp.updatedAt || new Date().toISOString(),
                            voltage: conn.voltage || 230,
                            amperage: conn.amperage || 32
                        })),
                        floor_level: cp.floorLevel || null,
                        // Pull dynamic overrides directly from db properties mapped in transaction updates
                        coordinates: cp.evseLatitude && cp.evseLongitude ? {
                            latitude: cp.evseLatitude.toString(),
                            longitude: cp.evseLongitude.toString()
                        } : null,
                        physical_reference: cp.hardwareId ? cp.hardwareId.slice(-6) : cp.id.toString(),
                        directions: cp.directions ? [{ language: "en", text: cp.directions }] : [],
                        parking_restrictions: cp.parkingRestrictions ? cp.parkingRestrictions.split(',').map(p => p.trim()) : [],
                        images: Array.isArray(parsedEvseImages) ? parsedEvseImages.map(img => ({
                            url: typeof img === 'string' ? img : img.url,
                            category: "CHARGER"
                        })) : [],
                        last_updated: cp.updatedAt || new Date().toISOString()
                    };
                }),

                directions: loc.directions ? [{ language: "en", text: loc.directions }] : [],
                operator: {
                    name: loc.company?.name || "Independent Operator"
                },
                suboperator: loc.suboperatorName ? {
                    name: loc.suboperatorName,
                    website: loc.suboperatorWebsite || null,
                    logo: loc.suboperatorLogoUrl ? { url: loc.suboperatorLogoUrl } : null
                } : null,
                owner: null,
                facilities: loc.amenities ? loc.amenities.split(',').map(f => f.trim()).filter(Boolean) : [],
                time_zone: loc.timeZone || "Europe/London",
                opening_times: {
                    twentyfourseven: true,
                    regular_hours: [],
                    exceptional_openings: [],
                    exceptional_closings: []
                },
                charging_when_closed: loc.chargingWhenClosed ?? true,
                images: (loc.media || []).map(m => ({
                    url: m.url,
                    type: m.type || "OTHER",
                    category: "ENTRANCE"
                })),

                // Return dynamic administrative JSON profile details
                energy_mix: parsedEnergyMix ? {
                    is_green_energy: parsedEnergyMix.is_green_energy ?? false,
                    supplier_name: parsedEnergyMix.supplier_name || null,
                    energy_product_name: parsedEnergyMix.energy_product_name || null
                } : null,

                last_updated: loc.updatedAt || new Date().toISOString(),
                location_point: {
                    type: "Point",
                    coordinates: [parseFloat(loc.longitude || 0), parseFloat(loc.latitude || 0)]
                }
            };
        });

        res.json({
            name: "OK",
            message: "ok",
            meta: {
                total_records: totalCount,
                current_page: parsedPage,
                limit_per_page: parsedLimit,
                total_pages: Math.ceil(totalCount / parsedLimit),
                timestamp: new Date().toISOString()
            },
            data: ocpiFormattedData
        });
    } catch (error) {
        console.error("OCPI data compilation fault:", error);
        res.status(500).json({ name: "ERROR", message: "Failed to compile compliance open data stream matrix." });
    }
};

// 2. Secured: Get developer API Keys for a company
exports.getCompanyKeys = async (req, res) => {
    try {
        const { role, companyId } = req.user;

        let whereClause = {};
        if (role !== 'SUPER_ADMIN') {
            if (!companyId) {
                return res.status(400).json({ success: false, message: "User account is not bound to an operator company profile." });
            }
            whereClause = { companyId: parseInt(companyId) };
        }

        const keys = await prisma.apiKey.findMany({
            where: whereClause,
            include: {
                company: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: keys });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to fetch credentials." });
    }
};

// 3. Secured: Generate a new API Key string
exports.generateApiKey = async (req, res) => {
    try {
        const { name, companyId: requestedCompanyId } = req.body;
        const { companyId, id: userId, role } = req.user;
        const clientIp = getClientIp(req);

        // Parse IDs safely while handling potential string or integer variants cleanly
        const parsedRequestedId = requestedCompanyId ? parseInt(requestedCompanyId) : null;
        const parsedUserCompanyId = companyId ? parseInt(companyId) : null;

        // Establish the target assignment based on permissions roles matrix
        let targetCompanyId = role === 'SUPER_ADMIN' ? parsedRequestedId : parsedUserCompanyId;

        // Explicit check against null, undefined, or failed conversion outcomes
        if (targetCompanyId === null || targetCompanyId === undefined || isNaN(targetCompanyId)) {
            return res.status(400).json({
                success: false,
                message: "A valid target Company ID context must be specified to provision API keys."
            });
        }

        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, message: "Key name label is required." });
        }

        const rawKey = `ev_live_${crypto.randomBytes(24).toString('hex')}`;

        const apiKeyRecord = await prisma.apiKey.create({
            data: {
                key: rawKey,
                name: name.trim(),
                companyId: targetCompanyId
            }
        });

        await prisma.auditLog.create({
            data: {
                action: 'CREATE',
                entity: 'API_KEY',
                entityId: apiKeyRecord.id,
                details: `Generated new API Access Token: "${name}"`,
                ipAddress: clientIp,
                userId: userId
            }
        });

        res.status(201).json({ success: true, data: apiKeyRecord });
    } catch (error) {
        console.error("API Key generation engine fault:", error);
        res.status(500).json({ success: false, message: "Failed to generate access key." });
    }
};

// 4. Public Endpoint: Expose approved tariffs with Filtering, Pagination, and Search
exports.getPublicTariffs = async (req, res) => {
    try {
        const { search, companyId, page = 1, limit = 50 } = req.query;

        const parsedPage = Math.max(1, parseInt(page));
        const parsedLimit = Math.max(1, Math.min(100, parseInt(limit)));
        const offset = (parsedPage - 1) * parsedLimit;

        const whereClause = {};

        if (companyId) {
            whereClause.companyId = parseInt(companyId);
        }

        if (search && search.trim() !== '') {
            const searchString = search.trim();
            whereClause.AND = [
                {
                    OR: [
                        { currency: { contains: searchString } },
                        { pricePerKwh: { contains: searchString } }
                    ]
                }
            ];
        }

        const [tariffs, totalCount] = await prisma.$transaction([
            prisma.tariff.findMany({
                where: whereClause,
                skip: offset,
                take: parsedLimit,
                orderBy: { id: 'desc' }
            }),
            prisma.tariff.count({ where: whereClause })
        ]);

        const ocpiTariffs = tariffs.map(t => ({
            id: t.id.toString(),
            currency: t.currency || "GBP",
            tariff_alt_text: [],
            elements: [
                {
                    price_components: [
                        {
                            type: "ENERGY",
                            price: parseFloat(t.pricePerKwh),
                            step_size: 1
                        }
                    ]
                }
            ],
            last_updated: t.createdAt || new Date().toISOString()
        }));

        res.json({
            name: "OK",
            message: "ok",
            meta: {
                total_records: totalCount,
                current_page: parsedPage,
                limit_per_page: parsedLimit,
                total_pages: Math.ceil(totalCount / parsedLimit),
                timestamp: new Date().toISOString()
            },
            data: ocpiTariffs
        });
    } catch (error) {
        console.error("Tariff matrix generation failure:", error);
        res.status(500).json({ name: "ERROR", message: "Failed to generate public compliance tariff feed matrix." });
    }
};

// 5. SECURED DASHBOARD PREVIEW: Expose ONLY the logged-in company's locations
exports.getDashboardFeedPreview = async (req, res) => {
    try {
        const { role, companyId } = req.user;
        const { search, page = 1, limit = 10 } = req.query;

        const parsedPage = Math.max(1, parseInt(page));
        const parsedLimit = Math.max(1, Math.min(100, parseInt(limit)));
        const offset = (parsedPage - 1) * parsedLimit;

        const whereClause = role === 'SUPER_ADMIN' ? {} : { companyId: parseInt(companyId) };

        // Apply fallback criteria if dynamic text searches are active
        if (search && search.trim() !== '') {
            const searchString = search.trim();
            const parsedSearchId = parseInt(searchString);

            // Build the query options matrix
            const orConditions = [
                { name: { contains: searchString } },
                { postcode: { contains: searchString } },
                { city: { contains: searchString } }
            ];

            // If the input search metric is a valid integer number, include direct primary key checking
            if (!isNaN(parsedSearchId)) {
                orConditions.push({ id: parsedSearchId });
            }

            whereClause.AND = [
                {
                    OR: orConditions
                }
            ];
        }

        const [locations, totalCount] = await prisma.$transaction([
            prisma.location.findMany({
                where: whereClause,
                skip: offset,
                take: parsedLimit,
                include: {
                    chargePoints: { include: { connectors: true } },
                    media: { select: { url: true, type: true } },
                    company: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.location.count({ where: whereClause })
        ]);

        const ocpiFormattedData = locations.map(loc => ({
            country_code: loc.countryCode,
            party_id: loc.partyId,
            id: `loc_${loc.id}`,
            publish: loc.publish,
            name: loc.name,
            address: loc.address,
            city: loc.city,
            postal_code: loc.postcode,
            coordinates: {
                latitude: loc.latitude ? loc.latitude.toString() : "0.000000",
                longitude: loc.longitude ? loc.longitude.toString() : "0.000000"
            },
            evses: (loc.chargePoints || []).map(cp => ({
                uid: `GB*${loc.partyId}*E${cp.hardwareId || cp.id}-1`,
                evse_id: `GB*${loc.partyId}*E${cp.hardwareId || cp.id}`,
                status: cp.status,
                connectors: (cp.connectors || []).map(conn => ({
                    id: conn.id.toString(),
                    status: conn.status || "AVAILABLE",
                    standard: conn.standard,
                    format: conn.format,
                    power_type: conn.powerType,
                    max_electric_power: conn.maxPowerKw ? parseInt(conn.maxPowerKw) : null,
                    tariff_ids: conn.tariffId ? [conn.tariffId.toString()] : []
                }))
            })),
            operator: { name: loc.company?.name || "Independent Operator" }
        }));

        res.json({
            success: true,
            meta: { total_records: totalCount, total_pages: Math.ceil(totalCount / parsedLimit) },
            data: ocpiFormattedData
        });
    } catch (error) {
        console.error("Dashboard preview feed compiling exception:", error);
        res.status(500).json({ success: false, message: "Failed to compile localized tenant data preview matrix." });
    }
};

// 6. SECURED DASHBOARD PREVIEW: Expose ONLY the logged-in company's tariffs
exports.getDashboardTariffsPreview = async (req, res) => {
    try {
        const { role, companyId } = req.user;
        const { page = 1, limit = 10 } = req.query;

        const parsedPage = Math.max(1, parseInt(page));
        const parsedLimit = Math.max(1, Math.min(100, parseInt(limit)));
        const offset = (parsedPage - 1) * parsedLimit;

        const whereClause = role === 'SUPER_ADMIN' ? {} : { companyId: parseInt(companyId) };

        const [tariffs, totalCount] = await prisma.$transaction([
            prisma.tariff.findMany({
                where: whereClause,
                skip: offset,
                take: parsedLimit,
                orderBy: { id: 'desc' }
            }),
            prisma.tariff.count({ where: whereClause })
        ]);

        const ocpiTariffs = tariffs.map(t => ({
            id: t.id.toString(),
            currency: t.currency || "GBP",
            elements: [
                {
                    price_components: [
                        { type: "ENERGY", price: parseFloat(t.pricePerKwh), step_size: 1 }
                    ]
                }
            ],
            last_updated: t.createdAt
        }));

        res.json({
            success: true,
            meta: { total_records: totalCount, total_pages: Math.ceil(totalCount / parsedLimit) },
            data: ocpiTariffs
        });
    } catch (error) {
        console.error("Dashboard tariff preview compilation exception:", error);
        res.status(500).json({ success: false, message: "Failed to compile localized tenant tariff preview matrix." });
    }
};

// 7. EXTERNAL PARTNER DATA INGESTION: Securely maps and syncs automated third-party data feeds
exports.ingestExternalData = async (req, res) => {
    try {
        const locations = req.body.data;
        const companyId = req.partnerCompanyId;

        if (!Array.isArray(locations)) {
            return res.status(400).json({ success: false, message: "Invalid payload layout: 'data' node must be an array context." });
        }

        for (const loc of locations) {
            // Strip any non-numeric custom prefixes (like "loc_") if their ID maps as a mixed token string
            const cleanedLocId = typeof loc.id === 'string' ? parseInt(loc.id.replace(/^\D+/g, '')) : parseInt(loc.id);

            if (!cleanedLocId || isNaN(cleanedLocId)) {
                continue; // Skip execution line if root indexing target is missing or corrupt
            }

            // Sync Core Location Record: Map fields explicitly, leaving portal properties un-overwritten
            const savedLocation = await prisma.location.upsert({
                where: { id: cleanedLocId },
                update: {
                    name: loc.name,
                    address: loc.address,
                    postcode: loc.postal_code || "",
                    latitude: parseFloat(loc.coordinates?.latitude || 0),
                    longitude: parseFloat(loc.coordinates?.longitude || 0),
                    city: loc.city || "Unknown City",
                    state: loc.state || null,
                    countryCode: loc.country_code || "GB",
                    countryISO: loc.country || "GBR",
                    publish: loc.publish ?? true
                },
                create: {
                    id: cleanedLocId,
                    name: loc.name,
                    address: loc.address,
                    postcode: loc.postal_code || "",
                    latitude: parseFloat(loc.coordinates?.latitude || 0),
                    longitude: parseFloat(loc.coordinates?.longitude || 0),
                    city: loc.city || "Unknown City",
                    state: loc.state || null,
                    countryCode: loc.country_code || "GB",
                    countryISO: loc.country || "GBR",
                    publish: loc.publish ?? true,
                    companyId: companyId,
                    isApproved: true // Automatically approve imported automated rows
                }
            });

            // Process dynamic EVSE infrastructure chains
            if (loc.evses && Array.isArray(loc.evses)) {
                for (const evse of loc.evses) {
                    if (!evse.evse_id) continue;

                    const savedChargePoint = await prisma.chargePoint.upsert({
                        where: { hardwareId: evse.evse_id },
                        update: {
                            status: (evse.status || "UNKNOWN").toUpperCase(),
                            locationId: savedLocation.id
                        },
                        create: {
                            hardwareId: evse.evse_id,
                            status: (evse.status || "UNKNOWN").toUpperCase(),
                            locationId: savedLocation.id,
                            isApproved: true,
                            capabilities: evse.capabilities && Array.isArray(evse.capabilities) ? evse.capabilities.join(',') : "REMOTE_START_STOP_CAPABLE"
                        }
                    });

                    // Clear and resync underlying Connector profiles to maintain clean state mappings
                    if (evse.connectors && Array.isArray(evse.connectors)) {
                        await prisma.connector.deleteMany({
                            where: { chargePointId: savedChargePoint.id }
                        });

                        for (const conn of evse.connectors) {
                            // Safely convert power structures down to Kw from raw watt metric values
                            const parsedPowerKw = conn.max_electric_power ? parseFloat(conn.max_electric_power) / 1000 : 7.4;

                            await prisma.connector.create({
                                data: {
                                    chargePointId: savedChargePoint.id,
                                    type: (conn.power_type || "AC_3_PHASE").includes("DC") ? "DC" : "AC",
                                    maxPowerKw: parsedPowerKw,
                                    status: evse.status === "Available" ? "AVAILABLE" : "UNKNOWN",
                                    standard: conn.standard || "IEC_62196_T2",
                                    format: (conn.format || "SOCKET").toUpperCase(),
                                    powerType: conn.power_type || "AC_3_PHASE",
                                    voltage: parseInt(conn.max_voltage) || 230,
                                    amperage: parseInt(conn.max_amperage) || 32
                                }
                            });
                        }
                    }
                }
            }
        }

        return res.status(200).json({ success: true, message: "Data ingestion sequence completed successfully.", processedCount: locations.length });
    } catch (error) {
        console.error("Partner pipeline sync critical crash:", error);
        return res.status(500).json({ success: false, message: "Internal application transaction processing error." });
    }
};

// 8. PORTAL ADMIN ENDPOINT: Complete spreadsheet-mapped open data metadata update
exports.updateLocationMetadata = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, companyId } = req.user;
        const locationId = parseInt(id);

        if (isNaN(locationId)) {
            return res.status(400).json({ success: false, message: "Invalid location ID format." });
        }

        // 1. Fetch location to verify tenancy ownership
        const existingLocation = await prisma.location.findUnique({
            where: { id: locationId }
        });

        if (!existingLocation) {
            return res.status(404).json({ success: false, message: "Location not found." });
        }

        if (role !== 'SUPER_ADMIN' && existingLocation.companyId !== parseInt(companyId)) {
            return res.status(403).json({ success: false, message: "Forbidden: Access denied." });
        }

        // 2. Destructure all explicitly required editable properties
        const {
            // Location-Level Properties
            publish,
            publishAllowedTo,
            latitude,
            longitude,
            relatedLocations,
            parkingType,
            directions,
            suboperatorName,
            suboperatorWebsite,
            suboperatorLogoUrl,
            chargingWhenClosed,
            energyMix,
            amenities,
            images, // Array of location images strings or objects

            // Child EVSE-Level Updates Array
            evses
        } = req.body;

        // 3. Execute all updates inside an isolated transactional database pipeline
        await prisma.$transaction(async (tx) => {

            // A. Update the parent location parameters
            await tx.location.update({
                where: { id: locationId },
                data: {
                    publish: publish ?? existingLocation.publish,
                    publishAllowedTo: publishAllowedTo !== undefined ? JSON.stringify(publishAllowedTo) : existingLocation.publishAllowedTo,
                    latitude: latitude !== undefined ? parseFloat(latitude) : existingLocation.latitude,
                    longitude: longitude !== undefined ? parseFloat(longitude) : existingLocation.longitude,
                    relatedLocations: relatedLocations !== undefined ? JSON.stringify(relatedLocations) : existingLocation.relatedLocations,
                    parkingType: parkingType !== undefined ? parkingType : existingLocation.parkingType,
                    directions: directions !== undefined ? directions : existingLocation.directions,
                    suboperatorName: suboperatorName !== undefined ? suboperatorName : existingLocation.suboperatorName,
                    suboperatorWebsite: suboperatorWebsite !== undefined ? suboperatorWebsite : existingLocation.suboperatorWebsite,
                    suboperatorLogoUrl: suboperatorLogoUrl !== undefined ? suboperatorLogoUrl : existingLocation.suboperatorLogoUrl,
                    chargingWhenClosed: chargingWhenClosed ?? existingLocation.chargingWhenClosed,
                    amenities: amenities !== undefined ? amenities : existingLocation.amenities,
                    energyMix: energyMix !== undefined ? JSON.stringify(energyMix) : existingLocation.energyMix,

                    // Sync location-level media references if your schema uses a separate media array table
                    ...(images !== undefined && {
                        media: {
                            deleteMany: {},
                            create: images.map(img => ({ url: typeof img === 'string' ? img : img.url, type: 'OTHER' }))
                        }
                    })
                }
            });

            // B. Process child EVSE updates if supplied in the form payload array
            if (evses && Array.isArray(evses)) {
                for (const evseItem of evses) {
                    // Match child using either technical autoincrement ID or unique EVSE token string
                    await tx.chargePoint.updateMany({
                        where: {
                            locationId: locationId,
                            OR: [
                                { id: !isNaN(parseInt(evseItem.id)) ? parseInt(evseItem.id) : -1 },
                                { hardwareId: evseItem.evse_id }
                            ]
                        },
                        data: {
                            floorLevel: evseItem.floor_level !== undefined ? evseItem.floor_level : undefined,
                            parkingRestrictions: evseItem.parking_restrictions !== undefined ? evseItem.parking_restrictions : undefined,

                            // Map coordinates or custom nested EVSE objects as text/JSON based on your DB columns
                            ...(evseItem.latitude && { evseLatitude: parseFloat(evseItem.latitude) }),
                            ...(evseItem.longitude && { evseLongitude: parseFloat(evseItem.longitude) }),
                            ...(evseItem.directions && { directions: evseItem.directions }),
                            ...(evseItem.images && { evseImages: JSON.stringify(evseItem.images) })
                        }
                    });
                }
            }
        });

        // 4. Record audit tracking entry
        const clientIp = getClientIp(req);
        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'LOCATION_METADATA',
                entityId: locationId,
                details: `Admin enriched all required open data columns for location ID: ${locationId}`,
                ipAddress: clientIp,
                userId: req.user.id
            }
        });

        return res.status(200).json({ success: true, message: "All specified open data settings applied." });
    } catch (error) {
        console.error("Portal multi-field metadata sync crash:", error);
        return res.status(500).json({ success: false, message: "Internal server error applying complete profile update." });
    }
};

// PATCH: Partial update for location fields
// PATCH: Partial update for location fields
exports.patchExternalLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const locationId = parseInt(id);

        if (isNaN(locationId)) {
            return res.status(400).json({ success: false, message: "Invalid location ID format." });
        }

        // Destructure to separate special fields that need formatting
        const {
            directions,
            relatedLocations,
            publishAllowedTo,
            energyMix,
            latitude,
            longitude,
            ...otherFields
        } = req.body;

        const updateData = { ...otherFields };

        // Handle directions (Convert Array/Object to String if needed)
        if (directions !== undefined) {
            if (Array.isArray(directions)) {
                // Extracts the text property if passed as [{ language: "en", text: "..." }]
                updateData.directions = directions.length > 0 ? (directions[0].text || JSON.stringify(directions)) : null;
            } else if (typeof directions === 'object' && directions !== null) {
                updateData.directions = directions.text || JSON.stringify(directions);
            } else {
                updateData.directions = directions;
            }
        }

        // Stringify JSON structures if provided as Objects/Arrays
        if (relatedLocations !== undefined) {
            updateData.relatedLocations = typeof relatedLocations === 'object' ? JSON.stringify(relatedLocations) : relatedLocations;
        }

        if (publishAllowedTo !== undefined) {
            updateData.publishAllowedTo = typeof publishAllowedTo === 'object' ? JSON.stringify(publishAllowedTo) : publishAllowedTo;
        }

        if (energyMix !== undefined) {
            updateData.energyMix = typeof energyMix === 'object' ? JSON.stringify(energyMix) : energyMix;
        }

        // Ensure numbers are properly parsed for coordinates
        if (latitude !== undefined) updateData.latitude = parseFloat(latitude);
        if (longitude !== undefined) updateData.longitude = parseFloat(longitude);

        const updatedLocation = await prisma.location.update({
            where: { id: locationId },
            data: updateData
        });

        return res.status(200).json({
            success: true,
            message: "Location updated successfully.",
            data: updatedLocation
        });
    } catch (error) {
        console.error("Delta location update error:", error);
        return res.status(500).json({ success: false, message: "Failed to apply location update." });
    }
};

// PATCH: Partial update for EVSE status / properties
exports.patchExternalEvse = async (req, res) => {
    try {
        const { evseId } = req.params;

        // Matches hardwareId string (e.g., "*Ada*EGBEV0667A") or autoincrement ID
        const updatedEvse = await prisma.chargePoint.updateMany({
            where: {
                OR: [
                    { hardwareId: evseId },
                    { id: !isNaN(parseInt(evseId)) ? parseInt(evseId) : -1 }
                ]
            },
            data: { ...req.body }
        });

        return res.status(200).json({ success: true, message: "EVSE updated successfully.", data: updatedEvse });
    } catch (error) {
        console.error("Delta EVSE update error:", error);
        return res.status(500).json({ success: false, message: "Failed to apply EVSE update." });
    }
};

// PATCH: Partial update for Connectors / Tariffs
exports.patchExternalConnector = async (req, res) => {
    try {
        const { connectorId } = req.params;
        const parsedConnectorId = parseInt(connectorId);

        if (isNaN(parsedConnectorId)) {
            return res.status(400).json({ success: false, message: "Invalid connector ID format." });
        }

        const { tariff_ids, tariffId, status, max_power_kw, maxPowerKw, ...otherFields } = req.body;

        const updateData = { ...otherFields };

        // Handle Connector Status
        if (status !== undefined) {
            updateData.status = status;
        }

        // Handle tariff assignment (supports both 'tariffId': 5 or 'tariff_ids': ["5"])
        if (tariffId !== undefined) {
            updateData.tariffId = parseInt(tariffId);
        } else if (Array.isArray(tariff_ids) && tariff_ids.length > 0) {
            updateData.tariffId = parseInt(tariff_ids[0]);
        }

        // Handle Power Kw
        if (maxPowerKw !== undefined) updateData.maxPowerKw = parseFloat(maxPowerKw);
        if (max_power_kw !== undefined) updateData.maxPowerKw = parseFloat(max_power_kw);

        const updatedConnector = await prisma.connector.update({
            where: { id: parsedConnectorId },
            data: updateData
        });

        return res.status(200).json({
            success: true,
            message: "Connector updated successfully.",
            data: updatedConnector
        });
    } catch (error) {
        console.error("Delta connector update error:", error);
        return res.status(500).json({ success: false, message: "Failed to apply connector update." });
    }
};