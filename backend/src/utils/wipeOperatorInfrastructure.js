const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Clears a company's existing Locations/ChargePoints/Connectors (and their
// Media) so a partner sync can rebuild fully fresh from its payload - EXCEPT
// any Connector that has real Session (charging history) attached, which is
// never deleted. A ChargePoint/Location is likewise preserved whenever it
// still has a protected Connector/ChargePoint beneath it - relationMode =
// "prisma" gives no DB-level integrity here, so the app must not delete a
// parent out from under a row it just decided to keep.
async function wipeOperatorInfrastructure(companyId) {
    const locations = await prisma.location.findMany({
        where: { companyId },
        select: {
            id: true,
            chargePoints: {
                select: {
                    id: true,
                    connectors: { select: { id: true, _count: { select: { sessions: true } } } }
                }
            }
        }
    });

    if (locations.length === 0) return;

    const connectorIdsToDelete = [];
    const chargePointIdsToDelete = [];
    const locationIdsToDelete = [];

    for (const loc of locations) {
        let locationHasProtectedChild = false;

        for (const cp of loc.chargePoints) {
            const hasProtectedConnector = cp.connectors.some(c => c._count.sessions > 0);

            if (hasProtectedConnector) {
                locationHasProtectedChild = true;
                for (const c of cp.connectors) {
                    if (c._count.sessions === 0) connectorIdsToDelete.push(c.id);
                }
            } else {
                chargePointIdsToDelete.push(cp.id);
                connectorIdsToDelete.push(...cp.connectors.map(c => c.id));
            }
        }

        if (locationHasProtectedChild) {
            // A protected ChargePoint keeps its Location alive too.
        } else {
            locationIdsToDelete.push(loc.id);
        }
    }

    await prisma.$transaction(async (tx) => {
        if (connectorIdsToDelete.length > 0) {
            await tx.connector.deleteMany({ where: { id: { in: connectorIdsToDelete } } });
        }
        if (chargePointIdsToDelete.length > 0) {
            await tx.media.deleteMany({ where: { chargePointId: { in: chargePointIdsToDelete } } });
            await tx.chargePoint.deleteMany({ where: { id: { in: chargePointIdsToDelete } } });
        }
        if (locationIdsToDelete.length > 0) {
            await tx.media.deleteMany({ where: { locationId: { in: locationIdsToDelete } } });
            await tx.location.deleteMany({ where: { id: { in: locationIdsToDelete } } });
        }
    });
}

module.exports = { wipeOperatorInfrastructure };
