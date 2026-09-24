const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { resolveOperatorCompany } = require('../utils/resolveOperatorCompany');
const { wipeOperatorInfrastructure } = require('../utils/wipeOperatorInfrastructure');
const { touchCompany } = require('../utils/touchCompany');

const getClientIp = (req) => {
    return req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;
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

        const resolution = await resolveOperatorCompany({
            payload,
            embeddedOperator,
            isMasterKey,
            partnerCompanyId: req.partnerCompanyId,
            clientIp
        });

        if (resolution.error) {
            return res.status(resolution.suspended ? 403 : 400).json({
                success: false,
                message: resolution.suspended ? `Forbidden: ${resolution.error}` : `Validation Error: ${resolution.error}`
            });
        }

        if (!resolution.company) {
            return res.status(404).json({
                success: false,
                message: "The company associated with this API key could not be found."
            });
        }

        let company = resolution.company;

        if (!isMasterKey) {
            // Regular key: additionally allow updating its own company's display
            // name/contact email from the payload - unrelated to the operator
            // resolution above, which for a regular key always just returns its
            // own existing company untouched.
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

        // Each sync call is treated as this operator's complete current state:
        // wipe its existing Locations/ChargePoints/Connectors (and their Sessions/
        // Media) first, then rebuild entirely fresh from this payload below.
        await wipeOperatorInfrastructure(company.id);

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

        await touchCompany(company.id);

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

// Pulls the per-kWh energy price out of a full OCPI Tariff object's
// elements[].price_components[] (type === 'ENERGY'), scanning every element
// since restriction-scoped tariffs (peak/off-peak, day-of-week, ...) can vary
// which element carries the ENERGY component. Returns null if none is found.
const extractOcpiEnergyPrice = (t) => {
    if (!Array.isArray(t.elements)) return null;
    for (const element of t.elements) {
        const components = Array.isArray(element?.price_components) ? element.price_components : [];
        const energyComponent = components.find((c) => c && c.type === 'ENERGY');
        if (energyComponent && energyComponent.price !== undefined && energyComponent.price !== null) {
            return energyComponent.price;
        }
    }
    return null;
};

// A full OCPI Tariff object has no flat 'name' field - derive one so the rest
// of the sync logic (which is written against the platform's flat tariff
// shape) doesn't need to know the difference. Prefers tariff_alt_text (OCPI's
// own human-readable display text) if present, otherwise falls back to the
// tariff's type plus the first restriction's day_of_week, if any.
const deriveOcpiTariffName = (t) => {
    if (Array.isArray(t.tariff_alt_text)) {
        const withText = t.tariff_alt_text.find((alt) => alt && alt.text);
        if (withText) return withText.text;
    }
    const dayOfWeek = t.elements?.[0]?.restrictions?.day_of_week;
    const label = t.type || 'REGULAR';
    return dayOfWeek ? `${label} - ${dayOfWeek}` : `${label} Tariff`;
};

// Normalizes either the platform's flat tariff shape ({ id, name, price_per_kwh,
// currency }) or a full OCPI Tariff object ({ id, currency, type, elements: [...],
// tariff_alt_text, ... }) into the flat shape, so nothing downstream needs to
// branch on which one was sent.
const normalizeTariffEntry = (t) => ({
    id: t.id,
    name: t.name || deriveOcpiTariffName(t),
    price_per_kwh: t.price_per_kwh !== undefined
        ? t.price_per_kwh
        : (t.pricePerKwh !== undefined ? t.pricePerKwh : extractOcpiEnergyPrice(t)),
    currency: t.currency
});

// TARIFF SYNC CONTROLLER
//
// Same authorization contract as syncOperatorData above (regular key -> only its
// own company via req.partnerCompanyId; master key -> may resolve/auto-provision
// any operator by operator_reference_id/name). Each tariff entry may carry its
// own stable 'id' (matched against Tariff.tariffUid, same convention as
// Location.locationUid) - a tariff already known under that id is updated in
// place, preserving its internal Tariff.id (which is what the public feed at
// GET /open-data/tariffs exposes as "id"), so anyone referencing that id (a
// connector's tariff_ids, a downstream consumer's cache) doesn't see it change
// out from under them on every sync. An id omitted from the payload falls back
// to a position-based generated id, same as location sync does for locationUid.
// "Clear older" means: any tariff this company owns that ISN'T present in this
// payload (by tariffUid) gets removed - connectors pointing at a removed tariff
// are detached (tariffId set to null) rather than deleted, matching
// tariffController.deleteTariff.
exports.syncOperatorTariffs = async (req, res) => {
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

        const rawTariffEntries = Array.isArray(payload.tariffs)
            ? payload.tariffs
            : (Array.isArray(payload.data) ? payload.data : []);
        const tariffsToSync = rawTariffEntries.map(normalizeTariffEntry);

        if (tariffsToSync.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Validation Error: Payload must contain a non-empty 'tariffs' or 'data' array."
            });
        }

        for (const t of tariffsToSync) {
            const price = t.price_per_kwh;
            if (!t.name || price === undefined || price === null || price === '' || isNaN(parseFloat(price))) {
                return res.status(400).json({
                    success: false,
                    message: "Validation Error: Every tariff entry requires a 'name' and a numeric 'price_per_kwh' (or 'pricePerKwh') - or, for a full OCPI Tariff object, an 'elements' array with an ENERGY price_component."
                });
            }
        }

        const embeddedOperator = payload.operator || {};

        const resolution = await resolveOperatorCompany({
            payload,
            embeddedOperator,
            isMasterKey,
            partnerCompanyId: req.partnerCompanyId,
            clientIp
        });

        if (resolution.error) {
            return res.status(resolution.suspended ? 403 : 400).json({
                success: false,
                message: resolution.suspended ? `Forbidden: ${resolution.error}` : `Validation Error: ${resolution.error}`
            });
        }

        if (!resolution.company) {
            return res.status(404).json({
                success: false,
                message: "The company associated with this API key could not be found."
            });
        }

        const company = resolution.company;

        const syncedTariffs = await prisma.$transaction(async (tx) => {
            const synced = [];
            const keptUids = [];

            for (let i = 0; i < tariffsToSync.length; i++) {
                const t = tariffsToSync[i];
                const raw = rawTariffEntries[i];
                const tariffUid = (t.id !== undefined && t.id !== null && String(t.id).trim() !== '')
                    ? String(t.id).trim()
                    : `tariff_${company.id}_${i}`;

                keptUids.push(tariffUid);

                const tariffData = {
                    name: t.name,
                    pricePerKwh: parseFloat(t.price_per_kwh),
                    currency: t.currency || 'GBP',
                    companyId: company.id,
                    tariffUid,
                    // Only a full OCPI Tariff object (has an 'elements' array) carries
                    // the extra fields worth preserving losslessly - a flat
                    // { name, price_per_kwh } entry has nothing more to store.
                    ocpiTariffData: Array.isArray(raw?.elements) ? JSON.stringify(raw) : null
                };

                const existing = await tx.tariff.findFirst({
                    where: { companyId: company.id, tariffUid }
                });

                const tariff = existing
                    ? await tx.tariff.update({ where: { id: existing.id }, data: tariffData })
                    : await tx.tariff.create({ data: tariffData });

                synced.push(tariff);
            }

            // OR'd with tariffUid: null to also sweep up rows created before this field
            // existed - SQL NULL semantics mean a plain `notIn` never matches a NULL column.
            const staleTariffs = await tx.tariff.findMany({
                where: {
                    companyId: company.id,
                    OR: [{ tariffUid: null }, { tariffUid: { notIn: keptUids } }]
                },
                select: { id: true }
            });
            const staleIds = staleTariffs.map((t) => t.id);

            if (staleIds.length > 0) {
                await tx.connector.updateMany({
                    where: { tariffId: { in: staleIds } },
                    data: { tariffId: null }
                });
                await tx.tariff.deleteMany({ where: { id: { in: staleIds } } });
            }

            return synced;
        });

        await prisma.auditLog.create({
            data: {
                action: 'SYNC',
                entity: 'TARIFF',
                entityId: company.id,
                details: `Partner sync updated tariffs for "${company.name}": ${syncedTariffs.length} tariff(s) synced.`,
                ipAddress: clientIp
            }
        });

        await touchCompany(company.id);

        return res.status(200).json({
            success: true,
            message: `Operator "${company.name}" tariffs synced successfully.`,
            data: {
                operator_id: company.id,
                operator_name: company.name,
                operator_reference_id: company.operatorReferenceId,
                synced_tariffs_count: syncedTariffs.length,
                synced_tariffs: syncedTariffs.map((t) => ({ id: t.id, tariff_uid: t.tariffUid, name: t.name }))
            }
        });

    } catch (error) {
        console.error("Tariff sync error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to process tariff sync payload."
        });
    }
};
