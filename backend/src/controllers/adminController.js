const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { refreshRateLimitCache } = require('../middlewares/requestTracker');

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
        const companyIdInt = parseInt(id, 10);
        const clientIp = getClientIp(req);

        if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status state value." });
        }

        // Execute changes inside an atomic transaction block
        const result = await prisma.$transaction(async (tx) => {
            const company = await tx.company.update({
                where: { id: companyIdInt },
                data: { status }
            });

            let detailsMessage = `Super Admin changed company "${company.name}" status to ${status}.`;

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
            } else if (status === 'SUSPENDED') {
                await tx.user.updateMany({
                    where: { companyId: companyIdInt },
                    data: { status: 'SUSPENDED' }
                });
                detailsMessage += " Suspended status cascaded across all nested user profiles.";
            }

            return { company, detailsMessage };
        });

        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'COMPANY_STATUS',
                entityId: result.company.id,
                details: result.detailsMessage,
                ipAddress: clientIp,
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
        const clientIp = getClientIp(req);

        if (!['ACTIVE', 'SUSPENDED', 'DISABLED'].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid user status configuration state." });
        }

        const extraDataUpdate = status === 'ACTIVE' ? { isActivated: true } : {};

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id, 10) },
            data: { status, ...extraDataUpdate },
            select: { id: true, email: true, name: true, status: true, role: true, isActivated: true }
        });

        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'USER_STATUS',
                entityId: updatedUser.id,
                details: `Administrative status alteration on user "${updatedUser.email}" configured to ${status}. (Activation Status: ${updatedUser.isActivated})`,
                ipAddress: clientIp,
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

        const sanitizedUsers = users.map(({ password, ...user }) => user);

        res.json({ success: true, data: sanitizedUsers });
    } catch (error) {
        console.error("Failed to query user records index matrix:", error);
        res.status(500).json({ success: false, message: "Failed to fetch user registries." });
    }
};

// ------------------------------------------------------
// 4. DYNAMIC RATE LIMITING & SYSTEM CONFIGURATION
// ------------------------------------------------------

// Fetch System Rate Limit Settings
exports.getRateLimitConfig = async (req, res) => {
    try {
        let config = await prisma.systemConfig.findFirst();
        if (!config) {
            config = await prisma.systemConfig.create({
                data: {
                    alertMessage: "System Operational",
                    feedRateLimitMax: 100,
                    feedRateLimitWindow: 300, // Default 300 seconds
                    rateLimitingEnabled: true
                }
            });
        }

        res.json({
            success: true,
            data: {
                feedRateLimitMax: config.feedRateLimitMax,
                feedRateLimitWindow: config.feedRateLimitWindow, // Returned in SECONDS
                rateLimitingEnabled: config.rateLimitingEnabled,
                updatedAt: config.updatedAt
            }
        });
    } catch (error) {
        console.error("Get rate limit config error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch rate limit settings." });
    }
};

// Update System Rate Limit Policies
exports.updateRateLimitConfig = async (req, res) => {
    try {
        const { feedRateLimitMax, feedRateLimitWindow, rateLimitingEnabled } = req.body;
        const adminId = req.user.id;
        const clientIp = getClientIp(req);

        const parsedMax = parseInt(feedRateLimitMax, 10);
        const parsedWindow = parseInt(feedRateLimitWindow, 10);

        if (isNaN(parsedMax) || parsedMax < 1) {
            return res.status(400).json({ success: false, message: "Max requests must be a positive integer." });
        }

        if (isNaN(parsedWindow) || parsedWindow < 1) {
            return res.status(400).json({ success: false, message: "Window size must be at least 1 second." });
        }

        let config = await prisma.systemConfig.findFirst();

        if (config) {
            config = await prisma.systemConfig.update({
                where: { id: config.id },
                data: {
                    feedRateLimitMax: parsedMax,
                    feedRateLimitWindow: parsedWindow, // Stores SECONDS
                    rateLimitingEnabled: Boolean(rateLimitingEnabled)
                }
            });
        } else {
            config = await prisma.systemConfig.create({
                data: {
                    alertMessage: "System Operational",
                    feedRateLimitMax: parsedMax,
                    feedRateLimitWindow: parsedWindow,
                    rateLimitingEnabled: Boolean(rateLimitingEnabled)
                }
            });
        }

        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'SYSTEM_CONFIG',
                entityId: config.id,
                details: `Super Admin updated rate limit policy: Max ${parsedMax} reqs / ${parsedWindow} seconds (Active: ${rateLimitingEnabled}).`,
                ipAddress: clientIp,
                userId: adminId
            }
        });

        if (typeof refreshRateLimitCache === 'function') {
            await refreshRateLimitCache();
        }

        res.json({
            success: true,
            message: "Rate limiting policies updated successfully.",
            data: {
                feedRateLimitMax: config.feedRateLimitMax,
                feedRateLimitWindow: config.feedRateLimitWindow,
                rateLimitingEnabled: config.rateLimitingEnabled,
                updatedAt: config.updatedAt
            }
        });
    } catch (error) {
        console.error("Update rate limit config error:", error);
        res.status(500).json({ success: false, message: "Failed to save rate limit settings." });
    }
};