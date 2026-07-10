const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

// Helper function to extract a file name from a public URL and purge it from the server's hard drive
const purgePhysicalFile = (url) => {
    try {
        const filename = url.split('/uploads/locations/')[1];
        if (filename) {
            const physicalPath = path.join(__dirname, '../../uploads/locations', filename);
            if (fs.existsSync(physicalPath)) {
                fs.unlinkSync(physicalPath);
                return true;
            }
        }
    } catch (err) {
        console.error(`Failed to unlink local server file trace for path [${url}]:`, err);
    }
    return false;
};

// Get all locations (Filtered by role, searchable by text query, and filterable by approval status)
exports.getAllLocations = async (req, res) => {
    try {
        const { role, companyId } = req.user;
        const { search, status } = req.query;
        const isSuperAdmin = role === 'SUPER_ADMIN';

        // 1. Core Role-Based Boundary Guard
        const whereClause = isSuperAdmin ? {} : { companyId: parseInt(companyId) };

        // 2. Add Status Filter if provided ('approved' or 'pending')
        if (status) {
            whereClause.isApproved = status === 'approved';
        }

        // 3. Add Dynamic Text Search across Company Name, Postcode, and Location Name
        if (search && search.trim() !== '') {
            const searchString = search.trim();

            whereClause.AND = [
                ...(whereClause.AND || []),
                {
                    OR: [
                        { name: { contains: searchString } },
                        { postcode: { contains: searchString } },
                        { city: { contains: searchString } },
                        {
                            company: {
                                name: { contains: searchString }
                            }
                        }
                    ]
                }
            ];
        }

        const locations = await prisma.location.findMany({
            where: whereClause,
            include: {
                company: {
                    select: { name: true }
                },
                media: {
                    select: { id: true, url: true, type: true }
                },
                _count: {
                    select: { chargePoints: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: locations });
    } catch (error) {
        console.error("Filter matrix failure:", error);
        res.status(500).json({ success: false, message: "Failed to query searchable locations registry." });
    }
};

// Create a new location with structured OCPI parameters and multi-image filesystem uploads
exports.createLocation = async (req, res) => {
    try {
        const {
            name, address, postcode, latitude, longitude, amenities, companyId,
            city, state, countryCode, partyId, countryISO, parkingType, timeZone
        } = req.body;
        const { id: userId, role, companyId: userCompanyId } = req.user;

        // Force Company Admins to only create locations for their own company context
        const targetCompanyId = role === 'SUPER_ADMIN' ? parseInt(companyId) : parseInt(userCompanyId);

        if (!targetCompanyId) {
            return res.status(400).json({ success: false, message: "A valid company context id must be resolved to create a location entry." });
        }

        // --- ENHANCEMENT: GEOSPATIAL VECTOR GUARDRAILS ---
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
            return res.status(400).json({
                success: false,
                message: "Geospatial vector values fall outside valid global boundaries (Latitude: -90 to 90, Longitude: -180 to 180)."
            });
        }

        // Run sequential insertions inside an atomic database write loop transaction container
        const result = await prisma.$transaction(async (tx) => {
            const location = await tx.location.create({
                data: {
                    name,
                    address,
                    postcode,
                    latitude: lat,
                    longitude: lng,
                    amenities,
                    companyId: targetCompanyId,

                    // --- OCPI ATTRIBUTES ---
                    city: city || "Unknown City",
                    state: state || null,
                    countryCode: countryCode || "GB",
                    partyId: partyId || "CEV",
                    countryISO: countryISO || "GBR",
                    parkingType: parkingType || "UNKNOWN",
                    timeZone: timeZone || "Europe/London"
                }
            });

            // Map and store local file reference pointers if present in multi-part payload request
            if (req.files && req.files.length > 0) {
                const mediaData = req.files.map(file => ({
                    url: `${req.protocol}://${req.get('host')}/uploads/locations/${file.filename}`,
                    type: file.mimetype,
                    locationId: location.id
                }));

                await tx.media.createMany({ data: mediaData });
            }

            return location;
        });

        // Log this structural action inside our audit engine ledger
        await prisma.auditLog.create({
            data: {
                action: 'CREATE',
                entity: 'LOCATION',
                entityId: result.id,
                details: `Created new OCPI compliant location: "${name}" with attached images.`,
                userId: userId
            }
        });

        res.status(201).json({ success: true, data: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to create infrastructure location point entry." });
    }
};

// Update an existing location including its mutable OCPI parameters and media storage attachments
exports.updateLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, address, postcode, latitude, longitude, amenities, isApproved,
            city, state, countryCode, partyId, countryISO, parkingType, timeZone
        } = req.body;
        const userId = req.user.id;

        // --- NEW: SANITIZE MULTIPART TEXT STRINGS TO NATIVE TYPES ---
        let parsedIsApproved = undefined;
        if (isApproved !== undefined) {
            parsedIsApproved = isApproved === 'true' || isApproved === true;
        }

        const updateData = {
            ...(name && { name }),
            ...(address && { address }),
            ...(postcode && { postcode }),
            ...(amenities && { amenities }),
            ...(parsedIsApproved !== undefined && { isApproved: parsedIsApproved }),
            ...(city && { city }),
            ...(state !== undefined && { state }),
            ...(countryCode && { countryCode }),
            ...(partyId && { partyId }),
            ...(countryISO && { countryISO }),
            ...(parkingType && { parkingType }),
            ...(timeZone && { timeZone })
        };

        // --- ENHANCEMENT: GEOSPATIAL VECTOR GUARDRAILS ---
        if (latitude !== undefined || longitude !== undefined) {
            if (latitude) updateData.latitude = parseFloat(latitude);
            if (longitude) updateData.longitude = parseFloat(longitude);

            const finalLat = updateData.latitude;
            const finalLng = updateData.longitude;

            if ((finalLat !== undefined && (isNaN(finalLat) || finalLat < -90 || finalLat > 90)) ||
                (finalLng !== undefined && (isNaN(finalLng) || finalLng < -180 || finalLng > 180))) {
                return res.status(400).json({
                    success: false,
                    message: "Provided geospatial parameters violate mathematical map projection limits."
                });
            }
        }

        const location = await prisma.location.update({
            where: { id: parseInt(id) },
            data: updateData
        });

        // Process file attachments appended during modifications
        if (req.files && req.files.length > 0) {
            const mediaData = req.files.map(file => ({
                url: `${req.protocol}://${req.get('host')}/uploads/locations/${file.filename}`,
                type: file.mimetype,
                locationId: location.id
            }));

            await prisma.media.createMany({ data: mediaData });
        }

        // Trace change log inside Audit Ledger records
        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'LOCATION',
                entityId: location.id,
                details: `Updated location properties and compliance parameters for: "${location.name}"`,
                userId: userId
            }
        });

        res.json({ success: true, data: location });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to apply profile changes to target infrastructure point." });
    }
};

// Delete an existing location safety gate checks with disk-wiping cascades
exports.deleteLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const parsedId = parseInt(id);

        // Fetch location details first to verify existence and extract dependent media
        const locationToDelete = await prisma.location.findUnique({
            where: { id: parsedId },
            select: {
                name: true,
                media: { select: { url: true } },
                _count: { select: { chargePoints: true } }
            }
        });

        if (!locationToDelete) {
            return res.status(404).json({ success: false, message: "Target infrastructure entity index not found." });
        }

        // Force a dependency gate block if active hardware profiles are still tied to it
        if (locationToDelete._count.chargePoints > 0) {
            return res.status(400).json({
                success: false,
                message: "Cannot isolate and delete location. Active hardware charge point deployment entries are still bound to this location point resource."
            });
        }

        // --- ENHANCEMENT: DISK-CLEANSING CASCADE ---
        // Purge physical filesystem uploads linked to this container before running table deletion
        if (locationToDelete.media && locationToDelete.media.length > 0) {
            locationToDelete.media.forEach(mediaItem => {
                purgePhysicalFile(mediaItem.url);
            });
        }

        // Drop the location. Prisma cascade schemas will remove relational rows inside the Media table automatically.
        await prisma.location.delete({
            where: { id: parsedId }
        });

        // Log destruction event
        await prisma.auditLog.create({
            data: {
                action: 'DELETE',
                entity: 'LOCATION',
                entityId: parsedId,
                details: `Permanently removed location node registry item: "${locationToDelete.name}" and purged all associated server disk assets.`,
                userId: userId
            }
        });

        res.json({ success: true, message: "Location structure and associated disk media assets deleted successfully." });
    } catch (error) {
        console.error(error);
        if (error.code === 'P2003') {
            return res.status(400).json({
                success: false,
                message: "Cannot isolate and delete location. Active foreign key constraints exist on reference tables."
            });
        }
        res.status(500).json({ success: false, message: "Failed to safely erase location endpoint trace from platform database." });
    }
};

// Delete an individual image file and its database reference node
exports.deleteLocationImage = async (req, res) => {
    try {
        const { mediaId } = req.params;
        const userId = req.user.id;
        const parsedMediaId = parseInt(mediaId);

        // Fetch the file entry to get its URL string path
        const mediaItem = await prisma.media.findUnique({
            where: { id: parsedMediaId }
        });

        if (!mediaItem) {
            return res.status(404).json({ success: false, message: "Target media reference asset not found." });
        }

        // Purge file from local server storage disk using our helper function
        purgePhysicalFile(mediaItem.url);

        // Drop the row entry from Prisma
        await prisma.media.delete({
            where: { id: parsedMediaId }
        });

        res.json({ success: true, message: "Media file stripped and erased from storage successfully." });
    } catch (error) {
        console.error("Image deletion execution error:", error);
        res.status(500).json({ success: false, message: "Failed to erase target resource file trace." });
    }
};