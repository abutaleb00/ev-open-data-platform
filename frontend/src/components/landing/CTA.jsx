'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

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
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white leading-tight">
                            Ready to Put Your Network<br className="hidden sm:block" /> on the Open Data Grid?
                        </h2>
                        <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
                            Create an operator account, add your first location, and see it flow through to a live, standards-compliant API — usually within minutes.
                        </p>
                        <div className="pt-4 flex flex-col sm:flex-row justify-center gap-4">
                            <Link prefetch={false} href="/login" className="flex items-center justify-center gap-2 bg-[#F5A524] text-slate-950 font-semibold px-7 py-3.5 rounded-xl hover:bg-[#e09a12] transition-all text-sm">
                                <span>Create Your Account</span>
                                <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
