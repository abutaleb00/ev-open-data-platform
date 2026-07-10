'use client';

import { Database, Terminal, ShieldCheck, ArrowUpRight } from 'lucide-react';

export default function Features() {
    return (
        <section id="features" className="relative max-w-7xl mx-auto px-6 py-24">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                <span className="text-xs font-black uppercase tracking-widest text-slate-900 bg-gradient-to-r from-[#FFAF00]/10 to-[#73CB44]/10 px-3 py-1.5 rounded-xl border border-slate-200">
                    Engine Infrastructure Capable
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                    Optimized Roles for the EV Data Ecosystem
                </h2>
                <p className="text-base text-slate-500 font-medium leading-relaxed">
                    Designed from scratch to support infrastructure networks, roaming software development layers, and platform moderation teams inside a single unified portal.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* 1. Infrastructure Operators */}
                <div className="group relative bg-white p-8 rounded-3xl border border-slate-200/70 hover:border-[#FFAF00]/50 shadow-xs hover:shadow-xl hover:shadow-[#FFAF00]/[0.02] transition-all duration-300 flex flex-col justify-between overflow-hidden">
                    <div className="space-y-5">
                        <div className="h-12 w-12 bg-slate-950 text-[#FFAF00] rounded-2xl flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                            <Database size={22} strokeWidth={2.2} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Infrastructure Operators</h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">
                            Map multi-tenant charge stations, construct compliant tariff rules, track live deployment telemetry, and instantly authorize broadcast vectors to global map systems.
                        </p>
                    </div>
                    <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs font-black text-slate-900 group-hover:text-[#FFAF00] transition-colors">
                        <span>Launch Operator Space</span>
                        <ArrowUpRight size={14} strokeWidth={2.5} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                </div>

                {/* 2. Mobility Developers */}
                <div className="group relative bg-white p-8 rounded-3xl border border-slate-200/70 hover:border-[#73CB44]/50 shadow-xs hover:shadow-xl hover:shadow-[#73CB44]/[0.02] transition-all duration-300 flex flex-col justify-between overflow-hidden">
                    <div className="space-y-5">
                        <div className="h-12 w-12 bg-slate-950 text-[#73CB44] rounded-2xl flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                            <Terminal size={22} strokeWidth={2.2} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Mobility Developers</h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">
                            Provision cryptographically secure client keys to bind data pipelines straight into high-performance maps, in-car vehicle operating systems, and routing engines.
                        </p>
                    </div>
                    <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs font-black text-slate-900 group-hover:text-[#73CB44] transition-colors">
                        <span>Access API Directory</span>
                        <ArrowUpRight size={14} strokeWidth={2.5} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                </div>

                {/* 3. Governance Control */}
                <div className="group relative bg-white p-8 rounded-3xl border border-slate-200/70 hover:border-slate-400 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
                    <div className="space-y-5">
                        <div className="h-12 w-12 bg-slate-950 text-slate-300 Richmond rounded-2xl flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                            <ShieldCheck size={22} strokeWidth={2.2} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Network Governance</h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">
                            Enforce airtight tenant restrictions. Moderation workflows allow administrators to verify operator pools, inspect immutable audit trails, and manage pipeline gates.
                        </p>
                    </div>
                    <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs font-black text-slate-500 group-hover:text-slate-900 transition-colors">
                        <span>Review Audit Trails</span>
                        <ArrowUpRight size={14} strokeWidth={2.5} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                </div>

            </div>
        </section>
    );
}