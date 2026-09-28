'use client';

import { UserPlus, MapPinned, ShieldCheck, Share2 } from 'lucide-react';

const STEPS = [
    { icon: UserPlus, title: 'Create Your Operator Account', description: 'Register in minutes and get your own isolated workspace — your data never mixes with any other operator on the platform.', gradient: 'from-[#FFAF00] to-amber-400' },
    { icon: MapPinned, title: 'Add Your Infrastructure', description: 'Map your locations, EVSEs and connectors, and define your tariff plans through a straightforward admin dashboard.', gradient: 'from-amber-400 to-lime-500' },
    { icon: ShieldCheck, title: 'Get Reviewed & Approved', description: 'New listings enter a moderation queue so the public feed only ever shows verified, accurate infrastructure data.', gradient: 'from-lime-500 to-emerald-500' },
    { icon: Share2, title: 'Go Live on the Open Feed', description: 'The moment you\'re approved, your network appears on the public OCPI feed — ready for maps, apps and roaming partners to consume.', gradient: 'from-emerald-500 to-[#73CB44]' },
];

export default function HowItWorks() {
    return (
        <section id="how-it-works" className="relative bg-slate-50 py-24 sm:py-28 border-y border-slate-200/60">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
                    <span className="text-sm font-medium text-slate-700 bg-white px-3 py-1.5 rounded-full border border-slate-200">
                        From signup to live data
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-semibold text-slate-950 tracking-tight">
                        How It Works
                    </h2>
                    <p className="text-base text-slate-600 leading-relaxed">
                        Four steps stand between you and a fully published, standards-compliant charging network.
                    </p>
                </div>

                <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Connecting line with a traveling pulse (desktop only) */}
                    <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-[#FFAF00] via-slate-300 to-[#73CB44] overflow-visible">
                        <span
                            className="absolute top-1/2 h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_10px_3px_rgba(255,175,0,0.5)] border-2 border-[#FFAF00]"
                            style={{ animation: 'travel-right 4s ease-in-out infinite' }}
                        />
                    </div>

                    {STEPS.map((step, idx) => (
                        <div key={step.title} className="relative text-center space-y-4">
                            <div className={`relative z-10 mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br ${step.gradient} text-slate-950 flex items-center justify-center shadow-md`}>
                                <step.icon size={28} strokeWidth={2.2} />
                                <span className="absolute -top-2.5 -right-2.5 h-7 w-7 rounded-full bg-slate-950 text-white text-xs font-black flex items-center justify-center border-2 border-white shadow-sm">
                                    {idx + 1}
                                </span>
                            </div>
                            <h3 className="text-base font-semibold text-slate-950 tracking-tight">{step.title}</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
