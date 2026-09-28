'use client';

import Link from 'next/link';
import { ArrowRight, Terminal, Globe, DollarSign, MapPin, ShieldCheck, Zap, RefreshCw } from 'lucide-react';

const TRUST_BADGES = [
    { icon: ShieldCheck, label: 'OCPI 2.2 Compliant' },
    { icon: Zap, label: 'Multi-Tenant by Design' },
    { icon: RefreshCw, label: 'Real-Time Sync' },
];

export default function Hero() {
    return (
        <section id="hero" className="relative overflow-hidden pt-10 pb-24 md:pt-12 md:pb-18 bg-gradient-to-b from-white via-slate-50/30 to-[#F8FAFC]">
            {/* Ambient Radial Mesh Layer using Brand Identity Colors */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,175,0,0.06),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(115,203,68,0.04),transparent_40%)]" />

            <div className="max-w-7xl mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                {/* Left Column: Direct Hook Copy */}
                <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 bg-white text-slate-700 px-3 py-1.5 rounded-full text-sm font-medium border border-slate-200 shadow-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#73CB44] opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#73CB44]" />
                        </span>
                        <span>Open to charge point operators</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-[3.4rem] font-semibold text-slate-950 tracking-tight leading-[1.08]">
                        One Platform for Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFAF00] to-[#73CB44]">Open EV Charging Data</span>
                    </h1>
                    <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                        Manage your charging locations, connectors and tariffs in one dashboard — then publish an OCPI-compliant open data feed that maps, apps and roaming partners can plug straight into. No custom integration work required.
                    </p>

                    {/* Integrated Navigation Loops */}
                    <div className="pt-4 flex flex-col sm:flex-row flex-wrap justify-center lg:justify-start gap-4">
                        <Link prefetch={false} href="/login" className="flex items-center justify-center gap-2 bg-[#F5A524] text-slate-950 font-semibold px-6 py-3.5 rounded-xl hover:bg-[#e09a12] transition-all shadow-sm text-sm">
                            <span>Get Started</span>
                            <ArrowRight size={16} />
                        </Link>

                        <Link prefetch={false} href="/open-data/docs" className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 font-medium px-5 py-3.5 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm">
                            <MapPin size={16} className="text-slate-400" />
                            <span>Locations Feed</span>
                        </Link>

                        <Link prefetch={false} href="/open-data/docs" className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 font-medium px-5 py-3.5 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm">
                            <DollarSign size={16} className="text-slate-400" />
                            <span>Tariffs Feed</span>
                        </Link>
                    </div>

                    {/* Trust Badge Row */}
                    <div className="pt-2 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2">
                        {TRUST_BADGES.map((badge) => (
                            <div key={badge.label} className="flex items-center gap-1.5 text-sm text-slate-500">
                                <badge.icon size={14} className="text-[#73CB44]" />
                                <span>{badge.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Dynamic Terminal Frame Screen */}
                <div className="lg:col-span-5 bg-white rounded-3xl shadow-2xl border border-slate-200/80 p-6 space-y-6 transition-all duration-500 hover:border-slate-300">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                        <div className="flex items-center space-x-2">
                            <span className="h-3 w-3 rounded-full bg-rose-400" />
                            <span className="h-3 w-3 rounded-full bg-[#FFAF00]" />
                            <span className="h-3 w-3 rounded-full bg-[#73CB44]" />
                        </div>
                        <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-400 tracking-wider">Example Response</span>
                    </div>

                    <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-[11px] leading-relaxed border border-slate-800 shadow-inner overflow-x-auto max-h-56 scrollbar-thin scrollbar-thumb-slate-800">
                        <p className="text-slate-500">// GET /api/v1/open-data/public/location/&#123;your-reference-id&#125;</p>
                        <p className="text-slate-400">{"{"}</p>
                        <p className="pl-4"><span className="text-[#FFAF00]">"message"</span>: <span className="text-indigo-300">"ok"</span>,</p>
                        <p className="pl-4"><span className="text-[#FFAF00]">"data"</span>: [</p>
                        <p className="pl-8">{"{"}</p>
                        <p className="pl-12"><span className="text-[#73CB44]">"id"</span>: <span className="text-indigo-300">"loc_5dd562"</span>,</p>
                        <p className="pl-12"><span className="text-[#73CB44]">"name"</span>: <span className="text-indigo-300">"Spencer 000024"</span>,</p>
                        <p className="pl-12"><span className="text-[#73CB44]">"parking_type"</span>: <span className="text-indigo-300">"PARKING_GARAGE"</span>,</p>
                        <p className="pl-12"><span className="text-[#73CB44]">"currency"</span>: <span className="text-indigo-300">"GBP"</span>,</p>
                        <p className="pl-12"><span className="text-[#73CB44]">"price"</span>: <span className="text-[#FFAF00]">0.5417</span></p>
                        <p className="pl-8">{"}"}</p>
                        <p className="pl-4">]</p>
                        <p className="text-slate-400">{"}"}</p>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-2">
                        <div className="flex items-center"><Globe size={14} className="text-[#73CB44] mr-1.5 animate-pulse" /> No API key required</div>
                        <span className="text-slate-900 font-black flex items-center"><Terminal size={12} className="mr-1 text-slate-400" /> 200 OK</span>
                    </div>
                </div>

            </div>
        </section>
    );
}
