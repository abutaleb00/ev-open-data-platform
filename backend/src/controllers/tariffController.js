const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { touchCompany } = require('../utils/touchCompany');
const { safeJsonParse, extractEnergyPrice, applyEnergyPrice } = require('../utils/ocpiTariff');

// Helper Extraction Module: Pulls real client IP safely behind proxies
const getClientIp = (req) => {
    return req.headers['x-forwarded-for']
        ? req.headers['x-forwarded-for'].split(',')[0].trim()
        : req.ip || req.socket?.remoteAddress || '127.0.0.1';
};

// Shapes a Tariff row (plus its optional raw OCPI object) into the response
// used by both the list and single-record endpoints, so the two can't drift.
const buildTariffDetail = (t) => {
    const raw = safeJsonParse(t.ocpiTariffData);

    return {
        id: t.id,
        tariffUid: t.tariffUid || null,
        name: t.name,
        pricePerKwh: t.pricePerKwh,
        currency: t.currency || 'GBP',
        companyId: t.companyId,
        companyName: t.company?.name || 'Independent Operator',
        operatorReferenceId: t.company?.operatorReferenceId || null,
        connectorsCount: t._count?.connectors ?? (Array.isArray(t.connectors) ? t.connectors.length : 0),
        // Full OCPI fields - null/empty when this tariff has never been synced
        // from a full OCPI Tariff object (admin-portal-created, or synced from
        // the flat { name, price_per_kwh } shape).
        countryCode: raw?.country_code || null,
        partyId: raw?.party_id || null,
        type: raw?.type || null,
        tariffAltText: Array.isArray(raw?.tariff_alt_text) ? raw.tariff_alt_text : [],
        tariffAltUrl: raw?.tariff_alt_url || null,
        minPrice: raw?.min_price ?? null,
        maxPrice: raw?.max_price ?? null,
        elements: Array.isArray(raw?.elements) ? raw.elements : [],
        lastUpdated: raw?.last_updated || null,
        hasFullOcpiData: !!raw
    };
};

// 1. GET ALL TARIFFS
exports.getAllTariffs = async (req, res) => {
    try {
        const { role, companyId } = req.user;
        const isSuperAdmin = role === 'SUPER_ADMIN';

        const whereClause = isSuperAdmin ? {} : { companyId: parseInt(companyId, 10) };

        const tariffs = await prisma.tariff.findMany({
            where: whereClause,
            include: {
                company: {
                    select: { id: true, name: true, operatorReferenceId: true }
                },
                _count: {
                    select: { connectors: true }
                }
            },
            orderBy: { id: 'desc' }
        });

        res.json({ success: true, data: tariffs.map(buildTariffDetail) });
    } catch (error) {
        console.error("Failed to fetch multi-tenant tariff matrix:", error);
        res.status(500).json({ success: false, message: "Failed to fetch tariffs" });
    }
};

// 2. GET A SINGLE TARIFF, WITH ITS LINKED CONNECTORS
exports.getTariffById = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, companyId } = req.user;
        const tariffIdInt = parseInt(id, 10);

        if (isNaN(tariffIdInt)) {
            return res.status(400).json({ success: false, message: "Invalid tariff id." });
        }

        const tariff = await prisma.tariff.findUnique({
            where: { id: tariffIdInt },
            include: {
                company: { select: { id: true, name: true, operatorReferenceId: true } },
                _count: { select: { connectors: true } },
                connectors: {
                    select: {
                        id: true,
                        type: true,
                        standard: true,
                        status: true,
                        chargePoint: {
                            select: {
                                hardwareId: true,
                                location: { select: { id: true, name: true } }
                            }
                        }
                    }
                }
            }
        });

        if (!tariff) {
            return res.status(404).json({ success: false, message: "Target tariff plan not found." });
        }

        if (role !== 'SUPER_ADMIN' && tariff.companyId !== parseInt(companyId, 10)) {
            return res.status(403).json({ success: false, message: "Access Denied: Cannot view infrastructure out of tenant scope bounds." });
        }

        const connectors = tariff.connectors.map((c) => ({
            id: c.id,
            type: c.type,
            standard: c.standard,
            status: c.status,
            hardwareId: c.chargePoint?.hardwareId || null,
            locationId: c.chargePoint?.location?.id || null,
            locationName: c.chargePoint?.location?.name || null
        }));

        res.json({ success: true, data: { ...buildTariffDetail(tariff), connectors } });
    } catch (error) {
        console.error("Failed to fetch tariff detail:", error);
        res.status(500).json({ success: false, message: "Failed to fetch tariff detail" });
    }
};

// Reads whichever full-OCPI-shaped fields were actually sent in the request
// body - omitted keys are left out entirely (not set to undefined), so
// spreading the result over an existing raw object only overrides what the
// caller explicitly provided and leaves everything else (e.g. previously
// synced elements/restrictions) untouched. Returns null if none were sent.
const readOcpiFields = (body) => {
    const keys = ['country_code', 'party_id', 'type', 'tariff_alt_text', 'tariff_alt_url', 'min_price', 'max_price', 'elements'];
    const present = {};
    for (const k of keys) {
        if (body[k] !== undefined) present[k] = body[k];
    }
    return Object.keys(present).length > 0 ? present : null;
};

// Builds the object to persist into Tariff.ocpiTariffData given what the
// request actually sent, so:
//   - editing only name/pricePerKwh/currency keeps a previously-synced
//     tariff's full data intact (with its ENERGY price kept in sync), and
//   - explicitly sending any OCPI-shaped field replaces just those fields on
//     top of whatever was there before (or starts fresh if there was nothing).
const mergeOcpiTariffData = ({ existingRaw, ocpiFields, tariffUid, currency, pricePerKwh }) => {
    if (!ocpiFields && !existingRaw) return null;

    if (!ocpiFields) {
        // No OCPI-shaped fields in this request - just keep the existing raw
        // object's ENERGY price aligned with the flat pricePerKwh being saved.
        return {
            ...applyEnergyPrice(existingRaw, pricePerKwh),
            currency,
            last_updated: new Date().toISOString()
        };
    }

    const merged = {
        ...(existingRaw || {}),
        id: tariffUid,
        currency,
        ...ocpiFields,
        last_updated: new Date().toISOString()
    };

    if (!Array.isArray(merged.elements) || merged.elements.length === 0) {
        merged.elements = [{ price_components: [{ type: 'ENERGY', price: pricePerKwh, step_size: 1 }] }];
    }

    return merged;
};

// 3. CREATE A TARIFF
exports.createTariff = async (req, res) => {
    try {
        const { role, companyId: userCompanyId, id: userId } = req.user;
        const { name, pricePerKwh, currency, companyId } = req.body;
        const clientIp = getClientIp(req);

        const ocpiFields = readOcpiFields(req.body);
        const elementsPrice = ocpiFields ? extractEnergyPrice({ elements: ocpiFields.elements }) : null;
        const effectivePrice = pricePerKwh !== undefined && pricePerKwh !== '' ? parseFloat(pricePerKwh) : elementsPrice;

        if (!name || effectivePrice === undefined || effectivePrice === null || isNaN(effectivePrice)) {
            return res.status(400).json({ success: false, message: "Missing required price configuration fields." });
        }

        const targetCompanyId = role === 'SUPER_ADMIN' ? parseInt(companyId, 10) : parseInt(userCompanyId, 10);

        if (!targetCompanyId || isNaN(targetCompanyId)) {
            return res.status(400).json({ success: false, message: "Tariff plan must be assigned to an active company tenant." });
        }

        const resolvedCurrency = currency || 'GBP';

        const tariff = await prisma.tariff.create({
            data: {
                name,
                pricePerKwh: effectivePrice,
                currency: resolvedCurrency,
                companyId: targetCompanyId,
                ocpiTariffData: ocpiFields
                    ? JSON.stringify(mergeOcpiTariffData({
                        existingRaw: null,
                        ocpiFields,
                        tariffUid: null,
                        currency: resolvedCurrency,
                        pricePerKwh: effectivePrice
                    }))
                    : null
            }
        });

        await prisma.auditLog.create({
            data: {
                action: 'CREATE',
                entity: 'TARIFF',
                entityId: tariff.id,
                details: `Created tariff plan: "${name}" (${effectivePrice} ${resolvedCurrency}/kWh)`,
                ipAddress: clientIp,
                userId: userId
            }
        });

        await touchCompany(targetCompanyId);

        res.status(201).json({ success: true, data: buildTariffDetail(tariff) });
    } catch (error) {
        console.error("Tariff generation operation failed:", error);
        res.status(500).json({ success: false, message: "Failed to create tariff" });
    }
};

// 4. UPDATE AN EXISTING TARIFF
exports.updateTariff = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, companyId, id: userId } = req.user;
        const { name, pricePerKwh, currency } = req.body;
        const tariffIdInt = parseInt(id, 10);
        const clientIp = getClientIp(req);

        const baselineTariff = await prisma.tariff.findUnique({ where: { id: tariffIdInt } });

        if (!baselineTariff) {
            return res.status(404).json({ success: false, message: "Target tariff plan not found." });
        }

        if (role !== 'SUPER_ADMIN' && baselineTariff.companyId !== parseInt(companyId, 10)) {
            return res.status(403).json({ success: false, message: "Access Denied: Cannot modify infrastructure out of tenant scope bounds." });
        }

        const ocpiFields = readOcpiFields(req.body);
        const elementsPrice = ocpiFields ? extractEnergyPrice({ elements: ocpiFields.elements }) : null;
        const resolvedPrice = pricePerKwh !== undefined && pricePerKwh !== ''
            ? parseFloat(pricePerKwh)
            : (elementsPrice !== null ? elementsPrice : baselineTariff.pricePerKwh);
        const resolvedCurrency = currency || baselineTariff.currency;

        const existingRaw = safeJsonParse(baselineTariff.ocpiTariffData);
        const mergedRaw = mergeOcpiTariffData({
            existingRaw,
            ocpiFields,
            tariffUid: baselineTariff.tariffUid,
            currency: resolvedCurrency,
            pricePerKwh: resolvedPrice
        });

        const updatedTariff = await prisma.tariff.update({
            where: { id: tariffIdInt },
            data: {
                ...(name && { name }),
                pricePerKwh: resolvedPrice,
                currency: resolvedCurrency,
                ocpiTariffData: mergedRaw ? JSON.stringify(mergedRaw) : null
            }
        });

        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'TARIFF',
                entityId: updatedTariff.id,
                details: `Updated tariff plan: "${updatedTariff.name}" (${updatedTariff.pricePerKwh} ${updatedTariff.currency}/kWh)`,
                ipAddress: clientIp,
                userId: userId
            }
        });

        await touchCompany(baselineTariff.companyId);

        res.json({ success: true, data: buildTariffDetail(updatedTariff) });
    } catch (error) {
        console.error("Tariff modification operation failed:", error);
        res.status(500).json({ success: false, message: "Failed to update tariff" });
    }
};

// 5. DELETE A TARIFF
exports.deleteTariff = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, companyId, id: userId } = req.user;
        const tariffIdInt = parseInt(id, 10);
        const clientIp = getClientIp(req);

        const baselineTariff = await prisma.tariff.findUnique({ where: { id: tariffIdInt } });

        if (!baselineTariff) {
            return res.status(404).json({ success: false, message: "Target tariff plan not found." });
        }

        if (role !== 'SUPER_ADMIN' && baselineTariff.companyId !== parseInt(companyId, 10)) {
            return res.status(403).json({ success: false, message: "Access Denied: Cannot delete infrastructure out of tenant scope bounds." });
        }

        await prisma.$transaction(async (tx) => {
            await tx.connector.updateMany({
                where: { tariffId: tariffIdInt },
                data: { tariffId: null }
            });

            await tx.tariff.delete({
                where: { id: tariffIdInt }
            });
        });

        await prisma.auditLog.create({
            data: {
                action: 'DELETE',
                entity: 'TARIFF',
                entityId: tariffIdInt,
                details: `Deleted tariff plan: "${baselineTariff.name}" and unlinked dependent connectors.`,
                ipAddress: clientIp,
                userId: userId
            }
        });

        await touchCompany(baselineTariff.companyId);

        res.json({ success: true, message: "Tariff plan successfully removed and unlinked from connectors." });
    } catch (error) {
        console.error("Tariff deletion sequence failed:", error);
        res.status(500).json({ success: false, message: "Failed to delete tariff" });
    }
};
