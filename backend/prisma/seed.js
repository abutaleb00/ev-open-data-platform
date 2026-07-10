const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Initializing master database seeding routine...');

    // 1. Define Super Admin profile configuration metrics
    const adminEmail = 'admin@evopen.co.uk';
    const rawPassword = 'Admin123!'; // Replace this with your secure key management password string

    // 2. Prevent duplicate entries on consecutive seed executions
    const existingUser = await prisma.user.findUnique({
        where: { email: adminEmail }
    });

    if (existingUser) {
        console.log(`⚠️  Aborting write: An account matching "${adminEmail}" already has active state parameters.`);
        return;
    }

    // 3. Hash the credentials via bcryptjs matching backend authentication constraints
    console.log('🔒 Cryptographically hashing master access credentials...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    // 4. Execute transaction push straight down into MySQL
    console.log('🚀 Provisioning Super Admin account row profile metrics...');
    const superAdmin = await prisma.user.create({
        data: {
            email: adminEmail,
            password: hashedPassword,
            name: 'Root Platform Administrator',
            phoneNumber: '+44 7700 900077',
            locationStr: 'London Headquarters, UK',
            role: 'SUPER_ADMIN',
            isActivated: true,
            status: 'ACTIVE'
        }
    });

    // 5. Build global baseline system layout variables mapping onto the interceptor gates
    console.log('🎛️  Hydrating system configuration baseline constants...');
    await prisma.systemConfig.create({
        data: {
            globalAlert: false,
            alertMessage: 'System architecture running within standard parameters.',
            locationsBlocked: false,
            tariffsBlocked: false,
            portalBlocked: false,
            keysBlocked: false
        }
    });

    console.log('---');
    console.log('✅ DATABASE SEED COMPLETE');
    console.log(`Identity Node Email: ${superAdmin.email}`);
    console.log(`Temporary Passkey:   ${rawPassword}`);
    console.log('---');
}

main()
    .catch((e) => {
        console.error('❌ Database seed execution encountered a terminal break exception:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });