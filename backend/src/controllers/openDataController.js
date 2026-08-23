const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

const getClientIp = (req) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress;
};

// Helper 1: Safely parses JSON string columns without crashing
const safeJsonParse = (str) => {
    if (!str) return null;
    try {
        return JSON.parse(str);
    } catch (_) {
        return str;
    }
};
const parseNumericId = (val) => {
    if (!val) return null;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/^\D+/g, '');
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? null : parsed;
};

// 1. PUBLIC OPEN DATA FEED
exports.getPublicFeed = async (req, res) => {
    try {
        const { search, companyId, operator_reference_id, page = 1, limit = 50, preview } = req.query;

        const parsedPage = Math.max(1, parseInt(page, 10) || 1);
        const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
        const offset = (parsedPage - 1) * parsedLimit;

        const shouldFilterApproved = preview !== 'true';
        const whereClause = shouldFilterApproved ? { isApproved: true } : {};

        if (operator_reference_id) {
            whereClause.OR = [
                { operatorReferenceId: String(operator_reference_id) },
                { company: { operatorReferenceId: String(operator_reference_id) } }
            ];
        }

        if (companyId && !isNaN(parseInt(companyId, 10))) {
            whereClause.companyId = parseInt(companyId, 10);
        }

        if (search && search.trim() !== '') {
            const searchString = search.trim();
            const parsedSearchId = parseNumericId(searchString);

            const orConditions = [
                { name: { contains: searchString } },
                { postcode: { contains: searchString } },
                { city: { contains: searchString } }
            ];

            if (parsedSearchId !== null) {
                orConditions.push({ id: parsedSearchId });
            }

            whereClause.AND = [{ OR: orConditions }];
        }

        const [locations, totalCount] = await prisma.$transaction([
            prisma.location.findMany({
                where: whereClause,
                skip: offset,
                take: parsedLimit,
                include: {
                    chargePoints: {
                        include: { connectors: true }
                    },
                    media: { select: { url: true, type: true } },
                    company: { select: { name: true, operatorReferenceId: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.location.count({ where: whereClause })
        ]);

        const ocpiFormattedData = locations.map(loc => {
            const relevantChargePoints = (loc.chargePoints || []).filter(cp => {
                if (!shouldFilterApproved) return true;
                return cp.isApproved === true;
            });

            // Parse stored JSON payload strings
            let parsedPublishAllowed = null;
            let parsedRelatedLocations = null;
            let parsedEnergyMix = null;
            let parsedOperator = null;
            let parsedSuboperator = null;
            let parsedOwner = null;
            let parsedOpeningTimes = null;
            let parsedDirections = [];

            try { if (loc.publishAllowedTo) parsedPublishAllowed = JSON.parse(loc.publishAllowedTo); } catch (_) { }
            try { if (loc.relatedLocations) parsedRelatedLocations = JSON.parse(loc.relatedLocations); } catch (_) { }
            try { if (loc.energyMix) parsedEnergyMix = JSON.parse(loc.energyMix); } catch (_) { }
            try { if (loc.operatorData) parsedOperator = JSON.parse(loc.operatorData); } catch (_) { }
            try { if (loc.suboperatorData) parsedSuboperator = JSON.parse(loc.suboperatorData); } catch (_) { }
            try { if (loc.ownerData) parsedOwner = JSON.parse(loc.ownerData); } catch (_) { }
            try { if (loc.openingTimesData) parsedOpeningTimes = JSON.parse(loc.openingTimesData); } catch (_) { }
            try { if (loc.directions) parsedDirections = JSON.parse(loc.directions); } catch (_) { }

            return {
                country_code: loc.countryCode || "GB",
                party_id: loc.partyId || "Ada",
                id: loc.locationUid || `loc_${loc.id}`,
                publish: loc.publish ?? true,
                publish_allowed_to: parsedPublishAllowed,
                name: loc.name || "",
                address: loc.address || "",
                city: loc.city || "",
                postal_code: loc.postcode || "",
                state: loc.state || null,
                country: loc.countryISO || "United Kingdom",
                coordinates: {
                    latitude: loc.latitude ? loc.latitude.toString() : "0.000000",
                    longitude: loc.longitude ? loc.longitude.toString() : "0.000000"
                },
                related_locations: parsedRelatedLocations,
                parking_type: loc.parkingType || "ON_STREET",

                evses: relevantChargePoints.map(cp => {
                    let parsedEvseImages = [];
                    let parsedEvseDirections = [];
                    let parsedStatusSchedule = null;

                    try { if (cp.evseImages) parsedEvseImages = JSON.parse(cp.evseImages); } catch (_) { }
                    try { if (cp.directions) parsedEvseDirections = JSON.parse(cp.directions); } catch (_) { }
                    try { if (cp.statusSchedule) parsedStatusSchedule = JSON.parse(cp.statusSchedule); } catch (_) { }

                    return {
                        uid: cp.evseUid || cp.hardwareId || cp.id.toString(),
                        evse_id: cp.hardwareId || cp.id.toString(),
                        status: cp.status || "Available",
                        status_schedule: parsedStatusSchedule,
                        capabilities: cp.capabilities ? cp.capabilities.split(',').map(c => c.trim()) : ["REMOTE_START_STOP_CAPABLE"],
                        connectors: (cp.connectors || []).map(conn => {
                            let parsedTariffIds = [];
                            try { if (conn.tariffIdsJson) parsedTariffIds = JSON.parse(conn.tariffIdsJson); } catch (_) { }

                            return {
                                id: conn.connectorUid || conn.id.toString(),
                                standard: conn.standard || "IEC_62196_T2",
                                format: conn.format || "Socket",
                                power_type: conn.powerType || "AC_3_PHASE",
                                max_voltage: conn.voltage !== null && conn.voltage !== undefined ? conn.voltage : 440,
                                max_amperage: conn.amperage !== null && conn.amperage !== undefined ? conn.amperage : 32,
                                max_electric_power: conn.maxPowerKw ? Math.round(conn.maxPowerKw * 1000) : 22000,
                                tariff_ids: parsedTariffIds,
                                terms_and_conditions: conn.termsAndConditions !== null ? conn.termsAndConditions : "",
                                last_updated: cp.updatedAt ? cp.updatedAt.toISOString() : new Date().toISOString()
                            };
                        }),
                        floor_level: cp.floorLevel || "",
                        coordinates: cp.evseLatitude && cp.evseLongitude ? {
                            latitude: cp.evseLatitude.toString(),
                            longitude: cp.evseLongitude.toString()
                        } : {
                            latitude: loc.latitude ? loc.latitude.toString() : "0.000000",
                            longitude: loc.longitude ? loc.longitude.toString() : "0.000000"
                        },
                        physical_reference: cp.physicalReference || "",
                        directions: Array.isArray(parsedEvseDirections) ? parsedEvseDirections : [],
                        parking_restrictions: cp.parkingRestrictions ? cp.parkingRestrictions.split(',').map(p => p.trim()) : [],
                        images: Array.isArray(parsedEvseImages) ? parsedEvseImages : []
                    };
                }),

                directions: Array.isArray(parsedDirections) ? parsedDirections : [],
                operator: parsedOperator || { name: loc.company?.name || "Adam Street Ltd" },
                suboperator: parsedSuboperator,
                owner: parsedOwner,
                facilities: loc.amenities ? loc.amenities.split(',').map(f => f.trim()).filter(Boolean) : [],
                time_zone: loc.timeZone || "Europe/London",
                opening_times: parsedOpeningTimes || {
                    twentyfourseven: false,
                    regular_hours: [],
                    exceptional_openings: null,
                    exceptional_closings: null
                },
                charging_when_closed: loc.chargingWhenClosed ?? false,
                images: (loc.media || []).map(m => ({
                    url: m.url,
                    type: m.type || "OTHER",
                    category: "ENTRANCE"
                })),
                energy_mix: parsedEnergyMix || {
                    is_green_energy: null,
                    energy_sources: null,
                    supplier_name: null,
                    energy_product_name: null
                },
                last_updated: loc.updatedAt ? loc.updatedAt.toISOString() : new Date().toISOString()
            };
        });

        res.json({
            name: "Location",
            operator_reference_id: operator_reference_id || null,
            message: "Success",
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
        console.error("OCPI feed error:", error);
        res.status(500).json({ name: "ERROR", message: "Failed to compile compliance open data stream." });
    }
};

exports.getDashboardFeedPreview = async (req, res) => {
    try {
        const { role, companyId } = req.user;
        const { search, page = 1, limit = 10 } = req.query;

        const parsedPage = Math.max(1, parseInt(page, 10));
        const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10)));
        const offset = (parsedPage - 1) * parsedLimit;

        const whereClause = role === 'SUPER_ADMIN' ? {} : { companyId: parseInt(companyId, 10) };

        if (search && search.trim() !== '') {
            const searchString = search.trim();
            const parsedSearchId = parseNumericId(searchString);

            const orConditions = [
                { name: { contains: searchString } },
                { postcode: { contains: searchString } },
                { city: { contains: searchString } },
                { locationUid: { contains: searchString } },
                { operatorReferenceId: { contains: searchString } }
            ];

            if (parsedSearchId !== null) {
                orConditions.push({ id: parsedSearchId });
            }

            whereClause.AND = [{ OR: orConditions }];
        }

        const [locations, totalCount] = await prisma.$transaction([
            prisma.location.findMany({
                where: whereClause,
                skip: offset,
                take: parsedLimit,
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
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.location.count({ where: whereClause })
        ]);

        const ocpiFormattedData = locations.map(loc => {
            const parsedOperator = safeJsonParse(loc.operatorData);
            const parsedOwner = safeJsonParse(loc.ownerData);
            const parsedSuboperator = safeJsonParse(loc.suboperatorData);
            const parsedOpeningTimes = safeJsonParse(loc.openingTimesData);
            const parsedDirections = safeJsonParse(loc.directions);
            const parsedRelatedLocations = safeJsonParse(loc.relatedLocations);
            const parsedPublishAllowedTo = safeJsonParse(loc.publishAllowedTo);
            const parsedEnergyMix = safeJsonParse(loc.energyMix);

            const formattedImages = loc.media && loc.media.length > 0
                ? loc.media.map(m => ({ url: m.url, category: m.category || "ENTRANCE", type: m.type || "image/jpeg" }))
                : [];

            return {
                country_code: loc.countryCode || "GB",
                party_id: loc.partyId || "Ada",
                id: loc.locationUid || `loc_${loc.id}`,
                publish: loc.publish ?? true,
                name: loc.name || "",
                address: loc.address || "",
                city: loc.city || "",
                state: loc.state || null,
                postal_code: loc.postcode || "",
                country: loc.countryISO || "United Kingdom",
                coordinates: {
                    latitude: loc.latitude ? loc.latitude.toString() : "0.000000",
                    longitude: loc.longitude ? loc.longitude.toString() : "0.000000"
                },
                parking_type: loc.parkingType || "UNKNOWN",
                time_zone: loc.timeZone || "Europe/London",
                facilities: loc.amenities ? loc.amenities.split(',').map(a => a.trim()) : [],
                charging_when_closed: loc.chargingWhenClosed,
                opening_times: parsedOpeningTimes,
                directions: Array.isArray(parsedDirections) ? parsedDirections : [],
                related_locations: parsedRelatedLocations,
                publish_allowed_to: parsedPublishAllowedTo,
                energy_mix: parsedEnergyMix,
                images: formattedImages,

                operator: parsedOperator || { name: loc.company?.name || "Independent Operator" },
                suboperator: parsedSuboperator,
                owner: parsedOwner,

                evses: (loc.chargePoints || []).map(cp => {
                    const parsedEvseDirections = safeJsonParse(cp.directions);
                    const parsedEvseImages = safeJsonParse(cp.evseImages);
                    const parsedStatusSchedule = safeJsonParse(cp.statusSchedule);

                    return {
                        uid: cp.evseUid || cp.hardwareId || cp.id.toString(),
                        evse_id: cp.hardwareId || cp.id.toString(),
                        status: cp.status || "AVAILABLE",
                        floor_level: cp.floorLevel || "",
                        physical_reference: cp.physicalReference || null,
                        status_schedule: parsedStatusSchedule,
                        parking_restrictions: cp.parkingRestrictions ? cp.parkingRestrictions.split(',').map(p => p.trim()) : [],
                        capabilities: cp.capabilities ? cp.capabilities.split(',').map(c => c.trim()) : [],
                        directions: Array.isArray(parsedEvseDirections) ? parsedEvseDirections : [],
                        images: Array.isArray(parsedEvseImages) ? parsedEvseImages : [],
                        coordinates: (cp.evseLatitude && cp.evseLongitude) ? {
                            latitude: cp.evseLatitude.toString(),
                            longitude: cp.evseLongitude.toString()
                        } : undefined,

                        connectors: (cp.connectors || []).map(conn => {
                            const parsedTariffIds = safeJsonParse(conn.tariffIdsJson);
                            return {
                                id: conn.connectorUid || conn.id.toString(),
                                status: conn.status || "AVAILABLE",
                                standard: conn.standard || "IEC_62196_T2",
                                format: conn.format || "SOCKET",
                                power_type: conn.powerType || "AC_3_PHASE",
                                max_voltage: conn.voltage || 230,
                                max_amperage: conn.amperage || 32,
                                max_electric_power: conn.maxPowerKw ? Math.round(conn.maxPowerKw * 1000) : 22000,
                                terms_and_conditions: conn.termsAndConditions || "",
                                tariff_ids: Array.isArray(parsedTariffIds) ? parsedTariffIds : (conn.tariffId ? [conn.tariffId.toString()] : [])
                            };
                        })
                    };
                })
            };
        });

        res.json({
            success: true,
            meta: {
                total_records: totalCount,
                total_pages: Math.ceil(totalCount / parsedLimit),
                current_page: parsedPage,
                limit: parsedLimit
            },
            data: ocpiFormattedData
        });
    } catch (error) {
        console.error("Dashboard feed preview error:", error);
        res.status(500).json({ success: false, message: "Failed to compile tenant preview matrix." });
    }
};

// ------------------------------------------------------
// 2. REAL-TIME TRAFFIC METRICS & AUDIT LOGS
// ------------------------------------------------------
exports.getTrafficMetrics = async (req, res) => {
    try {
        const { role, companyId } = req.user;
        const { days = 7, limit = 50, operator_reference_id } = req.query;

        const parsedDays = Math.max(1, parseInt(days, 10));
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parsedDays);

        const whereClause = { createdAt: { gte: startDate } };

        if (role !== 'SUPER_ADMIN') {
            const userCompany = await prisma.company.findUnique({
                where: { id: parseInt(companyId, 10) },
                select: { operatorReferenceId: true }
            });
            if (userCompany && userCompany.operatorReferenceId) {
                whereClause.operatorReferenceId = userCompany.operatorReferenceId;
            }
        } else if (operator_reference_id && String(operator_reference_id).trim() !== '') {
            whereClause.operatorReferenceId = String(operator_reference_id).trim();
        }

        // Execute parallel query transaction
        const [
            totalRequests,
            statusDistribution,
            topIPs,
            recentLogs
        ] = await prisma.$transaction([
            // 1. Total Requests Count
            prisma.requestLog.count({ where: whereClause }),

            // 2. HTTP Status Code Breakdown Grouping
            prisma.requestLog.groupBy({
                by: ['statusCode'],
                where: whereClause,
                _count: { statusCode: true }
            }),

            // 3. Top Client IPs Grouping
            prisma.requestLog.groupBy({
                by: ['ipAddress'],
                where: whereClause,
                _count: { ipAddress: true },
                orderBy: { _count: { ipAddress: 'desc' } },
                take: 10
            }),

            // 4. Recent Logs Stream
            prisma.requestLog.findMany({
                where: whereClause,
                take: Math.min(100, parseInt(limit, 10)),
                orderBy: { createdAt: 'desc' }
            })
        ]);

        // Map status code counts into a lookup dictionary
        const statusMap = {};
        statusDistribution.forEach(item => {
            statusMap[item.statusCode] = item._count.statusCode;
        });

        const rateLimitedCount = statusMap[429] || 0;
        const successCount = (statusMap[200] || 0) + (statusMap[201] || 0);

        return res.json({
            success: true,
            summary: {
                timeframe_days: parsedDays,
                total_requests: totalRequests,
                rate_limited_requests: rateLimitedCount,
                success_requests: successCount,
                status_breakdown: statusMap
            },
            top_client_ips: topIPs.map(i => ({
                ip: i.ipAddress || '127.0.0.1',
                count: i._count.ipAddress
            })),
            recent_logs: recentLogs.map(log => ({
                id: log.id,
                ip: log.ipAddress || '127.0.0.1',
                endpoint: log.endpoint,
                method: log.method,
                status_code: log.statusCode,
                user_agent: log.userAgent,
                timestamp: log.createdAt
            }))
        });
    } catch (error) {
        console.error("Traffic metrics error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch traffic metrics." });
    }
};

// 4. GET COMPANY API KEYS
exports.getCompanyKeys = async (req, res) => {
    try {
        const { role, companyId } = req.user;

        let whereClause = {};
        if (role !== 'SUPER_ADMIN') {
            if (!companyId) {
                return res.status(400).json({ success: false, message: "User account is not bound to a company profile." });
            }
            whereClause = { companyId: parseInt(companyId, 10) };
        }

        const keys = await prisma.apiKey.findMany({
            where: whereClause,
            include: { company: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: keys });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to fetch credentials." });
    }
};

// 5. GENERATE API KEY
exports.generateApiKey = async (req, res) => {
    try {
        const { name, companyId: requestedCompanyId } = req.body;
        const { companyId, id: userId, role } = req.user;
        const clientIp = getClientIp(req);

        const parsedRequestedId = requestedCompanyId ? parseInt(requestedCompanyId, 10) : null;
        const parsedUserCompanyId = companyId ? parseInt(companyId, 10) : null;

        let targetCompanyId = role === 'SUPER_ADMIN' ? parsedRequestedId : parsedUserCompanyId;

        if (!targetCompanyId || isNaN(targetCompanyId)) {
            return res.status(400).json({
                success: false,
                message: "A valid target Company ID context must be specified."
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
        console.error("API Key generation error:", error);
        res.status(500).json({ success: false, message: "Failed to generate access key." });
    }
};

// 6. GET PUBLIC TARIFFS
exports.getPublicTariffs = async (req, res) => {
    try {
        const { search, companyId, page = 1, limit = 50 } = req.query;

        const parsedPage = Math.max(1, parseInt(page, 10));
        const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10)));
        const offset = (parsedPage - 1) * parsedLimit;

        const whereClause = {};

        if (companyId) {
            whereClause.companyId = parseInt(companyId, 10);
        }

        if (search && search.trim() !== '') {
            whereClause.currency = { contains: search.trim() };
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
        console.error("Public tariff error:", error);
        res.status(500).json({ name: "ERROR", message: "Failed to generate public tariff feed." });
    }
};

// 7. GET DASHBOARD TARIFFS PREVIEW
exports.getDashboardTariffsPreview = async (req, res) => {
    try {
        const { role, companyId } = req.user;
        const { page = 1, limit = 10 } = req.query;

        const parsedPage = Math.max(1, parseInt(page, 10));
        const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10)));
        const offset = (parsedPage - 1) * parsedLimit;

        const whereClause = role === 'SUPER_ADMIN' ? {} : { companyId: parseInt(companyId, 10) };

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
        console.error("Dashboard tariff preview error:", error);
        res.status(500).json({ success: false, message: "Failed to compile tariff preview." });
    }
};

// 8. EXTERNAL INGESTION PIPELINE
exports.ingestExternalData = async (req, res) => {
    try {
        const locations = req.body.data;
        const companyId = req.partnerCompanyId;

        if (!Array.isArray(locations)) {
            return res.status(400).json({ success: false, message: "Invalid payload layout: 'data' must be an array." });
        }

        for (const loc of locations) {
            const cleanedLocId = parseNumericId(loc.id);

            if (!cleanedLocId) continue;

            const savedLocation = await prisma.location.upsert({
                where: { id: cleanedLocId },
                update: {
                    locationUid: String(loc.id),
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
                    locationUid: String(loc.id),
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
                    isApproved: true
                }
            });

            if (loc.evses && Array.isArray(loc.evses)) {
                for (const evse of loc.evses) {
                    const hardwareIdVal = evse.evse_id || evse.uid || evse.id;
                    if (!hardwareIdVal) continue;

                    const savedChargePoint = await prisma.chargePoint.upsert({
                        where: { hardwareId: String(hardwareIdVal) },
                        update: {
                            evseUid: evse.uid ? String(evse.uid) : null,
                            status: (evse.status || "UNKNOWN").toUpperCase(),
                            locationId: savedLocation.id
                        },
                        create: {
                            hardwareId: String(hardwareIdVal),
                            evseUid: evse.uid ? String(evse.uid) : null,
                            status: (evse.status || "UNKNOWN").toUpperCase(),
                            locationId: savedLocation.id,
                            isApproved: true,
                            capabilities: evse.capabilities && Array.isArray(evse.capabilities) ? evse.capabilities.join(',') : "REMOTE_START_STOP_CAPABLE"
                        }
                    });

                    if (evse.connectors && Array.isArray(evse.connectors)) {
                        await prisma.connector.deleteMany({
                            where: { chargePointId: savedChargePoint.id }
                        });

                        for (const conn of evse.connectors) {
                            const parsedPowerKw = conn.max_electric_power ? parseFloat(conn.max_electric_power) / 1000 : 7.4;

                            await prisma.connector.create({
                                data: {
                                    chargePointId: savedChargePoint.id,
                                    connectorUid: conn.id ? String(conn.id) : null,
                                    type: (conn.power_type || "AC_3_PHASE").includes("DC") ? "DC" : "AC",
                                    maxPowerKw: parsedPowerKw,
                                    status: evse.status === "Available" ? "AVAILABLE" : "UNKNOWN",
                                    standard: conn.standard || "IEC_62196_T2",
                                    format: (conn.format || "SOCKET").toUpperCase(),
                                    powerType: conn.power_type || "AC_3_PHASE",
                                    voltage: parseInt(conn.max_voltage, 10) || 230,
                                    amperage: parseInt(conn.max_amperage, 10) || 32
                                }
                            });
                        }
                    }
                }
            }
        }

        return res.status(200).json({ success: true, message: "Data ingestion sequence completed successfully.", processedCount: locations.length });
    } catch (error) {
        console.error("Partner pipeline sync error:", error);
        return res.status(500).json({ success: false, message: "Internal server error processing ingestion payload." });
    }
};

// 9. PORTAL ADMIN METADATA ENRICHMENT
exports.updateLocationMetadata = async (req, res) => {
    try {
        const locationId = parseNumericId(req.params.id);

        if (!locationId) {
            return res.status(400).json({ success: false, message: "Invalid location ID format." });
        }

        const existingLocation = await prisma.location.findUnique({
            where: { id: locationId }
        });

        if (!existingLocation) {
            return res.status(404).json({ success: false, message: "Location not found." });
        }

        if (req.user.role !== 'SUPER_ADMIN' && existingLocation.companyId !== parseInt(req.user.companyId, 10)) {
            return res.status(403).json({ success: false, message: "Forbidden: Access denied." });
        }

        const {
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
            images,
            evses
        } = req.body;

        await prisma.$transaction(async (tx) => {
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

                    ...(images !== undefined && {
                        media: {
                            deleteMany: {},
                            create: images.map(img => ({ url: typeof img === 'string' ? img : img.url, type: 'OTHER' }))
                        }
                    })
                }
            });

            if (evses && Array.isArray(evses)) {
                for (const evseItem of evses) {
                    const parsedEvseId = parseNumericId(evseItem.id);
                    await tx.chargePoint.updateMany({
                        where: {
                            locationId: locationId,
                            OR: [
                                { id: parsedEvseId || -1 },
                                { hardwareId: String(evseItem.evse_id || evseItem.hardwareId || "") }
                            ]
                        },
                        data: {
                            floorLevel: evseItem.floor_level !== undefined ? evseItem.floor_level : undefined,
                            parkingRestrictions: evseItem.parking_restrictions !== undefined ? evseItem.parking_restrictions : undefined,
                            ...(evseItem.latitude && { evseLatitude: parseFloat(evseItem.latitude) }),
                            ...(evseItem.longitude && { evseLongitude: parseFloat(evseItem.longitude) }),
                            ...(evseItem.directions && { directions: typeof evseItem.directions === 'object' ? JSON.stringify(evseItem.directions) : evseItem.directions }),
                            ...(evseItem.images && { evseImages: JSON.stringify(evseItem.images) })
                        }
                    });
                }
            }
        });

        const clientIp = getClientIp(req);
        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'LOCATION_METADATA',
                entityId: locationId,
                details: `Updated metadata for location ID: ${locationId}`,
                ipAddress: clientIp,
                userId: req.user.id
            }
        });

        return res.status(200).json({ success: true, message: "Open data settings updated successfully." });
    } catch (error) {
        console.error("Portal metadata update error:", error);
        return res.status(500).json({ success: false, message: "Internal server error applying metadata update." });
    }
};

// 10. PATCH EXTERNAL LOCATION
exports.patchExternalLocation = async (req, res) => {
    try {
        const locationId = parseNumericId(req.params.id);

        if (!locationId) {
            return res.status(400).json({ success: false, message: "Invalid location ID format." });
        }

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

        if (directions !== undefined) {
            if (Array.isArray(directions)) {
                updateData.directions = directions.length > 0 ? (directions[0].text || JSON.stringify(directions)) : null;
            } else if (typeof directions === 'object' && directions !== null) {
                updateData.directions = directions.text || JSON.stringify(directions);
            } else {
                updateData.directions = directions;
            }
        }

        if (relatedLocations !== undefined) {
            updateData.relatedLocations = typeof relatedLocations === 'object' ? JSON.stringify(relatedLocations) : relatedLocations;
        }

        if (publishAllowedTo !== undefined) {
            updateData.publishAllowedTo = typeof publishAllowedTo === 'object' ? JSON.stringify(publishAllowedTo) : publishAllowedTo;
        }

        if (energyMix !== undefined) {
            updateData.energyMix = typeof energyMix === 'object' ? JSON.stringify(energyMix) : energyMix;
        }

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

// 11. PATCH EXTERNAL EVSE
exports.patchExternalEvse = async (req, res) => {
    try {
        const { locationId, evseId } = req.params;
        const parsedLocationId = parseNumericId(locationId);
        const parsedEvseIdNum = parseNumericId(evseId);

        const existingEvse = await prisma.chargePoint.findFirst({
            where: {
                OR: [
                    { hardwareId: String(evseId) },
                    { id: parsedEvseIdNum || -1 }
                ],
                ...(parsedLocationId ? { locationId: parsedLocationId } : {})
            },
            include: { connectors: true }
        });

        if (!existingEvse) {
            return res.status(404).json({ success: false, message: `EVSE unit "${evseId}" not found.` });
        }

        const {
            physical_reference,
            physicalReference,
            last_updated,
            lastUpdated,
            uid,
            evse_id,
            status,
            floor_level,
            floorLevel,
            capabilities,
            status_schedule,
            statusSchedule,
            parking_restrictions,
            parkingRestrictions,
            directions,
            coordinates,
            images,
            connectors,
            ...otherFields
        } = req.body;

        const evseUpdateData = { ...otherFields };

        if (physical_reference !== undefined || physicalReference !== undefined) {
            evseUpdateData.physicalReference = physical_reference !== undefined ? physical_reference : physicalReference;
        }

        if (status !== undefined) evseUpdateData.status = status;
        if (floor_level !== undefined || floorLevel !== undefined) {
            evseUpdateData.floorLevel = floor_level !== undefined ? floor_level : floorLevel;
        }

        if (capabilities !== undefined) {
            evseUpdateData.capabilities = Array.isArray(capabilities) ? capabilities.join(',') : capabilities;
        }

        if (status_schedule !== undefined || statusSchedule !== undefined) {
            const rawSchedule = status_schedule !== undefined ? status_schedule : statusSchedule;
            evseUpdateData.statusSchedule = typeof rawSchedule === 'object' ? JSON.stringify(rawSchedule) : rawSchedule;
        }

        if (parking_restrictions !== undefined || parkingRestrictions !== undefined) {
            const rawRestrictions = parking_restrictions !== undefined ? parking_restrictions : parkingRestrictions;
            evseUpdateData.parkingRestrictions = Array.isArray(rawRestrictions) ? rawRestrictions.join(',') : rawRestrictions;
        }

        if (directions !== undefined) {
            if (Array.isArray(directions)) {
                evseUpdateData.directions = directions.length > 0 ? (directions[0].text || JSON.stringify(directions)) : null;
            } else if (typeof directions === 'object' && directions !== null) {
                evseUpdateData.directions = directions.text || JSON.stringify(directions);
            } else {
                evseUpdateData.directions = directions;
            }
        }

        if (coordinates && typeof coordinates === 'object') {
            if (coordinates.latitude !== undefined) evseUpdateData.evseLatitude = parseFloat(coordinates.latitude);
            if (coordinates.longitude !== undefined) evseUpdateData.evseLongitude = parseFloat(coordinates.longitude);
        }

        if (images !== undefined) {
            evseUpdateData.evseImages = typeof images === 'object' ? JSON.stringify(images) : images;
        }

        await prisma.chargePoint.update({
            where: { id: existingEvse.id },
            data: evseUpdateData
        });

        if (Array.isArray(connectors) && connectors.length > 0) {
            for (const conn of connectors) {
                const connIdNum = parseNumericId(conn.id);

                const {
                    status: connStatus,
                    standard,
                    format,
                    power_type,
                    powerType,
                    max_voltage,
                    voltage,
                    max_amperage,
                    amperage,
                    max_electric_power,
                    maxPowerKw,
                    terms_and_conditions,
                    termsAndConditions,
                    tariff_ids,
                    tariffId
                } = conn;

                const connectorUpdateData = {};

                if (connStatus !== undefined) connectorUpdateData.status = connStatus;
                if (standard !== undefined) connectorUpdateData.standard = standard;
                if (format !== undefined) connectorUpdateData.format = format;

                if (power_type !== undefined || powerType !== undefined) {
                    connectorUpdateData.powerType = power_type !== undefined ? power_type : powerType;
                }

                if (voltage !== undefined || max_voltage !== undefined) {
                    connectorUpdateData.voltage = parseInt(voltage !== undefined ? voltage : max_voltage, 10);
                }

                if (amperage !== undefined || max_amperage !== undefined) {
                    connectorUpdateData.amperage = parseInt(amperage !== undefined ? amperage : max_amperage, 10);
                }

                if (max_electric_power !== undefined || maxPowerKw !== undefined) {
                    const rawPower = max_electric_power !== undefined ? (max_electric_power / 1000) : maxPowerKw;
                    connectorUpdateData.maxPowerKw = parseFloat(rawPower);
                }

                if (terms_and_conditions !== undefined || termsAndConditions !== undefined) {
                    connectorUpdateData.termsAndConditions = terms_and_conditions !== undefined ? terms_and_conditions : termsAndConditions;
                }

                if (tariffId !== undefined) {
                    connectorUpdateData.tariffId = parseInt(tariffId, 10) || null;
                } else if (Array.isArray(tariff_ids) && tariff_ids.length > 0) {
                    connectorUpdateData.tariffId = parseInt(tariff_ids[0], 10) || null;
                }

                if (Object.keys(connectorUpdateData).length > 0) {
                    if (connIdNum) {
                        await prisma.connector.updateMany({
                            where: { id: connIdNum, chargePointId: existingEvse.id },
                            data: connectorUpdateData
                        });
                    } else {
                        await prisma.connector.updateMany({
                            where: { chargePointId: existingEvse.id },
                            data: connectorUpdateData
                        });
                    }
                }
            }
        }

        const fullUpdatedEvse = await prisma.chargePoint.findUnique({
            where: { id: existingEvse.id },
            include: { connectors: true }
        });

        return res.status(200).json({
            success: true,
            message: "EVSE and associated connectors updated successfully.",
            data: fullUpdatedEvse
        });

    } catch (error) {
        console.error("Delta EVSE update error:", error);
        return res.status(500).json({ success: false, message: "Failed to apply EVSE update." });
    }
};

// 12. PATCH EXTERNAL CONNECTOR
exports.patchExternalConnector = async (req, res) => {
    try {
        const parsedConnectorId = parseNumericId(req.params.connectorId);

        if (!parsedConnectorId) {
            return res.status(400).json({ success: false, message: "Invalid connector ID format." });
        }

        const { tariff_ids, tariffId, status, max_power_kw, maxPowerKw, ...otherFields } = req.body;

        const updateData = { ...otherFields };

        if (status !== undefined) {
            updateData.status = status;
        }

        if (tariffId !== undefined) {
            updateData.tariffId = parseInt(tariffId, 10);
        } else if (Array.isArray(tariff_ids) && tariff_ids.length > 0) {
            updateData.tariffId = parseInt(tariff_ids[0], 10);
        }

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

// GET SYSTEM RATE LIMITER TELEMETRY & CONFIGURATION STATUS
exports.getRateLimitTelemetry = async (req, res) => {
    try {
        const config = await prisma.systemConfig.findFirst();

        res.json({
            success: true,
            data: {
                rateLimitingEnabled: config?.rateLimitingEnabled ?? true,
                feedRateLimitMax: config?.feedRateLimitMax || 100,
                feedRateLimitWindow: config?.feedRateLimitWindow || 300, // Duration in seconds
                lastUpdated: config?.updatedAt || new Date().toISOString()
            }
        });
    } catch (error) {
        console.error("Failed to query rate limit telemetry:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch active rate limiter telemetry parameters."
        });
    }
};