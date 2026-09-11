'use client';

import { Database, Terminal, ShieldCheck, ArrowUpRight } from 'lucide-react';

export default function Features() {
    return (
        <section id="features" className="relative bg-white py-24">
            <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                <span className="text-xs font-black uppercase tracking-widest text-slate-900 bg-gradient-to-r from-[#FFAF00]/10 to-[#73CB44]/10 px-3 py-1.5 rounded-xl border border-slate-200">
                    Built For Every Role
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                    One Platform, Three Ways to Use It
                </h2>
                <p className="text-base text-slate-500 font-medium leading-relaxed">
                    Whether you run the hardware, build on top of the data, or oversee the whole network — everything lives in one place.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* 1. Infrastructure Operators */}
                <div className="group relative bg-white p-8 rounded-3xl border border-slate-200/70 hover:border-[#FFAF00]/50 shadow-xs hover:shadow-xl hover:shadow-[#FFAF00]/[0.02] transition-all duration-300 flex flex-col justify-between overflow-hidden">
                    <div className="space-y-5">
                        <div className="h-12 w-12 bg-slate-950 text-[#FFAF00] rounded-2xl flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                            <Database size={22} strokeWidth={2.2} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">For Charge Point Operators</h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">
                            Add locations, EVSEs and connectors in minutes, set your tariffs, and watch status update live. Once approved, your network is instantly visible on the public feed — no extra publishing step.
                        </p>
                    </div>
                    <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs font-black text-slate-900 group-hover:text-[#FFAF00] transition-colors">
                        <span>Set Up Your Network</span>
                        <ArrowUpRight size={14} strokeWidth={2.5} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                </div>

                {/* 2. Mobility Developers */}
                <div className="group relative bg-white p-8 rounded-3xl border border-slate-200/70 hover:border-[#73CB44]/50 shadow-xs hover:shadow-xl hover:shadow-[#73CB44]/[0.02] transition-all duration-300 flex flex-col justify-between overflow-hidden">
                    <div className="space-y-5">
                        <div className="h-12 w-12 bg-slate-950 text-[#73CB44] rounded-2xl flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                            <Terminal size={22} strokeWidth={2.2} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">For Developers &amp; Partners</h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">
                            Pull a clean, OCPI-shaped JSON feed straight into your map, app or routing engine. Generate a scoped API key from your dashboard and you're reading live data in minutes.
                        </p>
                    </div>
                    <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs font-black text-slate-900 group-hover:text-[#73CB44] transition-colors">
                        <span>Explore the API</span>
                        <ArrowUpRight size={14} strokeWidth={2.5} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                </div>

                {/* 3. Governance Control */}
                <div className="group relative bg-white p-8 rounded-3xl border border-slate-200/70 hover:border-slate-400 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
                    <div className="space-y-5">
                        <div className="h-12 w-12 bg-slate-950 text-slate-300 rounded-2xl flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                            <ShieldCheck size={22} strokeWidth={2.2} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">For Platform Administrators</h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">
                            Every operator is fully isolated from every other. Review and approve new listings before they go public, track every change in an immutable audit log, and manage access at a glance.
                        </p>
                    </div>
                    <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs font-black text-slate-500 group-hover:text-slate-900 transition-colors">
                        <span>See the Admin Tools</span>
                        <ArrowUpRight size={14} strokeWidth={2.5} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                </div>

            </div>
            </div>
        </section>
    );
}
