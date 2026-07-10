const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. GET ALL: Tenant-isolated lookup stream
exports.getAllTariffs = async (req, res) => {
    try {
        const { role, companyId } = req.user;
        const isSuperAdmin = role === 'SUPER_ADMIN';

        // Enforce strict multi-tenant containment rules
        const whereClause = isSuperAdmin ? {} : { companyId: parseInt(companyId) };

        const tariffs = await prisma.tariff.findMany({
            where: whereClause,
            include: {
                company: {
                    select: { name: true }
                },
                _count: {
                    select: { connectors: true }
                }
            },
            orderBy: { id: 'desc' }
        });

        res.json({ success: true, data: tariffs });
    } catch (error) {
        console.error("Failed to fetch multi-tenant tariff matrix:", error);
        res.status(500).json({ success: false, message: "Failed to fetch tariffs" });
    }
};

// 2. CREATE: Auto-assigns or verifies company ownership bounds
exports.createTariff = async (req, res) => {
    try {
        const { role, companyId: userCompanyId } = req.user;
        const { name, pricePerKwh, currency, companyId } = req.body;

        if (!name || pricePerKwh === undefined) {
            return res.status(400).json({ success: false, message: "Missing required price configuration fields." });
        }

        // Super Admins specify target tenant; Company Admins are strictly bound to their own session id
        const targetCompanyId = role === 'SUPER_ADMIN' ? parseInt(companyId) : parseInt(userCompanyId);

        if (!targetCompanyId) {
            return res.status(400).json({ success: false, message: "Tariff plan must be assigned to an active company tenant." });
        }

        const tariff = await prisma.tariff.create({
            data: {
                name,
                pricePerKwh: parseFloat(pricePerKwh),
                currency: currency || 'GBP', // Compliance tracking marker (UK Public Charge Point Regulations 2023)
                companyId: targetCompanyId
            }
        });

        res.status(201).json({ success: true, data: tariff });
    } catch (error) {
        console.error("Tariff generation operation failed:", error);
        res.status(500).json({ success: false, message: "Failed to create tariff" });
    }
};

// 3. UPDATE: Safe contextual modification validation check
exports.updateTariff = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, companyId } = req.user;
        const { name, pricePerKwh, currency } = req.body;
        const tariffIdInt = parseInt(id);

        // Find target tariff to verify ownership before applying modifications
        const baselineTariff = await prisma.tariff.findUnique({ where: { id: tariffIdInt } });

        if (!baselineTariff) {
            return res.status(404).json({ success: false, message: "Target tariff plan not found." });
        }

        // Prevent cross-tenant data tampering attempts
        if (role !== 'SUPER_ADMIN' && baselineTariff.companyId !== parseInt(companyId)) {
            return res.status(403).json({ success: false, message: "Access Denied: Cannot modify infrastructure out of tenant scope bounds." });
        }

        const updatedTariff = await prisma.tariff.update({
            where: { id: tariffIdInt },
            data: {
                ...(name && { name }),
                ...(pricePerKwh !== undefined && { pricePerKwh: parseFloat(pricePerKwh) }),
                ...(currency && { currency })
            }
        });

        res.json({ success: true, data: updatedTariff });
    } catch (error) {
        console.error("Tariff modification operation failed:", error);
        res.status(500).json({ success: false, message: "Failed to update tariff" });
    }
};

// 4. DELETE: Relational tracking check before purge execution
exports.deleteTariff = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, companyId } = req.user;
        const tariffIdInt = parseInt(id);

        const baselineTariff = await prisma.tariff.findUnique({ where: { id: tariffIdInt } });

        if (!baselineTariff) {
            return res.status(404).json({ success: false, message: "Target tariff plan not found." });
        }

        // Ownership enforcement check
        if (role !== 'SUPER_ADMIN' && baselineTariff.companyId !== parseInt(companyId)) {
            return res.status(403).json({ success: false, message: "Access Denied: Cannot delete infrastructure out of tenant scope bounds." });
        }

        await prisma.tariff.delete({
            where: { id: tariffIdInt }
        });

        res.json({ success: true, message: "Tariff plan successfully removed from corporate records." });
    } catch (error) {
        console.error("Tariff deletion sequence failed:", error);
        // Intercept database foreign constraint blocks gracefully
        if (error.code === 'P2003') {
            return res.status(400).json({
                success: false,
                message: "Cannot delete tariff plan. It is actively linked to deployed and operational hardware connector nodes."
            });
        }
        res.status(500).json({ success: false, message: "Failed to delete tariff" });
    }
};