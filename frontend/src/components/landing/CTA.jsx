'use client';

import Link from 'next/link';
import { ArrowRight, Map } from 'lucide-react';

export default function CTA() {
    return (
        <section className="relative bg-white py-20 sm:py-28 overflow-hidden">
            <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
                <div className="relative rounded-3xl bg-slate-950 px-6 py-16 sm:px-16 sm:py-20 overflow-hidden shadow-2xl">
                    {/* Glow accents */}
                    <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-[#FFAF00]/10 rounded-full blur-[120px] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-[#73CB44]/10 rounded-full blur-[120px] pointer-events-none" />
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />

                    <div className="relative z-10 space-y-6">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
                            Ready to Put Your Network<br className="hidden sm:block" /> on the Open Data Grid?
                        </h2>
                        <p className="text-sm sm:text-base text-slate-400 font-medium max-w-xl mx-auto leading-relaxed">
                            Create an operator account, add your first location, and see it flow through to a live, standards-compliant API — usually within minutes.
                        </p>
                        <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
                            <Link href="/login" className="flex items-center justify-center space-x-2 bg-[#FFAF00] text-slate-950 font-black px-7 py-3.5 rounded-xl hover:bg-[#e09e00] transition-all shadow-lg shadow-[#FFAF00]/20 active:scale-98 text-sm">
                                <span>Create Your Account</span>
                                <ArrowRight size={16} />
                            </Link>
                            <Link href="/open-data" className="flex items-center justify-center space-x-2 bg-white/5 border border-white/10 text-white font-bold px-6 py-3.5 rounded-xl hover:bg-white/10 transition-all text-sm">
                                <Map size={16} className="text-[#73CB44]" />
                                <span>Explore the Public Map</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
