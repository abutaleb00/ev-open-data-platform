'use client';

import { CheckCircle2, BarChart3, Users, Shield, Cpu, RefreshCw } from 'lucide-react';

export default function Compliance() {
    return (
        <section id="compliance" className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white py-24 overflow-hidden">
            {/* Brand Color Glow Ambient Accents */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FFAF00]/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#73CB44]/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:40px_40px] opacity-40" />

            <div className="max-w-7xl mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
                
                {/* Left Column Text details */}
                <div className="lg:col-span-6 space-y-6">
                    <div className="inline-flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-[#FFAF00] font-bold text-xs tracking-wider uppercase">
                        <Shield size={12} className="text-[#73CB44]" />
                        <span>Roaming Grid Compliance Sync</span>
                    </div>
                    
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                        Structured Open <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFAF00] via-amber-400 to-[#73CB44]">
                            Compliance Standards
                        </span>
                    </h2>
                    
                    <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-xl">
                        Our dynamic open-data platform matches standard Open Charge Point Interface (OCPI) protocols natively. We erase point-of-interest fragmentation across map directories, vehicle navigation engines, and roaming clearhouses worldwide.
                    </p>

                    <div className="pt-2 space-y-3.5">
                        <div className="flex items-start text-sm font-bold text-slate-300">
                            <div className="p-1 bg-[#73CB44]/10 rounded-md border border-[#73CB44]/20 mr-3 mt-0.5 shrink-0">
                                <CheckCircle2 size={14} className="text-[#73CB44]" />
                            </div>
                            <div>
                                <p className="text-slate-200">Full Entity Relational Hierarchies</p>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">Strictly aggregates matching Country Code, Party, Location, EVSE, and Connector indexes.</p>
                            </div>
                        </div>
                        
                        <div className="flex items-start text-sm font-bold text-slate-300">
                            <div className="p-1 bg-[#FFAF00]/10 rounded-md border border-[#FFAF00]/20 mr-3 mt-0.5 shrink-0">
                                <CheckCircle2 size={14} className="text-[#FFAF00]" />
                            </div>
                            <div>
                                <p className="text-slate-200">Live Status Loop Synchronization</p>
                                <p className="text-xs font-medium text-slate-500 mt-0.5">Pulsing telemetry triggers (Available, Occupied, Faulted) directly to client maps.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column Dashboard Item Displays */}
                <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    <div className="group bg-slate-900/40 border border-slate-800/80 hover:border-[#FFAF00]/30 p-6 rounded-2xl transition-all duration-300 backdrop-blur-md flex flex-col justify-between space-y-8">
                        <div className="h-10 w-10 bg-slate-950 text-[#FFAF00] rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform border border-slate-800">
                            <BarChart3 size={20} />
                        </div>
                        <div>
                            <h4 className="text-base font-black text-white">Live Billing Insights</h4>
                            <p className="text-xs text-slate-400 font-medium mt-1.5 leading-relaxed">
                                Stream complete element and price component definitions array items to match roaming transaction requests.
                            </p>
                        </div>
                    </div>

                    <div className="group bg-slate-900/40 border border-slate-800/80 hover:border-[#73CB44]/30 p-6 rounded-2xl transition-all duration-300 backdrop-blur-md flex flex-col justify-between space-y-8">
                        <div className="h-10 w-10 bg-slate-950 text-[#73CB44] rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform border border-slate-800">
                            <Users size={20} />
                        </div>
                        <div>
                            <h4 className="text-base font-black text-white">Multi-Tenant Boundaries</h4>
                            <p className="text-xs text-slate-400 font-medium mt-1.5 leading-relaxed">
                                Isolate operator spaces cleanly using cryptographic access keys, preventing payload contamination.
                            </p>
                        </div>
                    </div>

                    <div className="group bg-slate-900/40 border border-slate-800/80 hover:border-slate-700 p-6 rounded-2xl transition-all duration-300 backdrop-blur-md flex flex-col justify-between space-y-8">
                        <div className="h-10 w-10 bg-slate-950 text-slate-400 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform border border-slate-800">
                            <Cpu size={20} />
                        </div>
                        <div>
                            <h4 className="text-base font-black text-white">Asynchronous Engine</h4>
                            <p className="text-xs text-slate-400 font-medium mt-1.5 leading-relaxed">
                                High-performance queries optimized for high-volume database reading directly inside SQL Server layers.
                            </p>
                        </div>
                    </div>

                    <div className="group bg-slate-900/40 border border-slate-800/80 hover:border-[#FFAF00]/30 p-6 rounded-2xl transition-all duration-300 backdrop-blur-md flex flex-col justify-between space-y-8">
                        <div className="h-10 w-10 bg-slate-950 text-[#FFAF00] rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform border border-slate-800">
                            <RefreshCw size={18} />
                        </div>
                        <div>
                            <h4 className="text-base font-black text-white">Real-Time Sync</h4>
                            <p className="text-xs text-slate-400 font-medium mt-1.5 leading-relaxed">
                                Eliminates static parsing lag completely. What you modify inside dashboards updates the data stream.
                            </p>
                        </div>
                    </div>

                </div>

            </div>
        </section>
    );
}