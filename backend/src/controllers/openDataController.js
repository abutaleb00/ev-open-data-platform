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

exports.getPublicFeed = async (req, res) => {
    try {
        const { search, companyId, page = 1, limit = 50, preview } = req.query;

        const parsedPage = Math.max(1, parseInt(page));
        const parsedLimit = Math.max(1, Math.min(100, parseInt(limit)));
        const offset = (parsedPage - 1) * parsedLimit;

        // Establish compliance check boundaries
        const shouldFilterApproved = preview !== 'true';
        
        // Define root query filter criteria
        const whereClause = shouldFilterApproved ? { isApproved: true } : {};

        // 🔥 CRITICAL LIVE BUG FIX: Only filter by companyId if it is a valid numeric string.
        // On your live environment, undefined fields passed down as raw query metrics can fall through.
        if (companyId && !isNaN(parseInt(companyId))) {
            whereClause.companyId = parseInt(companyId);
        }

        // Apply fallback criteria if dynamic text searches are active
        if (search && search.trim() !== '') {
            const searchString = search.trim();
            whereClause.AND = [
                {
                    OR: [
                        { name: { contains: searchString } },
                        { postcode: { contains: searchString } },
                        { city: { contains: searchString } }
                    ]
                }
            ];
        }

        // Run direct sequential database transaction queries
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

        // Map database arrays into compliant OCPI structural objects
        const ocpiFormattedData = locations.map(loc => {
            const relevantChargePoints = (loc.chargePoints || []).filter(cp => {
                if (!shouldFilterApproved) return true;
                return cp.isApproved === true;
            });

            return {
                country_code: loc.countryCode,
                party_id: loc.partyId,
                id: `loc_${loc.id}`,
                publish: true,
                name: loc.name,
                address: loc.address,
                city: loc.city,
                postal_code: loc.postcode,
                state: loc.state || null,
                country: loc.countryISO,
                coordinates: {
                    latitude: loc.latitude ? loc.latitude.toString() : "0.000000",
                    longitude: loc.longitude ? loc.longitude.toString() : "0.000000"
                },
                related_locations: [],
                parking_type: loc.parkingType,
                evses: relevantChargePoints.map(cp => ({
                    uid: `GB*${loc.partyId}*E${cp.hardwareId || cp.id}-1`,
                    evse_id: `GB*${loc.partyId}*E${cp.hardwareId || cp.id}`,
                    status: cp.status,
                    status_schedule: [],
                    capabilities: [
                        "REMOTE_START_STOP_CAPABLE",
                        "RFID_READER",
                        "UNLOCK_CAPABLE"
                    ],
                    connectors: (cp.connectors || []).map(conn => ({
                        id: conn.id.toString(),
                        standard: conn.standard,
                        format: conn.format,
                        power_type: conn.powerType,
                        max_voltage: conn.voltage,
                        max_amperage: conn.amperage,
                        max_electric_power: conn.maxPowerKw ? Math.round(conn.maxPowerKw) : null,
                        tariff_ids: conn.tariffId ? [conn.tariffId.toString()] : [],
                        terms_and_conditions: null,
                        last_updated: cp.updatedAt || new Date().toISOString(),
                        voltage: conn.voltage,
                        amperage: conn.amperage
                    })),
                    floor_level: cp.floorLevel || null,
                    coordinates: null,
                    physical_reference: cp.hardwareId ? cp.hardwareId.slice(-6) : cp.id.toString(),
                    directions: [],
                    parking_restrictions: [],
                    images: [],
                    last_updated: cp.updatedAt || new Date().toISOString()
                })),
                directions: [],
                operator: {
                    name: loc.company?.name || "Independent Operator"
                },
                suboperator: null,
                owner: null,
                facilities: loc.amenities ? loc.amenities.split(',').map(f => f.trim()) : [],
                time_zone: loc.timeZone,
                opening_times: {
                    twentyfourseven: true,
                    regular_hours: [],
                    exceptional_openings: [],
                    exceptional_closings: []
                },
                charging_when_closed: null,
                images: (loc.media || []).map(m => ({
                    url: m.url,
                    type: m.type,
                    category: "ENTRANCE"
                })),
                energy_mix: null,
                last_updated: loc.updatedAt || new Date().toISOString(),
                publish_allowed_to: [],
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
        res.status(500).json({ name: "ERROR", message: "Failed to compile compliance open data stream." });
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

        let targetCompanyId = role === 'SUPER_ADMIN' ? parseInt(requestedCompanyId) : parseInt(companyId);

        if (!targetCompanyId) {
            return res.status(400).json({
                success: false,
                message: "A valid target Company ID context must be specified to provision API keys."
            });
        }

        if (!name) return res.status(400).json({ success: false, message: "Key name label is required." });

        const rawKey = `ev_live_${crypto.randomBytes(24).toString('hex')}`;

        const apiKeyRecord = await prisma.apiKey.create({
            data: {
                key: rawKey,
                name: name,
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
        console.error(error);
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

        if (search && search.trim() !== '') {
            const searchString = search.trim();
            whereClause.AND = [
                {
                    OR: [
                        { name: { contains: searchString } },
                        { postcode: { contains: searchString } },
                        { city: { contains: searchString } }
                    ]
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
            publish: true,
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