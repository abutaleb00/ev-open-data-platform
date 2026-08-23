'use client';

import Link from 'next/link';
import { ArrowRight, Terminal, Server, Globe, DollarSign, MapPin } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function Hero() {
    return (
        <section id="hero" className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-36 bg-gradient-to-b from-white via-slate-50/30 to-[#F8FAFC]">
            {/* Ambient Radial Mesh Layer using Brand Identity Colors */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,175,0,0.06),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(115,203,68,0.04),transparent_40%)]" />
            
            <div className="max-w-7xl mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                {/* Left Column: Direct Hook Copy */}
                <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                    <div className="inline-flex items-center space-x-2 bg-slate-900 text-[#FFAF00] px-3.5 py-1.5 rounded-xl font-bold text-xs tracking-wider uppercase border border-slate-800">
                        <Server size={12} className="animate-pulse text-[#73CB44]" />
                        <span>OCPI Compliant Roaming Grid</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                        The Unified Gateway for <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFAF00] to-[#73CB44]">Open EV Charging Data</span>
                    </h1>
                    <p className="text-base sm:text-lg text-slate-500 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                        Empowering networks to map infrastructure variables, manage active hardware connectors, audit platform metrics, and securely stream live datasets straight to global navigation services.
                    </p>

                    {/* Integrated Navigation Loops */}
                    <div className="pt-4 flex flex-col sm:flex-row flex-wrap justify-center lg:justify-start gap-4">
                        <Link href="/login" className="flex items-center justify-center space-x-2 bg-[#FFAF00] text-slate-950 font-black px-6 py-3.5 rounded-xl hover:bg-[#e09e00] transition-all shadow-lg shadow-[#FFAF00]/10 active:scale-98 text-sm">
                            <span>Get Access Token</span>
                            <ArrowRight size={16} />
                        </Link>
                        
                        <a href={`${API_BASE_URL}/open-data/feed`} target="_blank" className="flex items-center justify-center space-x-2 bg-white border border-slate-200 text-slate-700 font-bold px-5 py-3.5 rounded-xl hover:bg-slate-50 hover:text-[#FFAF00] transition-all shadow-2xs text-sm">
                            <MapPin size={16} className="text-slate-400" />
                            <span>Locations Feed</span>
                        </a>

                        <a href={`${API_BASE_URL}/open-data/tariffs`} target="_blank" className="flex items-center justify-center space-x-2 bg-white border border-slate-200 text-slate-700 font-bold px-5 py-3.5 rounded-xl hover:bg-slate-50 hover:text-[#73CB44] transition-all shadow-2xs text-sm">
                            <DollarSign size={16} className="text-slate-400" />
                            <span>Tariffs Feed</span>
                        </a>
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
                        <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-400 tracking-wider">v1.0.0 Payload</span>
                    </div>

                    <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-[11px] leading-relaxed border border-slate-800 shadow-inner overflow-x-auto max-h-56 scrollbar-thin scrollbar-thumb-slate-800">
                        <p className="text-slate-500">// GET /api/v1/open-data/feed</p>
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
                        <div className="flex items-center"><Globe size={14} className="text-[#73CB44] mr-1.5 animate-pulse" /> Data Stream Matrix: Live</div>
                        <span className="text-slate-900 font-black flex items-center"><Terminal size={12} className="mr-1 text-slate-400"/> 200 OK</span>
                    </div>
                </div>

            </div>
        </section>
    );
}