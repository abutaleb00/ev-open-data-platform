const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// --- SECURITY MODULE IMPORTS ---
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

dotenv.config();

const app = express();

// 0. TRUST REVERSE PROXY HEADERS
// Tells Express to trust proxy structural headers (X-Forwarded-For) forwarded by Nginx.
// "1" indicates trust for the first hop proxy immediately preceding the application container.
app.set('trust proxy', 1);

// 1. ADVANCED SECURITY HEADERS GATE
// Sets modern HTTP headers to shield against common web vulnerabilities
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" } // Allows Next.js to pull static uploaded media/logos cleanly
}));

// 2. RESOURCE SCRAPING & DOS FLOOD PROTECTOR RATE LIMITER
// With 'trust proxy' turned active, this will rate limit by actual browser IPs instead of the loopback gateway
const globalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 Minute window block
    max: 300, // Limits each individual client IP to 300 hits per window block
    standardHeaders: 'draft-7', // Returns standardized rate limit info flags in headers
    legacyHeaders: false, // Disables old X-RateLimit-* tracking headers
    message: {
        success: false,
        message: "Too many automated application requests emitted from this network node. Access frozen temporarily."
    }
});

// Apply rate limiting blocks selectively over your API routes
app.use('/api/', globalRateLimiter);

// 3. SECURE PAYLOAD BODY PARSERS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. PRODUCTION EXPRESS CROSS-ORIGIN RESOURCE SHARING POLICY
const allowedOrigins = [
    'https://evopen.maanrishfaxyz.xyz', // Your primary production frontend link
    'http://localhost:3000',             // Local development server fallback path
    'http://127.0.0.1:3000'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow server-to-server or programmatic requests with no origin specified (like Postman/Insomnia)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Cross-Origin Request Blocked: Origin unauthorized by EV Data Hub security policies.'));
        }
    },
    credentials: true, // Enables client cookies/session tracking vectors to bridge domains securely
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// 5. PUBLIC STATIC FILE DISK HOSTING STREAM DIRECTIVE
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import Routes
const authRoutes = require('./src/routes/authRoutes');
const companyRoutes = require('./src/routes/companyRoutes');
const locationRoutes = require('./src/routes/locationRoutes');
const chargePointRoutes = require('./src/routes/chargePointRoutes');
const connectorRoutes = require('./src/routes/connectorRoutes');
const tariffRoutes = require('./src/routes/tariffRoutes');
const publicApiRoutes = require('./src/routes/publicApiRoutes');
const moderationRoutes = require('./src/routes/moderationRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const sessionRoutes = require('./src/routes/sessionRoutes');
const userRoutes = require('./src/routes/userRoutes');
const auditRoutes = require('./src/routes/auditRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const openDataRoutes = require('./src/routes/openDataRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/locations', locationRoutes);
app.use('/api/v1/charge-points', chargePointRoutes);
app.use('/api/v1/connectors', connectorRoutes);
app.use('/api/v1/tariffs', tariffRoutes);
app.use('/api/v1/public', publicApiRoutes);
app.use('/api/v1/admin/moderation', moderationRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/open-data', openDataRoutes);
app.use('/api/v1/admin', adminRoutes);

// Database connection test route using STANDARD Prisma Client
const prisma = new PrismaClient();

app.get('/api/v1/charge-points-test', async (req, res) => {
    try {
        const chargePoints = await prisma.chargePoint.findMany();
        res.json({ success: true, data: chargePoints });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Database connection failed." });
    }
});

// Fallback Route Handler for unmapped, rogue API requests
app.use((req, res) => {
    res.status(404).json({ success: false, message: "Requested resource coordinate vector not found." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running securely on port ${PORT}`));