const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. READ ALL: Fetch multi-tenant companies with dynamically rolled-up hardware counts
exports.getAllCompanies = async (req, res) => {
    try {
        // Fetch companies along with their locations and the count of charge points per location
        const companies = await prisma.company.findMany({
            include: {
                _count: {
                    select: { users: true, locations: true }
                },
                locations: {
                    select: {
                        _count: {
                            select: { chargePoints: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Map through the results to calculate the total charge points for each company
        const formattedCompanies = companies.map(company => {
            const totalChargePoints = company.locations.reduce((sum, loc) => sum + loc._count.chargePoints, 0);

            return {
                id: company.id,
                name: company.name,
                contactEmail: company.contactEmail,
                status: company.status, 
                createdAt: company.createdAt,
                _count: {
                    users: company._count.users,
                    locations: company._count.locations,
                    chargePoints: totalChargePoints
                }
            };
        });

        res.json({ success: true, data: formattedCompanies });
    } catch (error) {
        console.error("Failed to query multi-tenant corporate index:", error);
        res.status(500).json({ success: false, message: "Failed to fetch companies" });
    }
};

// 2. ADMINISTRATIVE CREATE: Manually provision a brand new company profile container
exports.createCompany = async (req, res) => {
    try {
        const { name, contactEmail } = req.body;

        if (!name || !contactEmail) {
            return res.status(400).json({ success: false, message: "Missing required profile metadata parameters." });
        }

        const company = await prisma.company.create({
            data: {
                name,
                contactEmail,
                status: "ACTIVE" 
            }
        });

        // Log this action to the audit track ledger
        await prisma.auditLog.create({
            data: {
                action: 'CREATE',
                entity: 'COMPANY',
                entityId: company.id,
                details: `Administrative creation of company container: "${name}".`,
                userId: req.user.id
            }
        });

        res.status(201).json({ success: true, data: company });
    } catch (error) {
        console.error("Administrative company creation failed:", error);
        res.status(500).json({ success: false, message: "Failed to create company" });
    }
};

// 3. ADMINISTRATIVE UPDATE: Align high-level descriptive variable configurations
exports.updateCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, contactEmail } = req.body;

        const company = await prisma.company.update({
            where: { id: parseInt(id) },
            data: { name, contactEmail }
        });

        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'COMPANY',
                entityId: company.id,
                details: `Company metadata aligned. Modified targets: Name: "${name}", Email: "${contactEmail}".`,
                userId: req.user.id
            }
        });

        res.json({ success: true, data: company });
    } catch (error) {
        console.error("Administrative company modification failed:", error);
        res.status(500).json({ success: false, message: "Failed to update company" });
    }
};

// 4. DESTRUCTIVE PURGE TRANSACTION: Cascade-drop relational constraints to bypass SQL Server blocks
exports.deleteCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const companyIdInt = parseInt(id);

        // Execute dynamic cascaded drop inside a Prisma transaction to clear NoAction foreign limits
        await prisma.$transaction(async (tx) => {

            // 1. Fetch targeted location ids for deeper parsing downstream
            const locationIds = await tx.location.findMany({
                where: { companyId: companyIdInt },
                select: { id: true }
            }).then(locs => locs.map(l => l.id));

            if (locationIds.length > 0) {
                // 2. Clear media tracking files matching location dependencies
                await tx.media.deleteMany({
                    where: { locationId: { in: locationIds } }
                });

                // 3. Find connected charge point devices
                const cpIds = await tx.chargePoint.findMany({
                    where: { locationId: { in: locationIds } },
                    select: { id: true }
                }).then(cps => cps.map(c => c.id)); // FIXED: Removed leaked global syntax reference loop `cps => d = ...`

                if (cpIds.length > 0) {
                    // 4. Find nested child terminal connectors
                    const connIds = await tx.connector.findMany({
                        where: { chargePointId: { in: cpIds } },
                        select: { id: true }
                    }).then(conns => conns.map(c => c.id));

                    if (connIds.length > 0) {
                        // 5. Purge active/historical sessions and structural plugs
                        await tx.session.deleteMany({ where: { connectorId: { in: connIds } } });
                        await tx.connector.deleteMany({ where: { chargePointId: { in: cpIds } } });
                    }
                    // 6. Purge hardware nodes
                    await tx.chargePoint.deleteMany({ where: { locationId: { in: locationIds } } });
                }
                // 7. Purge parent spatial fields and linked commercial pricing structures
                await tx.location.deleteMany({ where: { companyId: companyIdInt } });
                await tx.tariff.deleteMany({ where: { companyId: companyIdInt } });
            }

            // 8. Dissociate active integration credentials and nested tenant profiles
            await tx.apiKey.deleteMany({ where: { companyId: companyIdInt } });
            await tx.user.deleteMany({ where: { companyId: companyIdInt } });

            // 9. Wipe the parent company record entry cleanly out of the database structure
            await tx.company.delete({ where: { id: companyIdInt } });
        });

        res.json({ success: true, message: "Company and all associated cascading infrastructure elements successfully purged from records archive." });
    } catch (error) {
        console.error("Destructive transaction chain collapsed:", error);
        res.status(500).json({ success: false, message: "Failed to purge operational entity structures cleanly." });
    }
};

// 5. CPO SELF-SERVICE PROFILE: Allow an authorized tenant workspace administrator to alter own endpoints
exports.updateMyCompany = async (req, res) => {
    try {
        const { companyId } = req.user; 
        const { name, contactEmail } = req.body;

        if (!companyId) {
            return res.status(403).json({ 
                success: false, 
                message: "Access Denied: Your profile node is not linked to an operational company tenant." 
            });
        }

        const updatedCompany = await prisma.company.update({
            where: { id: companyId },
            data: { name, contactEmail }
        });

        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'COMPANY_SELF_PROFILE',
                entityId: updatedCompany.id,
                details: `Company Admin updated profile metrics. Corporate Name: "${name}", Email: "${contactEmail}".`,
                userId: req.user.id
            }
        });

        res.json({ 
            success: true, 
            message: "Corporate network profile settings updated successfully.", 
            data: updatedCompany 
        });
    } catch (error) {
        console.error("Self-service company settings mutation failed:", error);
        res.status(500).json({ success: false, message: "Failed to align corporate tenancy workspace properties." });
    }
};