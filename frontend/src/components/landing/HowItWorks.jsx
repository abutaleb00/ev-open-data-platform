'use client';

import { UserPlus, MapPinned, ShieldCheck, Share2 } from 'lucide-react';

const STEPS = [
    {
        icon: UserPlus,
        title: 'Create Your Operator Account',
        description: 'Register in minutes and get your own isolated workspace — your data never mixes with any other operator on the platform.',
    },
    {
        icon: MapPinned,
        title: 'Add Your Infrastructure',
        description: 'Map your locations, EVSEs and connectors, and define your tariff plans through a straightforward admin dashboard.',
    },
    {
        icon: ShieldCheck,
        title: 'Get Reviewed & Approved',
        description: 'New listings enter a moderation queue so the public feed only ever shows verified, accurate infrastructure data.',
    },
    {
        icon: Share2,
        title: 'Go Live on the Open Feed',
        description: 'The moment you\'re approved, your network appears on the public OCPI feed — ready for maps, apps and roaming partners to consume.',
    },
];

export default function HowItWorks() {
    return (
        <section id="how-it-works" className="relative overflow-hidden py-24 bg-gradient-to-bl from-emerald-50/70 via-white to-amber-50/60">
            <div className="absolute top-1/3 right-0 w-[380px] h-[380px] bg-[#73CB44]/10 rounded-full blur-[110px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[380px] h-[380px] bg-[#FFAF00]/10 rounded-full blur-[110px] pointer-events-none" />
            <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
                <span className="text-xs font-black uppercase tracking-widest text-slate-900 bg-gradient-to-r from-[#FFAF00]/10 to-[#73CB44]/10 px-3 py-1.5 rounded-xl border border-slate-200">
                    From Signup to Live Data
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                    How It Works
                </h2>
                <p className="text-base text-slate-500 font-medium leading-relaxed">
                    Four steps stand between you and a fully published, standards-compliant charging network.
                </p>
            </div>

            <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6">
                {/* Connecting line (desktop only) */}
                <div className="hidden md:block absolute top-7 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-[#FFAF00]/40 via-slate-200 to-[#73CB44]/40" />

                {STEPS.map((step, idx) => (
                    <div key={step.title} className="relative flex flex-col items-center text-center space-y-4">
                        <div className="relative z-10 h-14 w-14 rounded-2xl bg-white border-2 border-slate-900 text-slate-900 flex items-center justify-center font-black shadow-md">
                            <step.icon size={22} strokeWidth={2.2} />
                            <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[#FFAF00] text-slate-950 text-[11px] font-black flex items-center justify-center border-2 border-white">
                                {idx + 1}
                            </span>
                        </div>
                        <h3 className="text-sm font-black text-slate-900 tracking-tight">{step.title}</h3>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-[220px]">{step.description}</p>
                    </div>
                ))}
            </div>
            </div>
        </section>
    );
}
