const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getClientIp = (req) => {
    return req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;
};

// 1. READ ALL: Return company registry enriched with operator logo, website, and owner metadata
exports.getAllCompanies = async (req, res) => {
    try {
        const { role, companyId } = req.user;
        const isSuperAdmin = role === 'SUPER_ADMIN';

        // Non-super-admins may only ever see their own company record - the platform's
        // full tenant list must never be exposed to a regular COMPANY_ADMIN/STAFF user.
        const whereClause = isSuperAdmin ? {} : { id: parseInt(companyId, 10) };

        const companies = await prisma.company.findMany({
            where: whereClause,
            include: {
                _count: {
                    select: { users: true, locations: true }
                },
                locations: {
                    select: {
                        operatorData: true,
                        ownerData: true,
                        _count: {
                            select: { chargePoints: true }
                        }
                    },
                    orderBy: { updatedAt: 'desc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formattedCompanies = companies.map(company => {
            const totalChargePoints = company.locations.reduce(
                (sum, loc) => sum + (loc._count?.chargePoints || 0),
                0
            );

            let operatorDetails = null;
            let ownerDetails = null;
            let realOperatorName = company.name;

            // locations is ordered most-recently-updated first; use the newest
            // location that actually carries operator/owner data rather than
            // blindly reading index 0, which may be a location a sync payload
            // never touched.
            const enrichedLoc = company.locations.find(loc => loc.operatorData || loc.ownerData);
            if (enrichedLoc) {
                try {
                    if (enrichedLoc.operatorData) {
                        operatorDetails = JSON.parse(enrichedLoc.operatorData);
                        if (operatorDetails?.name) realOperatorName = operatorDetails.name;
                    }
                    if (enrichedLoc.ownerData) {
                        ownerDetails = JSON.parse(enrichedLoc.ownerData);
                    }
                } catch (_) { }
            }

            return {
                id: company.id,
                name: realOperatorName,
                operatorReferenceId: company.operatorReferenceId,
                contactEmail: company.contactEmail,
                status: company.status,
                createdAt: company.createdAt,
                updatedAt: company.updatedAt,

                // Enriched metadata from payload
                website: operatorDetails?.website || null,
                logo: operatorDetails?.logo || null,
                operator: operatorDetails,
                owner: ownerDetails,

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

// 2. ADMINISTRATIVE CREATE
exports.createCompany = async (req, res) => {
    try {
        const { name, contactEmail, operatorReferenceId } = req.body;
        const clientIp = getClientIp(req);

        if (!name || !contactEmail) {
            return res.status(400).json({ success: false, message: "Missing required profile metadata parameters." });
        }

        const company = await prisma.company.create({
            data: {
                name,
                contactEmail,
                operatorReferenceId: operatorReferenceId || null,
                status: "ACTIVE"
            }
        });

        await prisma.auditLog.create({
            data: {
                action: 'CREATE',
                entity: 'COMPANY',
                entityId: company.id,
                details: `Administrative creation of company container: "${name}".`,
                ipAddress: clientIp,
                userId: req.user.id
            }
        });

        res.status(201).json({ success: true, data: company });
    } catch (error) {
        console.error("Administrative company creation failed:", error);
        res.status(500).json({ success: false, message: "Failed to create company" });
    }
};

// 3. ADMINISTRATIVE UPDATE
exports.updateCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, contactEmail, operatorReferenceId } = req.body;
        const clientIp = getClientIp(req);

        const company = await prisma.company.update({
            where: { id: parseInt(id, 10) },
            data: {
                name,
                contactEmail,
                ...(operatorReferenceId !== undefined && { operatorReferenceId })
            }
        });

        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'COMPANY',
                entityId: company.id,
                details: `Company metadata aligned. Modified targets: Name: "${name}", Email: "${contactEmail}".`,
                ipAddress: clientIp,
                userId: req.user.id
            }
        });

        res.json({ success: true, data: company });
    } catch (error) {
        console.error("Administrative company modification failed:", error);
        res.status(500).json({ success: false, message: "Failed to update company" });
    }
};

// 4. DESTRUCTIVE PURGE TRANSACTION
exports.deleteCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const companyIdInt = parseInt(id, 10);
        const clientIp = getClientIp(req);

        await prisma.$transaction(async (tx) => {
            const locationIds = await tx.location.findMany({
                where: { companyId: companyIdInt },
                select: { id: true }
            }).then(locs => locs.map(l => l.id));

            if (locationIds.length > 0) {
                await tx.media.deleteMany({
                    where: { locationId: { in: locationIds } }
                });

                const cpIds = await tx.chargePoint.findMany({
                    where: { locationId: { in: locationIds } },
                    select: { id: true }
                }).then(cps => cps.map(c => c.id));

                if (cpIds.length > 0) {
                    const connIds = await tx.connector.findMany({
                        where: { chargePointId: { in: cpIds } },
                        select: { id: true }
                    }).then(conns => conns.map(c => c.id));

                    if (connIds.length > 0) {
                        await tx.session.deleteMany({ where: { connectorId: { in: connIds } } });
                        await tx.connector.deleteMany({ where: { chargePointId: { in: cpIds } } });
                    }
                    await tx.chargePoint.deleteMany({ where: { locationId: { in: locationIds } } });
                }
                await tx.location.deleteMany({ where: { companyId: companyIdInt } });
                await tx.tariff.deleteMany({ where: { companyId: companyIdInt } });
            }

            await tx.apiKey.deleteMany({ where: { companyId: companyIdInt } });
            await tx.user.deleteMany({ where: { companyId: companyIdInt } });
            await tx.company.delete({ where: { id: companyIdInt } });
        });

        await prisma.auditLog.create({
            data: {
                action: 'DELETE',
                entity: 'COMPANY',
                entityId: companyIdInt,
                details: `Permanently deleted company partition [ID: ${companyIdInt}] and all associated infrastructure elements.`,
                ipAddress: clientIp,
                userId: req.user.id
            }
        });

        res.json({ success: true, message: "Company and all associated infrastructure elements successfully purged." });
    } catch (error) {
        console.error("Destructive transaction chain collapsed:", error);
        res.status(500).json({ success: false, message: "Failed to purge operational entity structures cleanly." });
    }
};

// 5. CPO SELF-SERVICE PROFILE
exports.updateMyCompany = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { name, contactEmail } = req.body;
        const clientIp = getClientIp(req);

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
                ipAddress: clientIp,
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