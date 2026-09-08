const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { touchCompany } = require('../utils/touchCompany');

// Helper Extraction Module: Pulls real client IP safely behind proxies
const getClientIp = (req) => {
    return req.headers['x-forwarded-for']
        ? req.headers['x-forwarded-for'].split(',')[0].trim()
        : req.ip || req.socket?.remoteAddress || '127.0.0.1';
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

        const mappedTariffs = tariffs.map((t) => ({
            id: t.id,
            name: t.name,
            pricePerKwh: t.pricePerKwh,
            currency: t.currency || 'GBP',
            companyId: t.companyId,
            companyName: t.company?.name || 'Independent Operator',
            operatorReferenceId: t.company?.operatorReferenceId || null,
            connectorsCount: t._count?.connectors || 0,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt
        }));

        res.json({ success: true, data: mappedTariffs });
    } catch (error) {
        console.error("Failed to fetch multi-tenant tariff matrix:", error);
        res.status(500).json({ success: false, message: "Failed to fetch tariffs" });
    }
};

// 2. CREATE A TARIFF
exports.createTariff = async (req, res) => {
    try {
        const { role, companyId: userCompanyId, id: userId } = req.user;
        const { name, pricePerKwh, currency, companyId } = req.body;
        const clientIp = getClientIp(req);

        if (!name || pricePerKwh === undefined || pricePerKwh === '') {
            return res.status(400).json({ success: false, message: "Missing required price configuration fields." });
        }

        const targetCompanyId = role === 'SUPER_ADMIN' ? parseInt(companyId, 10) : parseInt(userCompanyId, 10);

        if (!targetCompanyId || isNaN(targetCompanyId)) {
            return res.status(400).json({ success: false, message: "Tariff plan must be assigned to an active company tenant." });
        }

        const tariff = await prisma.tariff.create({
            data: {
                name,
                pricePerKwh: parseFloat(pricePerKwh),
                currency: currency || 'GBP',
                companyId: targetCompanyId
            }
        });

        await prisma.auditLog.create({
            data: {
                action: 'CREATE',
                entity: 'TARIFF',
                entityId: tariff.id,
                details: `Created tariff plan: "${name}" (${pricePerKwh} ${tariff.currency}/kWh)`,
                ipAddress: clientIp,
                userId: userId
            }
        });

        await touchCompany(targetCompanyId);

        res.status(201).json({ success: true, data: tariff });
    } catch (error) {
        console.error("Tariff generation operation failed:", error);
        res.status(500).json({ success: false, message: "Failed to create tariff" });
    }
};

// 3. UPDATE AN EXISTING TARIFF
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

        const updatedTariff = await prisma.tariff.update({
            where: { id: tariffIdInt },
            data: {
                ...(name && { name }),
                ...(pricePerKwh !== undefined && pricePerKwh !== '' && { pricePerKwh: parseFloat(pricePerKwh) }),
                ...(currency && { currency })
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

        res.json({ success: true, data: updatedTariff });
    } catch (error) {
        console.error("Tariff modification operation failed:", error);
        res.status(500).json({ success: false, message: "Failed to update tariff" });
    }
};

// 4. DELETE A TARIFF
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