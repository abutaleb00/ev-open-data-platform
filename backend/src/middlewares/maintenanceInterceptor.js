const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Intercepts public open data locations feed requests if blocked by Super Admin
 */
exports.checkLocationsGate = async (req, res, next) => {
    try {
        // Fetch the global system setting matrix configuration row (Record #1)
        const config = await prisma.systemConfig.findUnique({
            where: { id: 1 }
        });

        // If the configuration row exists and the locations pipeline flag is toggled on
        if (config && config.locationsBlocked) {
            return res.status(503).json({
                name: "MAINTENANCE_PAUSED",
                message: config.alertMessage || "The public locations open data stream is temporarily paused for optimization routines.",
                data: []
            });
        }

        // Configuration is clean, proceed down to the location controller execution
        next();
    } catch (error) {
        console.error("Locations maintenance gate validation failure:", error);
        // Fallback safety step: default to passing the request through if configuration checks error out
        next();
    }
};

/**
 * Intercepts public open data tariffs feed requests if blocked by Super Admin
 */
exports.checkTariffsGate = async (req, res, next) => {
    try {
        const config = await prisma.systemConfig.findUnique({
            where: { id: 1 }
        });

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
exports.checkPortalGate = async (req, res, next) => {
    try {
        const config = await prisma.systemConfig.findUnique({
            where: { id: 1 }
        });

        if (config && config.portalBlocked) {
            // Super Admins must always bypass maintenance intercepts so they don't lock themselves out of the portal
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