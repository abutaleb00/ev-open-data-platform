'use client';

import Link from 'next/link';
import { Zap, Mail, MapPin, Globe, Terminal, FileText, CheckCircle2, Map } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function Footer() {
    return (
        <footer className="relative bg-slate-950 text-slate-400 border-t border-slate-900 pt-20 pb-10 overflow-hidden select-none">
            {/* Color Mesh glow patterns inside base footer */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,175,0,0.05),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(115,203,68,0.02),transparent_45%)]" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pb-16 border-b border-slate-900">

                    {/* Brand Meta Column */}
                    <div className="lg:col-span-4 space-y-5">
                        <div className="flex items-center space-x-3">
                            <div className="p-2.5 bg-[#FFAF00] rounded-xl text-slate-950 shadow-lg shadow-[#FFAF00]/10">
                                <Zap size={20} fill="currentColor" />
                            </div>
                            <span className="text-xl font-black text-white tracking-tight">EV DATA HUB</span>
                        </div>
                        <p className="text-xs font-medium text-slate-400 leading-relaxed max-w-sm">
                            The definitive real-time orchestration stack for modern electric vehicle roaming grids. Standardizing telemetry delivery, active tariff bounds, and hardware state streams.
                        </p>

                        {/* Live Micro Status Block */}
                        <div className="inline-flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                            <span className="h-2 w-2 bg-[#73CB44] rounded-full animate-pulse" />
                            <span className="text-[11px] font-mono font-bold text-slate-300">API Pipeline:</span>
                            <span className="text-[11px] font-mono font-black text-[#73CB44]">99.98% Operational</span>
                        </div>
                    </div>

                    {/* Navigation Directories */}
                    <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-8">

                        {/* Stream Core Cluster */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase text-slate-200 tracking-widest flex items-center">
                                <Terminal size={12} className="mr-1.5 text-[#FFAF00]" /> Open Telemetry
                            </h4>
                            <ul className="text-xs font-semibold text-slate-400 space-y-3">
                                <li>
                                    <a href={`${API_BASE_URL}/open-data/feed`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center group">
                                        <span className="h-1 w-1 bg-slate-700 rounded-full mr-2 group-hover:bg-[#FFAF00] transition-colors" />
                                        Locations JSON Feed
                                    </a>
                                </li>
                                <li>
                                    <a href={`${API_BASE_URL}/open-data/tariffs`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center group">
                                        <span className="h-1 w-1 bg-slate-700 rounded-full mr-2 group-hover:bg-[#73CB44] transition-colors" />
                                        Tariffs JSON Feed
                                    </a>
                                </li>
                                <li><span className="text-slate-600 flex items-center"><span className="h-1 w-1 bg-slate-800 rounded-full mr-2" />GraphQL Mesh</span></li>
                            </ul>
                        </div>

                        {/* Public Interfaces & Dashboard Portal Scope */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase text-slate-200 tracking-widest flex items-center">
                                <FileText size={12} className="mr-1.5 text-[#73CB44]" /> Public Hub
                            </h4>
                            <ul className="text-xs font-semibold text-slate-400 space-y-3">
                                {/* --- INTERACTIVE ROUTER VISUAL VIEW INTERFACE LINK CHIPS --- */}
                                <li>
                                    <Link href="/open-data" className="hover:text-white text-emerald-400 font-bold transition-colors flex items-center group cursor-pointer">
                                        <span className="h-1 w-1 bg-[#73CB44] rounded-full mr-2" />
                                        Public Map Explorer
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/login" className="hover:text-white transition-colors block cursor-pointer">
                                        Operator Dashboard Portal
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/login" className="hover:text-white transition-colors block cursor-pointer">
                                        Client Key Provisioner
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Contact info cluster */}
                        <div className="space-y-4 col-span-2 md:col-span-1">
                            <h4 className="text-xs font-black uppercase text-slate-200 tracking-widest flex items-center">
                                <Globe size={12} className="mr-1.5 text-slate-400" /> Command Ops
                            </h4>
                            <div className="text-xs font-semibold text-slate-400 space-y-3">
                                <p className="flex items-start"><MapPin size={14} className="text-slate-600 mr-2 shrink-0 mt-0.5" />London Infrastructure Node, UK</p>
                                <p className="flex items-center"><Mail size={14} className="text-slate-600 mr-2 shrink-0" /><a href="mailto:ops@evopen.co.uk" className="hover:text-white transition-colors">ops@evopen.co.uk</a></p>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Bottom Base Legal Bar */}
                <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-slate-500">
                    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6 text-center md:text-left">
                        <p>© 2026 EV Data Hub Open Source Platform Architecture.</p>
                        <div className="flex space-x-4 text-slate-600">
                            <span className="hover:text-slate-400 cursor-pointer transition-colors">Privacy Rules</span>
                            <span>•</span>
                            <span className="hover:text-slate-400 cursor-pointer transition-colors">OCPI Terms</span>
                        </div>
                    </div>

                    {/* Live Infrastructure Sync Stamp */}
                    <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-slate-400">
                        <CheckCircle2 size={14} className="text-[#73CB44] animate-pulse" />
                        <span className="font-mono text-[11px]">Node Integrity: SECURED</span>
                    </div>
                </div>

            </div>
        </footer>
    );
}