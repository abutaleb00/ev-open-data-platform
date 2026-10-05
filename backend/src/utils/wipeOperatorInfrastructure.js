const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Prunes a company's Locations/ChargePoints/Connectors (and their Media) down to only
// what a sync/ingest payload just referenced - EXCEPT any Connector that has real Session
// (charging history) attached, which is never deleted. A ChargePoint/Location is likewise
// preserved whenever it still has a protected Connector/ChargePoint beneath it -
// relationMode = "prisma" gives no DB-level integrity here, so the app must not delete a
// parent out from under a row it just decided to keep.
//
// `keepSets` describes what THIS sync call referenced:
//   - keptLocationIds: Location.id[] upserted this call
//   - keptChargePointIdsByLocation: { [locationId]: ChargePoint.id[] } upserted this call
//   - keptConnectorIdsByChargePoint: { [chargePointId]: Connector.id[] } upserted this call
// A location/chargePoint/connector NOT in the relevant set is stale and gets removed
// (subject to the session-protection rule above). Anything in a set is left untouched here
// - the caller already upserted it with the fields the payload provided.
//
// Called with no keepSets (or omitted), every row is treated as stale - this reproduces the
// original "wipe everything for this company" behavior in full.
async function pruneOperatorInfrastructure(companyId, keepSets = {}) {
    const {
        keptLocationIds = [],
        keptChargePointIdsByLocation = {},
        keptConnectorIdsByChargePoint = {}
    } = keepSets;

    const keptLocationIdSet = new Set(keptLocationIds);

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
        const locationIsKept = keptLocationIdSet.has(loc.id);
        const keptCpIds = new Set(keptChargePointIdsByLocation[loc.id] || []);

        let locationHasProtectedChild = false;

        for (const cp of loc.chargePoints) {
            const cpIsKept = locationIsKept && keptCpIds.has(cp.id);
            const hasProtectedConnector = cp.connectors.some(c => c._count.sessions > 0);

            if (!cpIsKept) {
                // Stale charge point (its location is gone this sync, or the EVSE itself
                // wasn't referenced) - delete it, same session-protection rule as always.
                if (hasProtectedConnector) {
                    locationHasProtectedChild = true;
                    for (const c of cp.connectors) {
                        if (c._count.sessions === 0) connectorIdsToDelete.push(c.id);
                    }
                } else {
                    chargePointIdsToDelete.push(cp.id);
                    connectorIdsToDelete.push(...cp.connectors.map(c => c.id));
                }
            } else {
                // Charge point is kept - only prune connectors this sync didn't reference.
                const keptConnIds = new Set(keptConnectorIdsByChargePoint[cp.id] || []);
                for (const c of cp.connectors) {
                    if (!keptConnIds.has(c.id) && c._count.sessions === 0) {
                        connectorIdsToDelete.push(c.id);
                    }
                }
            }
        }

        if (!locationIsKept && !locationHasProtectedChild) {
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

module.exports = {
    pruneOperatorInfrastructure,
    // Back-compat alias: a full wipe is just a prune with nothing kept.
    wipeOperatorInfrastructure: (companyId) => pruneOperatorInfrastructure(companyId, {})
};
