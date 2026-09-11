'use client';

import { useEffect, useState } from 'react';
import { MapPin, Receipt, ShieldCheck, Radio } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function Stats() {
    const [locations, setLocations] = useState(null);
    const [tariffs, setTariffs] = useState(null);
    const [apiOnline, setApiOnline] = useState(null);

    useEffect(() => {
        let cancelled = false;

        fetch(`${API_BASE_URL}/open-data/feed?limit=1`)
            .then((res) => res.json())
            .then((data) => {
                if (cancelled) return;
                setApiOnline(true);
                setLocations(data?.meta?.total_records ?? 0);
            })
            .catch(() => {
                if (!cancelled) setApiOnline(false);
            });

        fetch(`${API_BASE_URL}/open-data/tariffs?limit=1`)
            .then((res) => res.json())
            .then((data) => {
                if (!cancelled) setTariffs(data?.meta?.total_records ?? 0);
            })
            .catch(() => { });

        return () => { cancelled = true; };
    }, []);

    const format = (n) => (n === null ? '—' : n.toLocaleString());

    const TILES = [
        {
            icon: MapPin,
            value: format(locations),
            label: 'Live Charging Locations',
            color: 'text-indigo-600 bg-indigo-50',
        },
        {
            icon: Receipt,
            value: format(tariffs),
            label: 'Published Tariff Plans',
            color: 'text-emerald-600 bg-emerald-50',
        },
        {
            icon: ShieldCheck,
            value: 'OCPI 2.2',
            label: 'Compliance Standard',
            color: 'text-amber-600 bg-amber-50',
        },
        {
            icon: Radio,
            value: apiOnline === false ? 'Offline' : 'Live',
            label: 'Public Feed Status',
            color: apiOnline === false ? 'text-rose-600 bg-rose-50' : 'text-blue-600 bg-blue-50',
        },
    ];

    return (
        <section id="stats" className="bg-white border-y border-slate-200/60 py-16">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">Straight From Our Live API</h2>
                    <p className="text-sm text-slate-500 font-medium">
                        These numbers are fetched from our own public feed in real time, right now — not marketing copy.
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {TILES.map((tile) => (
                        <div key={tile.label} className="space-y-2">
                            <div className={`mx-auto h-10 w-10 rounded-xl flex items-center justify-center ${tile.color}`}>
                                <tile.icon size={20} />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">{tile.value}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{tile.label}</p>
                        </div>
                    ))}
                </div>

                {locations === 0 && apiOnline && (
                    <p className="text-center text-xs font-semibold text-slate-400 mt-8">
                        No locations published yet — be the first operator on the grid.
                    </p>
                )}
            </div>
        </section>
    );
}
