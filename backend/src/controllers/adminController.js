const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper Extraction Module: Pulls real client IP down behind Nginx proxies safely
const getClientIp = (req) => {
    return req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;
};

// 1. Update Company Status (Activate / Suspend)
exports.updateCompanyStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // "ACTIVE", "SUSPENDED"
        const adminId = req.user.id;
        const companyIdInt = parseInt(id);
        const clientIp = getClientIp(req); // <-- Captures Admin request origin IP vector

        if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status state value." });
        }

        // Execute changes inside an atomic transaction block
        const result = await prisma.$transaction(async (tx) => {
            // Update the company control state
            const company = await tx.company.update({
                where: { id: companyIdInt },
                data: { status }
            });

            let detailsMessage = `Super Admin changed company "${company.name}" status to ${status}.`;

            // CASCADING ACTIVATION OVERRIDE: If company is set to ACTIVE, automatically activate its admin nodes
            if (status === 'ACTIVE') {
                const updateUsers = await tx.user.updateMany({
                    where: {
                        companyId: companyIdInt,
                        role: 'COMPANY_ADMIN',
                        isActivated: false
                    },
                    data: {
                        isActivated: true,
                        status: 'ACTIVE'
                    }
                });

                if (updateUsers.count > 0) {
                    detailsMessage += ` Cascaded auto-activation over ${updateUsers.count} nested company administrator accounts.`;
                }
            }
            // If the company is SUSPENDED, match user operational status fields to prevent active authorization passes
            else if (status === 'SUSPENDED') {
                await tx.user.updateMany({
                    where: { companyId: companyIdInt },
                    data: { status: 'SUSPENDED' }
                });
                detailsMessage += " Suspended status cascaded across all nested user profiles.";
            }

            return { company, detailsMessage };
        });

        // Log this administrative action to the audit ledger along with the captured IP Address
        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'COMPANY_STATUS',
                entityId: result.company.id,
                details: result.detailsMessage,
                ipAddress: clientIp, // <-- Populates standalone ipAddress column cleanly
                userId: adminId
            }
        });

        res.json({
            success: true,
            message: `Company state successfully updated to ${status}. Actions synchronized.`,
            data: result.company
        });
    } catch (error) {
        console.error("Administrative company status mutation failed:", error);
        res.status(500).json({ success: false, message: "Failed to update company control state." });
    }
};

// 2. Update User Account Control Status
exports.updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // "ACTIVE", "SUSPENDED", "DISABLED"
        const adminId = req.user.id;
        const clientIp = getClientIp(req); // <-- Captures Admin request origin IP vector

        if (!['ACTIVE', 'SUSPENDED', 'DISABLED'].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid user status configuration state." });
        }

        // If explicitly setting an account to ACTIVE, ensure its registration lock flag maps accurately
        const extraDataUpdate = status === 'ACTIVE' ? { isActivated: true } : {};

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { status, ...extraDataUpdate },
            select: { id: true, email: true, name: true, status: true, role: true, isActivated: true }
        });

        // Log this administrative update to the audit ledger along with the captured IP Address
        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'USER_STATUS',
                entityId: updatedUser.id,
                details: `Administrative status alteration on user "${updatedUser.email}" configured to ${status}. (Activation Status: ${updatedUser.isActivated})`,
                ipAddress: clientIp, // <-- Populates standalone ipAddress column cleanly
                userId: adminId
            }
        });

        res.json({ success: true, message: `User status parameters successfully updated to ${status}.`, data: updatedUser });
    } catch (error) {
        console.error("Administrative user status mutation failed:", error);
        res.status(500).json({ success: false, message: "Failed to apply user state modification." });
    }
};

// 3. Fetch all platform users with company contexts (Super Admin Only)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                company: { select: { name: true, status: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Remove sensitive passwords out of memory before shipping payloads
        const sanitizedUsers = users.map(({ password, ...user }) => user);

        res.json({ success: true, data: sanitizedUsers });
    } catch (error) {
        console.error("Failed to query user records index matrix:", error);
        res.status(500).json({ success: false, message: "Failed to fetch user registries." });
    }
};