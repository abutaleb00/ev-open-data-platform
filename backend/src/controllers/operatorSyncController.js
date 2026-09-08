const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getClientIp = (req) => {
    return req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;
};

// HELPER: Generates a fallback operator reference ID if the payload doesn't supply one
const generateOperatorRef = (name) => {
    if (!name) return 'CEV';
    return name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'CEV';
};

// MAIN SYNC OPERATOR CONTROLLER
//
// Two authorization modes, distinguished by ApiKey.isMaster (see authMiddleware.
// verifyPartnerApiKey, which sets req.isMasterKey):
//   - Regular keys (req.isMasterKey === false): this endpoint only ever creates/
//     updates data under the calling key's own company (req.partnerCompanyId). It
//     never searches for or mutates a different tenant by name/operatorReferenceId.
//   - Master/aggregator keys (req.isMasterKey === true, SUPER_ADMIN-granted only):
//     may resolve/auto-create ANY operator by operator_reference_id or name, exactly
//     like the original integration contract this endpoint was built for (a single
//     upstream aggregator pushing updates for many downstream operators it manages).
// In both modes, everything after company resolution (locations/EVSEs/connectors)
// is scoped strictly to the resolved company.id.
exports.syncOperatorData = async (req, res) => {
    try {
        const payload = req.body;
        const clientIp = getClientIp(req);
        const isMasterKey = req.isMasterKey === true;

        if (!payload || typeof payload !== 'object') {
            return res.status(400).json({
                success: false,
                message: "Validation Error: Request payload cannot be empty."
            });
        }

        // Accepts 'location'/'locations' (OCPI-style) as well as 'data' (the same array
        // key used by the standard ingest payload format) so partners don't need a
        // different payload shape just because a request needs operator auto-provisioning.
        const locationsToSync = Array.isArray(payload.location)
            ? payload.location
            : (Array.isArray(payload.locations)
                ? payload.locations
                : (Array.isArray(payload.data) ? payload.data : []));

        if (locationsToSync.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Validation Error: Payload must contain a non-empty 'location', 'locations', or 'data' array."
            });
        }

        const embeddedOperator = payload.operator || locationsToSync[0]?.operator || {};
        let company;

        if (isMasterKey) {
            // Resolve (or auto-provision) the target operator by operator_reference_id/name.
            const operatorName = embeddedOperator.name || payload.name || null;
            const operatorRefId = payload.operator_reference_id || embeddedOperator.operator_reference_id || (operatorName ? generateOperatorRef(operatorName) : null);
            const contactEmail = embeddedOperator.email || payload.email || (operatorRefId ? `contact@${operatorRefId.slice(0, 8).toLowerCase()}.com` : null);

            if (!operatorRefId && !operatorName) {
                return res.status(400).json({
                    success: false,
                    message: "Validation Error: A master-key sync requires 'operator_reference_id' or an 'operator.name' to identify the target operator."
                });
            }

            company = await prisma.company.findFirst({
                where: {
                    OR: [
                        ...(operatorRefId ? [{ operatorReferenceId: operatorRefId }] : []),
                        ...(operatorName ? [{ name: operatorName }] : [])
                    ]
                }
            });

            if (!company) {
                company = await prisma.company.create({
                    data: {
                        name: operatorName || operatorRefId,
                        operatorReferenceId: operatorRefId,
                        contactEmail: contactEmail || `contact@${(operatorRefId || 'operator').toLowerCase()}.com`,
                        status: 'ACTIVE'
                    }
                });

                await prisma.auditLog.create({
                    data: {
                        action: 'CREATE',
                        entity: 'COMPANY',
                        entityId: company.id,
                        details: `Auto-provisioned operator company "${company.name}" (Ref: ${operatorRefId}) via master-key partner sync.`,
                        ipAddress: clientIp
                    }
                });
            } else {
                if (company.status === 'SUSPENDED') {
                    return res.status(403).json({
                        success: false,
                        message: `Forbidden: Operator "${company.name}" is currently suspended and cannot be synced.`
                    });
                }

                const updateData = {};
                if (operatorName && operatorName !== company.name) updateData.name = operatorName;
                if (contactEmail && contactEmail !== company.contactEmail) updateData.contactEmail = contactEmail;
                if (operatorRefId && !company.operatorReferenceId) updateData.operatorReferenceId = operatorRefId;

                if (Object.keys(updateData).length > 0) {
                    company = await prisma.company.update({ where: { id: company.id }, data: updateData });

                    await prisma.auditLog.create({
                        data: {
                            action: 'UPDATE',
                            entity: 'COMPANY',
                            entityId: company.id,
                            details: `Master-key partner sync updated operator company "${company.name}" metadata.`,
                            ipAddress: clientIp
                        }
                    });
                }
            }
        } else {
            // Regular key: strictly confined to its own company, ignoring any
            // operator_reference_id/name in the payload for resolution purposes.
            company = await prisma.company.findUnique({ where: { id: req.partnerCompanyId } });

            if (!company) {
                return res.status(404).json({
                    success: false,
                    message: "The company associated with this API key could not be found."
                });
            }

            const newName = embeddedOperator.name || payload.name;
            const newEmail = embeddedOperator.email || payload.email;

            if (newName || newEmail) {
                company = await prisma.company.update({
                    where: { id: company.id },
                    data: {
                        ...(newName && { name: newName }),
                        ...(newEmail && { contactEmail: newEmail })
                    }
                });

                await prisma.auditLog.create({
                    data: {
                        action: 'UPDATE',
                        entity: 'COMPANY',
                        entityId: company.id,
                        details: `Partner sync updated operator company "${company.name}" metadata.`,
                        ipAddress: clientIp
                    }
                });
            }
        }

        // ======================================================
        // RECURSIVE SYNC FOR LOCATIONS, EVSEs, CONNECTORS
        // (all scoped to this company - see note above)
        // ======================================================
        const locationsSynced = [];

        for (const locPayload of locationsToSync) {
            const locUid = (locPayload.id !== undefined && locPayload.id !== null && String(locPayload.id).trim() !== '')
                ? String(locPayload.id).trim()
                : `loc_${company.id}_${locationsSynced.length}`;
            const lat = locPayload.coordinates?.latitude ? parseFloat(locPayload.coordinates.latitude) : 0.0;
            const lng = locPayload.coordinates?.longitude ? parseFloat(locPayload.coordinates.longitude) : 0.0;

            let location = await prisma.location.findFirst({
                where: {
                    companyId: company.id,
                    OR: [
                        { locationUid: locUid },
                        { name: locPayload.name || '' }
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
                const hardwareId = evsePayload.evse_id || evsePayload.uid || `evse_${location.id}_${evsesToSync.indexOf(evsePayload)}`;

                // hardwareId is unique platform-wide, so scope the lookup to this
                // company's own locations to prevent a collision from reassigning
                // a device that belongs to a different tenant.
                let chargePoint = await prisma.chargePoint.findFirst({
                    where: {
                        OR: [
                            { hardwareId: hardwareId },
                            { evseUid: evsePayload.uid || hardwareId }
                        ],
                        location: { companyId: company.id }
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
                    // hardwareId must be globally unique per the schema - if a device
                    // with this ID already exists under a different tenant, skip it
                    // rather than letting create() throw a unique-constraint error.
                    const collision = await prisma.chargePoint.findUnique({ where: { hardwareId } });
                    if (collision) continue;

                    chargePoint = await prisma.chargePoint.create({
                        data: cpData
                    });
                }

                // Sync Connectors
                const connectorsToSync = Array.isArray(evsePayload.connectors) ? evsePayload.connectors : [];

                for (const connPayload of connectorsToSync) {
                    const connUid = connPayload.id ? String(connPayload.id) : null;
                    const maxPowerKw = connPayload.max_electric_power
                        ? parseFloat(connPayload.max_electric_power) / 1000
                        : (connPayload.max_power_kw ? parseFloat(connPayload.max_power_kw) : 22.0);

                    // Scope the connector lookup to this charge point so a connectorUid
                    // collision elsewhere in the table can't hijack a foreign device.
                    let connector = await prisma.connector.findFirst({
                        where: {
                            chargePointId: chargePoint.id,
                            OR: [
                                ...(connUid ? [{ connectorUid: connUid }] : []),
                                { standard: connPayload.standard || 'IEC_62196_T2' }
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
            message: "Failed to process operator and infrastructure sync payload."
        });
    }
};
