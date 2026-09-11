'use client';

import { CheckCircle2, BarChart3, Users, Shield, Cpu, RefreshCw } from 'lucide-react';

export default function Compliance() {
    return (
        <section id="compliance" className="relative bg-[#090D16] text-white py-20 sm:py-28 overflow-hidden select-none">
            {/* Premium Aurora Light Ray Filters */}
            <div className="absolute top-0 right-1/4 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-amber-500/10 rounded-full blur-[100px] sm:blur-[150px] pointer-events-none animate-pulse duration-[6000ms]" />
            <div className="absolute bottom-0 left-1/4 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-emerald-500/10 rounded-full blur-[80px] sm:blur-[130px] pointer-events-none animate-pulse duration-[8000ms]" />
            
            {/* Tech Mesh Blueprint Overlay Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.007)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.007)_1px,transparent_1px)] bg-[size:30px_30px] sm:bg-[size:50px_50px] opacity-60" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
                
                {/* Left Column Structural Content Area */}
                <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
                    {/* FIXED: Replaced custom animation string directly with standard inline style manipulation to avoid hash mismatch */}
                    <div className="inline-flex items-center space-x-2 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 px-3.5 py-1.5 rounded-full text-amber-400 font-bold text-[10px] sm:text-xs tracking-widest uppercase shadow-sm mx-auto lg:mx-0">
                        <Shield 
                            size={14} 
                            className="text-emerald-400" 
                            style={{ animation: 'spin 8s linear infinite' }} 
                        />
                        <span>Industry Standard, Built In</span>
                    </div>
                    
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.15]">
                        Speaks the Same <br className="hidden lg:block"/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400">
                            Language as the Industry
                        </span>
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
                        Built natively on the Open Charge Point Interface (OCPI) standard. Publish once, and appear consistently across maps, EV routing apps, and roaming networks — no bespoke integration per partner.
                    </p>

                    <div className="pt-4 space-y-4 text-left max-w-md mx-auto lg:mx-0">
                        <div className="flex items-start p-3 bg-slate-900/30 border border-slate-800/40 rounded-2xl hover:bg-slate-900/50 transition-colors">
                            <div className="p-1.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 mr-4 shrink-0">
                                <CheckCircle2 size={16} className="text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm font-bold text-slate-200">Complete OCPI Data Model</p>
                                <p className="text-[11px] font-medium text-slate-500 mt-0.5">Country code, party, location, EVSE and connector — all properly linked, not flattened.</p>
                            </div>
                        </div>

                        <div className="flex items-start p-3 bg-slate-900/30 border border-slate-800/40 rounded-2xl hover:bg-slate-900/50 transition-colors">
                            <div className="p-1.5 bg-amber-500/10 rounded-xl border border-amber-500/20 mr-4 shrink-0">
                                <CheckCircle2 size={16} className="text-amber-400" />
                            </div>
                            <div>
                                <p className="text-xs sm:text-sm font-bold text-slate-200">Live Connector Status</p>
                                <p className="text-[11px] font-medium text-slate-500 mt-0.5">Available, Occupied and Faulted states update in real time, straight to your consumers.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column Interactive Dynamic Dashboard Matrix Cards */}
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-6 lg:pt-0">
                    
                    <div className="group relative bg-[#0F1626]/40 border border-slate-800/60 hover:border-amber-500/40 p-6 sm:p-8 rounded-2xl sm:rounded-3xl transition-all duration-300 backdrop-blur-xl flex flex-col justify-between min-h-[180px] sm:min-h-[220px] shadow-2xl overflow-hidden hover:-translate-y-1">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-colors" />
                        <div className="h-11 w-11 bg-slate-950/80 text-amber-400 rounded-xl flex items-center justify-center border border-slate-800 shadow-inner group-hover:scale-110 transition-transform">
                            <BarChart3 size={20} />
                        </div>
                        <div className="mt-6">
                            <h4 className="text-sm sm:text-base font-black text-white group-hover:text-amber-300 transition-colors">Transparent Tariffs</h4>
                            <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-2 leading-relaxed">
                                Full price component breakdowns published in the standard OCPI tariff format roaming partners already expect.
                            </p>
                        </div>
                    </div>

                    <div className="group relative bg-[#0F1626]/40 border border-slate-800/60 hover:border-emerald-500/40 p-6 sm:p-8 rounded-2xl sm:rounded-3xl transition-all duration-300 backdrop-blur-xl flex flex-col justify-between min-h-[180px] sm:min-h-[220px] shadow-2xl overflow-hidden hover:-translate-y-1">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-colors" />
                        <div className="h-11 w-11 bg-slate-950/80 text-emerald-400 rounded-xl flex items-center justify-center border border-slate-800 shadow-inner group-hover:scale-110 transition-transform">
                            <Users size={20} />
                        </div>
                        <div className="mt-6">
                            <h4 className="text-sm sm:text-base font-black text-white group-hover:text-emerald-300 transition-colors">True Multi-Tenancy</h4>
                            <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-2 leading-relaxed">
                                Every operator's data is fully isolated behind its own access keys — no risk of one network seeing another's data.
                            </p>
                        </div>
                    </div>

                    <div className="group relative bg-[#0F1626]/40 border border-slate-800/60 hover:border-indigo-500/40 p-6 sm:p-8 rounded-2xl sm:rounded-3xl transition-all duration-300 backdrop-blur-xl flex flex-col justify-between min-h-[180px] sm:min-h-[220px] shadow-2xl overflow-hidden hover:-translate-y-1">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-colors" />
                        <div className="h-11 w-11 bg-slate-950/80 text-indigo-400 rounded-xl flex items-center justify-center border border-slate-800 shadow-inner group-hover:scale-110 transition-transform">
                            <Cpu size={20} />
                        </div>
                        <div className="mt-6">
                            <h4 className="text-sm sm:text-base font-black text-white group-hover:text-indigo-300 transition-colors">Built to Scale</h4>
                            <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-2 leading-relaxed">
                                A query layer designed for growth — from your first location to a national charging network.
                            </p>
                        </div>
                    </div>

                    <div className="group relative bg-[#0F1626]/40 border border-slate-800/60 hover:border-amber-500/40 p-6 sm:p-8 rounded-2xl sm:rounded-3xl transition-all duration-300 backdrop-blur-xl flex flex-col justify-between min-h-[180px] sm:min-h-[220px] shadow-2xl overflow-hidden hover:-translate-y-1">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-colors" />
                        <div className="h-11 w-11 bg-slate-950/80 text-amber-400 rounded-xl flex items-center justify-center border border-slate-800 shadow-inner group-hover:scale-110 transition-transform">
                            <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-700" />
                        </div>
                        <div className="mt-6">
                            <h4 className="text-sm sm:text-base font-black text-white group-hover:text-amber-300 transition-colors">Instant Updates</h4>
                            <p className="text-[11px] sm:text-xs text-slate-400 font-medium mt-2 leading-relaxed">
                                Change a location or tariff in your dashboard and it reflects on the public feed immediately — no rebuild, no delay.
                            </p>
                        </div>
                    </div>

                </div>

            </div>
        </section>
    );
}