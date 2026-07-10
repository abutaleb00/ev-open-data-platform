const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Helper Function: Construct NodeMailer Production SSL Transport & Dispatch Branded HTML Template
const sendVerificationEmail = async (targetEmail, firstName, companyName, activationLink) => {
    const transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST || "mail.maanrishfaxyz.xyz",
        port: parseInt(process.env.MAIL_PORT || '465'),
        secure: true, // true for port 465 SSL connections
        auth: {
            user: process.env.MAIL_USER || "admin@maanrishfaxyz.xyz",
            pass: process.env.MAIL_PASS || "MaanRishfa@123",
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Operator Network</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
            .wrapper { max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .header { background-color: #0f172a; padding: 32px; text-align: center; }
            .brand-badge { display: inline-block; font-size: 10px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; background-color: rgba(255, 175, 0, 0.1); color: #FFAF00; padding: 6px 12px; border-radius: 9999px; border: 1px solid rgba(255, 175, 0, 0.2); font-family: monospace; }
            .header h1 { color: #ffffff; font-size: 24px; font-weight: 900; margin: 16px 0 0 0; letter-spacing: -0.025em; }
            .content { padding: 40px; color: #334155; }
            .content p { font-size: 14px; line-height: 1.6; margin: 0 0 16px 0; font-weight: 500; }
            .highlight { color: #0f172a; font-weight: 700; }
            .btn-container { text-align: center; margin: 32px 0; }
            .btn { display: inline-block; background-color: #0f172a; color: #ffffff !important; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 14px 32px; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.15); transition: background-color 0.2s; }
            .footer { background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; }
            .footer p { font-size: 11px; color: #94a3b8; margin: 0; font-weight: 500; }
            .footer a { color: #64748b; text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="header">
                <span class="brand-badge">SaaS Onboarding Matrix</span>
                <h1>Verify Your CPO Container</h1>
            </div>
            <div class="content">
                <p>Hello ${firstName},</p>
                <p>Thank you for registering your charge point operator network with the EV Open Data Platform. A new isolated ecosystem tenant partition has been successfully staged for <span class="highlight">"${companyName}"</span>.</p>
                <p>To finalize your setup and activate your network administrator access credentials, please execute the secure confirmation gateway below:</p>
                
                <div class="btn-container">
                    <a href="${activationLink}" class="btn" target="_blank">Activate Account Profile</a>
                </div>
                
                <p style="font-size: 12px; color: #64748b;">If the button above does not work, copy and paste the following absolute vector link directly into your browser address bar:</p>
                <p style="font-size: 11px; font-family: monospace; word-break: break-all; color: #94a3b8; background-color: #f1f5f9; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">${activationLink}</p>
                <p style="margin-bottom: 0;">Best regards,<br><span class="highlight">Platform Infrastructure Team</span></p>
            </div>
            <div class="footer">
                <p>This automated route was triggered by a self-registration request. If you did not initiate this command, please safely ignore this communication or contact <a href="mailto:admin@maanrishfaxyz.xyz">Security Operations</a>.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    await transporter.sendMail({
        from: process.env.SYSTEM_EMAIL_FROM || '"EV Open Data Platform" <admin@maanrishfaxyz.xyz>',
        to: targetEmail,
        subject: `[ACTION REQUIRED] Activate your EV Operator Network - ${companyName}`,
        html: htmlTemplate,
    });
};

// 1. SELF-REGISTRATION ROOT: Onboard user into an unverified state
exports.registerCompanyAndAdmin = async (req, res) => {
    try {
        const {
            companyName, companyEmail, firstName, lastName, userEmail, password
        } = req.body;

        if (!companyName || !userEmail || !password) {
            return res.status(400).json({ success: false, message: "Missing required registration parameters." });
        }

        const existingUser = await prisma.user.findUnique({ where: { email: userEmail } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "An account with this email address already exists." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const activationToken = crypto.randomBytes(32).toString('hex');

        const result = await prisma.$transaction(async (tx) => {
            const company = await tx.company.create({
                data: {
                    name: companyName,
                    contactEmail: companyEmail
                }
            });

            const combinedName = `${firstName || ''} ${lastName || ''}`.trim();

            const user = await tx.user.create({
                data: {
                    name: combinedName || null,
                    email: userEmail,
                    password: hashedPassword,
                    role: 'COMPANY_ADMIN',
                    companyId: company.id,
                    isActivated: false,
                    activationToken: activationToken
                }
            });

            return { company, user };
        });

        // Base path falls back to the environment variable, or your production domain automatically
        const frontendBaseUrl = process.env.FRONTEND_URL || 'https://evopen.maanrishfaxyz.xyz';

        const activationLink = `${frontendBaseUrl}/verify-email?token=${activationToken}`;

        sendVerificationEmail(userEmail, firstName, companyName, activationLink).catch(err => {
            console.error("Critical SMTP Pipeline Delivery Intercept Crash:", err);
        });

        await prisma.auditLog.create({
            data: {
                action: 'CREATE',
                entity: 'USER',
                entityId: result.user.id,
                details: `Self-registration initialized for <${userEmail}>. Staged company tenancy: "${companyName}". Activation email dispatched.`,
                userId: result.user.id
            }
        });

        res.status(201).json({
            success: true,
            message: "Self-registration completed. A secure validation pass link has been dispatched to your corporate email address loop."
        });

    } catch (error) {
        console.error("Corporate onboarding transaction failed:", error);
        res.status(500).json({ success: false, message: "Failed to provision corporate tenant structures due to database parameter schema mismatches." });
    }
};

// 2. EMAIL VERIFICATION CLICK HOOK: Activate account from link
exports.verifyEmailToken = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ success: false, message: "Invalid or expired activation reference token." });
        }

        const user = await prisma.user.findUnique({ where: { activationToken: token } });
        if (!user) {
            return res.status(404).json({ success: false, message: "Activation link is invalid or has already been used." });
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                isActivated: true,
                // Appends a unique hash to archive the token safely while satisfying SQL Server constraints
                activationToken: `ARCHIVED_${user.id}_${crypto.randomBytes(4).toString('hex')}`
            }
        });

        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'USER',
                entityId: updatedUser.id,
                details: `Email token validated. Account activated successfully via self-service verification link for <${updatedUser.email}>.`,
                userId: updatedUser.id
            }
        });

        res.json({ success: true, message: "Your corporate account operator profile has been verified and activated successfully! You may now proceed to log in." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "An error occurred during verification processing." });
    }
};

// 3. LOGIN CHECK: Authenticate credentials and return user profile details with tenancy scope
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, message: "Invalid credentials." });
        }

        if (!user.isActivated) {
            return res.status(403).json({
                success: false,
                message: "Access Denied: Your account profile is currently inactive. Please confirm your email signature or wait for a Super Admin manual activation override loop."
            });
        }

        const token = jwt.sign({ id: user.id, role: user.role, companyId: user.companyId }, process.env.JWT_SECRET, { expiresIn: '1d' });

        await prisma.auditLog.create({
            data: {
                action: 'LOGIN',
                entity: 'USER',
                entityId: user.id,
                details: `User <${user.email}> successfully authenticated and obtained active session JWT.`,
                userId: user.id
            }
        });

        // FIXED payload mapping block: Returns companyId to let frontend hook isolated telemetry streams cleanly
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name,
                companyId: user.companyId // <-- Added this critical structural key variable
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Login mutation runtime error." });
    }
};