const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getPublicDataset = async (req, res) => {
    try {
        const { companyId, limit } = req.query;

        // Build the filter query dynamically based on optional operators query string parameters
        const whereClause = { isApproved: true };
        if (companyId) {
            whereClause.companyId = parseInt(companyId);
        }

        const dataset = await prisma.location.findMany({
            where: whereClause,
            take: limit ? parseInt(limit) : undefined, // Allows capping payload sizes for previews safely
            select: {
                id: true,
                name: true,
                address: true,
                postcode: true,
                latitude: true,
                longitude: true,
                amenities: true,
                updatedAt: true,

                // --- OCPI LOCATION FIELDS ---
                city: true,
                state: true,
                countryCode: true,
                countryISO: true,
                parkingType: true,
                timeZone: true,
                partyId: true,

                company: { select: { name: true, contactEmail: true } },
                chargePoints: {
                    where: { isApproved: true },
                    select: {
                        id: true,
                        hardwareId: true,
                        status: true,
                        updatedAt: true,

                        // --- OCPI EVSE FIELDS ---
                        floorLevel: true,

                        connectors: {
                            select: {
                                id: true,
                                type: true,
                                maxPowerKw: true,
                                status: true,
                                // Note: Removed updatedAt from here to prevent validation crashes

                                // --- OCPI CONNECTOR FIELDS ---
                                standard: true,
                                format: true,
                                powerType: true,
                                voltage: true,
                                amperage: true,

                                tariff: { select: { name: true, pricePerKwh: true, currency: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Map data arrays to explicitly output the compliance schema structures
        const structuredResponse = dataset.map(loc => ({
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
            evses: loc.chargePoints.map(cp => ({
                uid: `GB*${loc.partyId}*E${cp.hardwareId || cp.id}-1`,
                evse_id: `GB*${loc.partyId}*E${cp.hardwareId || cp.id}`,
                status: cp.status || "UNKNOWN",
                status_schedule: [],
                capabilities: [
                    "REMOTE_START_STOP_CAPABLE",
                    "RFID_READER",
                    "UNLOCK_CAPABLE"
                ],
                connectors: cp.connectors.map(conn => ({
                    id: conn.id.toString(),
                    standard: conn.standard,
                    format: conn.format,
                    power_type: conn.powerType,
                    max_voltage: conn.voltage,
                    max_amperage: conn.amperage,
                    max_electric_power: conn.maxPowerKw ? parseInt(conn.maxPowerKw) : null,
                    tariff_ids: conn.tariff?.name ? [conn.tariff.name] : [],
                    terms_and_conditions: null,
                    // Fallback to parent ChargePoint's updatedAt since Connector doesn't store one directly
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
                name: loc.company?.name || "Independent Operator",
                email: loc.company?.contactEmail || null
            },
            suboperator: null,
            owner: null,
            facilities: loc.amenities ? loc.amenities.split(',') : [],
            time_zone: loc.timeZone,
            opening_times: {
                twentyfourseven: true,
                regular_hours: [],
                exceptional_openings: [],
                exceptional_closings: []
            },
            charging_when_closed: null,
            images: loc.media ? loc.media.map(m => ({
                url: m.url,
                type: m.type,
                category: "ENTRANCE"
            })) : [],
            energy_mix: null,
            last_updated: loc.updatedAt || new Date().toISOString(),
            publish_allowed_to: [],
            location_point: {
                type: "Point",
                coordinates: [parseFloat(loc.longitude || 0), parseFloat(loc.latitude || 0)]
            }
        }));

        // Fetch true un-limited database total for metadata tracking
        const totalLocations = await prisma.location.count({ where: whereClause });

        res.json({
            name: "OK",
            message: "ok",
            meta: {
                totalLocations: totalLocations,
                returnedLocations: structuredResponse.length,
                timestamp: new Date().toISOString(),
                license: "Open Data Commons Open Database License (ODbL)",
                version: "1.0.0"
            },
            data: structuredResponse
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ name: "ERROR", message: "Failed to generate dynamic public dataset payload." });
    }
};