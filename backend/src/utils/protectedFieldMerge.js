// Shared merge rule for fields a host can edit via /locations/enrich (directions,
// related_locations, facilities/amenities, energy_mix, floor_level, parking_restrictions,
// images) but that partner sync/ingest/patch payloads also carry: a payload value that is
// `undefined` (key omitted) or explicitly `null` preserves whatever is already stored,
// rather than clobbering it - only a real, non-null value (including '' or []) overwrites.
const applyIfProvided = (updateData, dbField, rawValue, transform = (v) => v) => {
    if (rawValue === undefined || rawValue === null) return;
    updateData[dbField] = transform(rawValue);
};

module.exports = { applyIfProvided };
