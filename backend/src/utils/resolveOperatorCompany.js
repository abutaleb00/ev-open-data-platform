const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Generates a fallback operator reference ID if the payload doesn't supply one
const generateOperatorRef = (name) => {
    if (!name) return 'CEV';
    return name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'CEV';
};

// Resolves which Company a partner-authenticated request should write to.
// Shared by ingestExternalData and syncOperatorData so both endpoints behave
// identically for a given key, regardless of which URL a partner calls.
//
//   - Regular keys (isMasterKey === false) are always confined to their own,
//     already-existing company (req.partnerCompanyId) - operator_reference_id/
//     operator.name in the payload is ignored for resolution purposes. A
//     regular key must never be able to create or target another tenant.
//   - Master/aggregator keys (SUPER_ADMIN-granted only) may resolve or
//     auto-provision ANY operator by operator_reference_id/name - the
//     original integration contract this was built for (one trusted upstream
//     aggregator pushing updates for many downstream operators it manages).
async function resolveOperatorCompany({ payload, embeddedOperator = {}, isMasterKey, partnerCompanyId, clientIp }) {
    if (!isMasterKey) {
        const company = await prisma.company.findUnique({ where: { id: partnerCompanyId } });
        return { company };
    }

    const operatorName = embeddedOperator.name || payload.name || null;
    const operatorRefId = payload.operator_reference_id || embeddedOperator.operator_reference_id || (operatorName ? generateOperatorRef(operatorName) : null);
    const contactEmail = embeddedOperator.email || payload.email || (operatorRefId ? `contact@${operatorRefId.slice(0, 8).toLowerCase()}.com` : null);

    if (!operatorRefId && !operatorName) {
        return { error: "A master-key request requires 'operator_reference_id' or an 'operator.name' to identify the target operator." };
    }

    let company = await prisma.company.findFirst({
        where: {
            OR: [
                ...(operatorRefId ? [{ operatorReferenceId: operatorRefId }] : []),
                ...(operatorName ? [{ name: operatorName }] : [])
            ]
        }
    });

    if (!company) {
        company = await prisma.company.create({
            data: {
                name: operatorName || operatorRefId,
                operatorReferenceId: operatorRefId,
                contactEmail: contactEmail || `contact@${(operatorRefId || 'operator').toLowerCase()}.com`,
                status: 'ACTIVE'
            }
        });

        await prisma.auditLog.create({
            data: {
                action: 'CREATE',
                entity: 'COMPANY',
                entityId: company.id,
                details: `Auto-provisioned operator company "${company.name}" (Ref: ${operatorRefId}) via master-key partner sync.`,
                ipAddress: clientIp
            }
        });

        return { company, created: true };
    }

    if (company.status === 'SUSPENDED') {
        return { error: `Operator "${company.name}" is currently suspended and cannot be synced.`, suspended: true };
    }

    const updateData = {};
    if (operatorName && operatorName !== company.name) updateData.name = operatorName;
    if (contactEmail && contactEmail !== company.contactEmail) updateData.contactEmail = contactEmail;
    if (operatorRefId && !company.operatorReferenceId) updateData.operatorReferenceId = operatorRefId;

    if (Object.keys(updateData).length > 0) {
        company = await prisma.company.update({ where: { id: company.id }, data: updateData });

        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'COMPANY',
                entityId: company.id,
                details: `Master-key partner sync updated operator company "${company.name}" metadata.`,
                ipAddress: clientIp
            }
        });
    }

    return { company, created: false };
}

module.exports = { resolveOperatorCompany };
