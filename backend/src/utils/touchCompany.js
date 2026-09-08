const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Bumps Company.updatedAt whenever one of its sub-resources (Location,
// ChargePoint, Connector, Tariff) is created/updated/deleted - Prisma's
// @updatedAt only fires on a direct write to the Company record itself, so
// this must be called explicitly wherever a child resource changes.
async function touchCompany(companyId) {
    if (!companyId) return;
    await prisma.company.update({
        where: { id: companyId },
        data: { updatedAt: new Date() }
    });
}

module.exports = { touchCompany };
