'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Secure Leaflet marker assets explicitly to prevent empty image path breaks
const standardPinIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [24, 38],
    iconAnchor: [12, 38],
    popupAnchor: [1, -32],
    shadowSize: [38, 38]
});

const highlightedPinIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [24, 38],
    iconAnchor: [12, 38],
    popupAnchor: [1, -32],
    shadowSize: [38, 38]
});

function RecenterViewportController({ targetCoordinates }) {
    const map = useMap();
    useEffect(() => {
        if (targetCoordinates && !isNaN(targetCoordinates[0]) && !isNaN(targetCoordinates[1])) {
            map.setView(targetCoordinates, map.getZoom());
        }
    }, [targetCoordinates, map]);
    return null;
}

export default function LiveLeafletMapInstance({ locations, centerCoords, hoveredLocationId, onMarkerSelect }) {
    return (
        <MapContainer
            center={centerCoords}
            zoom={12}
            scrollWheelZoom={true}
            className="w-full h-full z-0 rounded-2xl"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RecenterViewportController targetCoordinates={centerCoords} />

            {locations.map((loc) => {
                const lat = parseFloat(loc.coordinates?.latitude);
                const lng = parseFloat(loc.coordinates?.longitude);

                if (isNaN(lat) || isNaN(lng)) return null;

                const isCurrentlyFocused = hoveredLocationId === loc.id;

                return (
                    <Marker
                        key={loc.id}
                        position={[lat, lng]}
                        icon={isCurrentlyFocused ? highlightedPinIcon : standardPinIcon}
                        eventHandlers={{
                            click: () => onMarkerSelect(loc)
                        }}
                    >
                        <Popup>
                            <div className="p-1 font-sans text-xs min-w-[120px] max-w-[180px]">
                                <p className="font-black text-slate-900 leading-tight truncate">{loc.name}</p>
                                <p className="text-slate-400 mt-1 font-medium truncate">{loc.address}</p>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}