'use client';

import Link from 'next/link';
import { Zap, Mail, MapPin, Globe, Terminal, FileText, CheckCircle2 } from 'lucide-react';

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
                            <span className="text-lg font-semibold text-white tracking-tight">EV Data Hub</span>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                            A multi-tenant platform for EV charge point operators to manage their infrastructure and publish an open, OCPI-compliant data feed for maps, apps and roaming partners.
                        </p>

                        {/* Live Micro Status Block */}
                        <div className="inline-flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                            <span className="h-2 w-2 bg-[#73CB44] rounded-full animate-pulse" />
                            <span className="text-xs text-slate-300">Public feed</span>
                            <span className="text-xs font-medium text-[#73CB44]">Online</span>
                        </div>
                    </div>

                    {/* Navigation Directories */}
                    <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-8">

                        {/* Stream Core Cluster */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-slate-200 flex items-center">
                                <Terminal size={14} className="mr-1.5 text-[#F5A524]" /> Open data
                            </h4>
                            <ul className="text-sm text-slate-400 space-y-3">
                                <li>
                                    <Link prefetch={false} href="/open-data/docs" className="hover:text-white transition-colors flex items-center group cursor-pointer">
                                        <span className="h-1 w-1 bg-slate-700 rounded-full mr-2 group-hover:bg-[#FFAF00] transition-colors" />
                                        Locations JSON Feed
                                    </Link>
                                </li>
                                <li>
                                    <Link prefetch={false} href="/open-data/docs" className="hover:text-white transition-colors flex items-center group cursor-pointer">
                                        <span className="h-1 w-1 bg-slate-700 rounded-full mr-2 group-hover:bg-[#73CB44] transition-colors" />
                                        Tariffs JSON Feed
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Public Interfaces & Dashboard Portal Scope */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-slate-200 flex items-center">
                                <FileText size={14} className="mr-1.5 text-[#73CB44]" /> For operators
                            </h4>
                            <ul className="text-sm text-slate-400 space-y-3">
                                <li>
                                    <Link prefetch={false} href="/login" className="hover:text-white transition-colors block cursor-pointer">
                                        Sign in
                                    </Link>
                                </li>
                                <li>
                                    <Link prefetch={false} href="/register" className="hover:text-white transition-colors block cursor-pointer">
                                        Create an account
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Contact info cluster */}
                        <div className="space-y-4 col-span-2 md:col-span-1">
                            <h4 className="text-sm font-medium text-slate-200 flex items-center">
                                <Globe size={14} className="mr-1.5 text-slate-400" /> Contact
                            </h4>
                            <div className="text-sm text-slate-400 space-y-3">
                                <p className="flex items-start"><MapPin size={14} className="text-slate-600 mr-2 shrink-0 mt-0.5" />London, United Kingdom</p>
                                <p className="flex items-center"><Mail size={14} className="text-slate-600 mr-2 shrink-0" /><a href="mailto:ops@evopen.co.uk" className="hover:text-white transition-colors">ops@evopen.co.uk</a></p>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Bottom Base Legal Bar */}
                <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
                    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6 text-center md:text-left">
                        <p>© {new Date().getFullYear()} EV Data Hub. All rights reserved.</p>
                        <div className="flex space-x-4 text-slate-600">
                            <span className="hover:text-slate-400 cursor-pointer transition-colors">Privacy Rules</span>
                            <span>•</span>
                            <span className="hover:text-slate-400 cursor-pointer transition-colors">OCPI Terms</span>
                        </div>
                    </div>

                    {/* Live Infrastructure Sync Stamp */}
                    <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-slate-400">
                        <CheckCircle2 size={14} className="text-[#73CB44] animate-pulse" />
                        <span className="text-xs">Connections secured</span>
                    </div>
                </div>

            </div>
        </footer>
    );
}