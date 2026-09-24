// Shared helpers for a Tariff's stored raw OCPI object (Tariff.ocpiTariffData) -
// used by both partner sync (operatorSyncController.syncOperatorTariffs) and the
// admin tariff CRUD API (tariffController), so the two paths for reading/writing
// it can't drift out of sync with each other.

const safeJsonParse = (str) => {
    if (!str) return null;
    try {
        const parsed = JSON.parse(str);
        return (parsed && typeof parsed === 'object') ? parsed : null;
    } catch (_) {
        return null;
    }
};

// Pulls the per-kWh energy price out of a full OCPI Tariff object's
// elements[].price_components[] (type === 'ENERGY'), scanning every element
// since restriction-scoped tariffs (peak/off-peak, day-of-week, ...) can vary
// which element carries the ENERGY component. Returns null if none is found.
const extractEnergyPrice = (t) => {
    if (!t || !Array.isArray(t.elements)) return null;
    for (const element of t.elements) {
        const components = Array.isArray(element?.price_components) ? element.price_components : [];
        const energyComponent = components.find((c) => c && c.type === 'ENERGY');
        if (energyComponent && energyComponent.price !== undefined && energyComponent.price !== null) {
            return energyComponent.price;
        }
    }
    return null;
};

// Returns a clone of a full OCPI Tariff object with every ENERGY
// price_component's price replaced. Keeps a previously-synced tariff's stored
// elements in sync when only the flat pricePerKwh is edited via the admin API -
// the public feed returns this raw object verbatim, so without this the admin
// portal's displayed rate would silently drift from what partners actually see.
const applyEnergyPrice = (rawTariff, price) => {
    if (!rawTariff || !Array.isArray(rawTariff.elements)) return rawTariff;
    return {
        ...rawTariff,
        elements: rawTariff.elements.map((element) => {
            if (!Array.isArray(element?.price_components)) return element;
            return {
                ...element,
                price_components: element.price_components.map((c) =>
                    c && c.type === 'ENERGY' ? { ...c, price } : c
                )
            };
        })
    };
};

module.exports = { safeJsonParse, extractEnergyPrice, applyEnergyPrice };
