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
            color: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
        },
        {
            icon: Receipt,
            value: format(tariffs),
            label: 'Published Tariff Plans',
            color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
        },
        {
            icon: ShieldCheck,
            value: 'OCPI 2.2',
            label: 'Compliance Standard',
            color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
        },
        {
            icon: Radio,
            value: apiOnline === false ? 'Offline' : 'Live',
            label: 'Public Feed Status',
            color: apiOnline === false ? 'text-rose-300 bg-rose-500/10 border-rose-500/20' : 'text-sky-300 bg-sky-500/10 border-sky-500/20',
        },
    ];

    return (
        <section id="stats" className="relative overflow-hidden bg-slate-950 py-20 sm:py-24">
            {/* Vivid brand glow */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#FFAF00]/20 rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#73CB44]/20 rounded-full blur-[130px] pointer-events-none" />
            {/* Blueprint grid texture */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
                    <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#FFAF00] bg-[#FFAF00]/10 border border-[#FFAF00]/20 px-3 py-1.5 rounded-full">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#73CB44] opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#73CB44]" />
                        </span>
                        Live From Production
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                        Straight From Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-emerald-300">Live API</span>
                    </h2>
                    <p className="text-sm text-slate-400 font-medium">
                        These numbers are fetched from our own public feed in real time, right now — not marketing copy.
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                    {TILES.map((tile) => (
                        <div
                            key={tile.label}
                            className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center hover:bg-white/[0.08] hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className={`mx-auto h-11 w-11 rounded-xl flex items-center justify-center border ${tile.color} group-hover:scale-110 transition-transform`}>
                                <tile.icon size={20} />
                            </div>
                            <h3 className="mt-4 text-2xl sm:text-3xl font-black text-white tracking-tight tabular-nums">{tile.value}</h3>
                            <p className="mt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{tile.label}</p>
                        </div>
                    ))}
                </div>

                {locations === 0 && apiOnline && (
                    <p className="text-center text-xs font-semibold text-slate-500 mt-8">
                        No locations published yet — be the first operator on the grid.
                    </p>
                )}
            </div>
        </section>
    );
}
