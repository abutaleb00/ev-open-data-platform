const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getClientIp = (req) => {
    return req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;
};

// HELPER: Generates fallback operator reference ID if missing
const generateOperatorRef = (name) => {
    if (!name) return 'CEV';
    return name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'CEV';
};

// MAIN SYNC OPERATOR CONTROLLER
exports.syncOperatorData = async (req, res) => {
    try {
        const payload = req.body;
        const clientIp = getClientIp(req);

        if (!payload || typeof payload !== 'object') {
            return res.status(400).json({
                success: false,
                message: "Validation Error: Request payload cannot be empty."
            });
        }

        // ======================================================
        // STEP 1: DYNAMIC OPERATOR METADATA EXTRACTION
        // ======================================================
        const locationsToSync = Array.isArray(payload.location)
            ? payload.location
            : (Array.isArray(payload.locations) ? payload.locations : []);

        if (locationsToSync.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Validation Error: Payload must contain a non-empty 'location' or 'locations' array."
            });
        }

        const embeddedOperator = payload.operator || locationsToSync[0]?.operator || {};
        const operatorName = embeddedOperator.name || payload.name || "MaanRishfa Ltd";
        const operatorRefId = payload.operator_reference_id || embeddedOperator.operator_reference_id || generateOperatorRef(operatorName);

        // Priority order: payload.operator.email -> payload.email -> fallback email
        const contactEmail = embeddedOperator.email || payload.email || `contact@${operatorRefId.slice(0, 8).toLowerCase()}.com`;

        // ======================================================
        // STEP 2: FIND OR AUTO-CREATE MISSING OPERATOR (COMPANY)
        // ======================================================
        let company = await prisma.company.findFirst({
            where: {
                OR: [
                    { operatorReferenceId: operatorRefId },
                    { name: operatorName }
                ]
            }
        });

        if (!company) {
            // Auto-provision missing Operator Company using payload metadata
            company = await prisma.company.create({
                data: {
                    name: operatorName,
                    operatorReferenceId: operatorRefId,
                    contactEmail: contactEmail,
                    status: 'APPROVED' // Valid schema field (replacing isApproved)
                }
            });

            await prisma.auditLog.create({
                data: {
                    action: 'CREATE',
                    entity: 'COMPANY',
                    entityId: company.id,
                    details: `Auto-provisioned missing Operator Company "${company.name}" (Ref: ${operatorRefId}) via partner sync API.`,
                    ipAddress: clientIp
                }
            });
        } else {
            // Update existing company reference details if changed
            company = await prisma.company.update({
                where: { id: company.id },
                data: {
                    name: operatorName,
                    contactEmail: contactEmail,
                    ...(operatorRefId && { operatorReferenceId: operatorRefId })
                }
            });
        }

        // ======================================================
        // STEP 3: RECURSIVE SYNC FOR LOCATIONS, EVSEs, CONNECTORS
        // ======================================================
        const locationsSynced = [];

        for (const locPayload of locationsToSync) {
            const locUid = locPayload.id || `loc_${Date.now()}`;
            const lat = locPayload.coordinates?.latitude ? parseFloat(locPayload.coordinates.latitude) : 0.0;
            const lng = locPayload.coordinates?.longitude ? parseFloat(locPayload.coordinates.longitude) : 0.0;

            let location = await prisma.location.findFirst({
                where: {
                    OR: [
                        { locationUid: locUid },
                        { AND: [{ name: locPayload.name || '' }, { companyId: company.id }] }
                    ]
                }
            });

            const locationData = {
                name: locPayload.name || "Station Location",
                address: locPayload.address || "Street Address",
                postcode: locPayload.postal_code || locPayload.postcode || "00000",
                city: locPayload.city || "City",
                state: locPayload.state || null,
                countryCode: locPayload.country_code || "GB",
                countryISO: locPayload.country || "GBR",
                latitude: lat,
                longitude: lng,
                companyId: company.id,
                parkingType: locPayload.parking_type || "UNKNOWN",
                timeZone: locPayload.time_zone || "Europe/London",
                amenities: Array.isArray(locPayload.facilities) ? locPayload.facilities.join(', ') : locPayload.amenities || '',
                isApproved: true,
                locationUid: locUid,
                operatorReferenceId: company.operatorReferenceId,
                operatorData: JSON.stringify(locPayload.operator || embeddedOperator),
                suboperatorData: locPayload.suboperator ? JSON.stringify(locPayload.suboperator) : null,
                ownerData: locPayload.owner ? JSON.stringify(locPayload.owner) : null,
                openingTimesData: locPayload.opening_times ? JSON.stringify(locPayload.opening_times) : null
            };

            if (location) {
                location = await prisma.location.update({
                    where: { id: location.id },
                    data: locationData
                });
            } else {
                location = await prisma.location.create({
                    data: locationData
                });
            }

            // Sync EVSEs
            const evsesToSync = Array.isArray(locPayload.evses) ? locPayload.evses : [];

            for (const evsePayload of evsesToSync) {
                const hardwareId = evsePayload.evse_id || evsePayload.uid || `evse_${Date.now()}`;

                let chargePoint = await prisma.chargePoint.findFirst({
                    where: {
                        OR: [
                            { hardwareId: hardwareId },
                            { evseUid: evsePayload.uid || hardwareId }
                        ]
                    }
                });

                const cpData = {
                    hardwareId: hardwareId,
                    evseUid: evsePayload.uid || hardwareId,
                    locationId: location.id,
                    status: (evsePayload.status || "AVAILABLE").toUpperCase(),
                    floorLevel: evsePayload.floor_level || null,
                    physicalReference: evsePayload.physical_reference || null,
                    parkingRestrictions: Array.isArray(evsePayload.parking_restrictions) ? evsePayload.parking_restrictions.join(',') : null,
                    capabilities: Array.isArray(evsePayload.capabilities) ? evsePayload.capabilities.join(',') : 'REMOTE_START_STOP_CAPABLE',
                    evseImages: evsePayload.images ? JSON.stringify(evsePayload.images) : null,
                    isApproved: true
                };

                if (chargePoint) {
                    chargePoint = await prisma.chargePoint.update({
                        where: { id: chargePoint.id },
                        data: cpData
                    });
                } else {
                    chargePoint = await prisma.chargePoint.create({
                        data: cpData
                    });
                }

                // Sync Connectors
                const connectorsToSync = Array.isArray(evsePayload.connectors) ? evsePayload.connectors : [];

                for (const connPayload of connectorsToSync) {
                    const connUid = connPayload.id || `conn_${Date.now()}`;
                    const maxPowerKw = connPayload.max_electric_power
                        ? parseFloat(connPayload.max_electric_power) / 1000
                        : (connPayload.max_power_kw ? parseFloat(connPayload.max_power_kw) : 22.0);

                    let connector = await prisma.connector.findFirst({
                        where: {
                            OR: [
                                { connectorUid: connUid },
                                { AND: [{ chargePointId: chargePoint.id }, { standard: connPayload.standard || 'IEC_62196_T2' }] }
                            ]
                        }
                    });

                    const connData = {
                        connectorUid: connUid,
                        chargePointId: chargePoint.id,
                        type: connPayload.power_type && connPayload.power_type.includes('DC') ? 'DC' : 'TYPE_2',
                        standard: connPayload.standard || 'IEC_62196_T2',
                        format: (connPayload.format || 'SOCKET').toUpperCase(),
                        powerType: connPayload.power_type || 'AC_3_PHASE',
                        maxPowerKw: maxPowerKw,
                        voltage: connPayload.max_voltage ? parseInt(connPayload.max_voltage, 10) : 230,
                        amperage: connPayload.max_amperage ? parseInt(connPayload.max_amperage, 10) : 32,
                        status: (connPayload.status || 'AVAILABLE').toUpperCase(),
                        tariffIdsJson: connPayload.tariff_ids ? JSON.stringify(connPayload.tariff_ids) : null
                    };

                    if (connector) {
                        await prisma.connector.update({
                            where: { id: connector.id },
                            data: connData
                        });
                    } else {
                        await prisma.connector.create({
                            data: connData
                        });
                    }
                }
            }

            locationsSynced.push(location.locationUid);
        }

        return res.status(200).json({
            success: true,
            message: `Operator "${company.name}" and infrastructure synced successfully.`,
            data: {
                operator_id: company.id,
                operator_name: company.name,
                operator_reference_id: company.operatorReferenceId,
                contact_email: company.contactEmail,
                synced_locations_count: locationsSynced.length,
                synced_location_ids: locationsSynced
            }
        });

    } catch (error) {
        console.error("Operator sync error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to process operator and infrastructure sync payload.",
            error: error.message
        });
    }
};