const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { hashApiKey } = require('../utils/apiKeyHash');

/**
 * PROTECT: Verifies the JWT, attaches the user + company context,
 * and enforces strict tenancy/user status lifecycle boundaries.
 * Used for routes that require ANY active logged-in user.
 */
exports.protect = async (req, res, next) => {
    let token;

    // 1. Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // Fallback: Check if token is in cookies
    else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "You are not logged in. Please log in to get access."
        });
    }

    try {
        // 2. Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3. Check if user still exists in the database and include parent company context
        const currentUser = await prisma.user.findUnique({
            where: { id: decoded.id },
            include: { company: true }
        });

        if (!currentUser) {
            return res.status(401).json({
                success: false,
                message: "The user belonging to this token no longer exists."
            });
        }

        // 4. SECURITY BOUNDARY CHECK: Verify User Lifecycle Status
        if (currentUser.status !== 'ACTIVE') {
            return res.status(403).json({
                success: false,
                message: "Your user account has been suspended or disabled by system administrators."
            });
        }

        // 5. SECURITY BOUNDARY CHECK: Verify Parent Operator Company Status
        // Super Admins can bypass company states to allow administrative fixes
        if (currentUser.company && currentUser.role !== 'SUPER_ADMIN') {

            // Handle Pending State Separately for Onboarding Clarity
            if (currentUser.company.status === 'PENDING') {
                return res.status(403).json({
                    success: false,
                    message: "Your corporate tenant profile setup is PENDING system approval. Access will unlock shortly."
                });
            }

            // Handle Suspended State Explicitly
            if (currentUser.company.status !== 'ACTIVE') {
                return res.status(403).json({
                    success: false,
                    message: "Your parent operator company is currently suspended. Access is restricted."
                });
            }
        }

        // 6. Grant access to protected route and attach contextualized user object to the request
        req.user = currentUser;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token. Please log in again."
        });
    }
};

/**
 * RESTRICT TO: Checks if the logged-in user has the required role.
 * MUST be used AFTER the `protect` middleware.
 * Example: router.use(restrictTo('SUPER_ADMIN', 'COMPANY_ADMIN'))
 */
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        // req.user is guaranteed to exist here because this runs after protect()
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to perform this action."
            });
        }
        next();
    };
};

/**
 * VERIFY PARTNER API KEY: Validates the incoming token sent by the client team
 * inside the 'x-api-key' header for the data ingestion endpoint.
 */
exports.verifyPartnerApiKey = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];

        if (!apiKey) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Missing API Key inside 'x-api-key' header."
            });
        }

        // Search database for the provided key (by its hash) and verify its tenant status
        const keyRecord = await prisma.apiKey.findUnique({
            where: { key: hashApiKey(apiKey) },
            include: { company: true }
        });

        if (!keyRecord || !keyRecord.isActive) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Invalid or deactivated API Key."
            });
        }

        // Confirm parent company is active
        if (keyRecord.company.status !== 'ACTIVE') {
            return res.status(403).json({
                success: false,
                message: "Forbidden: The parent company tied to this API key is not active."
            });
        }

        // Attach company context to the request for the ingestion controller
        req.partnerCompanyId = keyRecord.companyId;
        req.isMasterKey = keyRecord.isMaster;
        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal security engine error during validation."
        });
    }
};