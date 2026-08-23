const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Intercepts public open data locations feed requests if blocked by Super Admin
 */
const checkLocationsGate = async (req, res, next) => {
    try {
        // Fetch active system config using findFirst() to avoid ID hardcoding
        const config = await prisma.systemConfig.findFirst();

        if (config && config.locationsBlocked) {
            return res.status(503).json({
                name: "MAINTENANCE_PAUSED",
                message: config.alertMessage || "The public locations open data stream is temporarily paused for optimization routines.",
                data: []
            });
        }

        next();
    } catch (error) {
        console.error("Locations maintenance gate validation failure:", error);
        next();
    }
};

/**
 * Intercepts public open data tariffs feed requests if blocked by Super Admin
 */
const checkTariffsGate = async (req, res, next) => {
    try {
        const config = await prisma.systemConfig.findFirst();

        if (config && config.tariffsBlocked) {
            return res.status(503).json({
                name: "MAINTENANCE_PAUSED",
                message: config.alertMessage || "The public tariffs billing matrix stream is temporarily paused for optimization routines.",
                data: []
            });
        }

        next();
    } catch (error) {
        console.error("Tariffs maintenance gate validation failure:", error);
        next();
    }
};

/**
 * Intercepts general workspace operations (Operator Portals / Developer Keys Management) if blocked
 */
const checkPortalGate = async (req, res, next) => {
    try {
        const config = await prisma.systemConfig.findFirst();

        if (config && config.portalBlocked) {
            // Super Admins bypass maintenance intercepts so they don't lock themselves out
            if (req.user && req.user.role === 'SUPER_ADMIN') {
                return next();
            }

            return res.status(503).json({
                success: false,
                message: config.alertMessage || "The Operator workspace management portal is down for scheduled database index restructuring."
            });
        }

        next();
    } catch (error) {
        console.error("Portal maintenance gate validation failure:", error);
        next();
    }
};

module.exports = {
    checkLocationsGate,
    checkTariffsGate,
    checkPortalGate
};