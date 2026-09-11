'use client';

import { UserPlus, MapPinned, ShieldCheck, Share2 } from 'lucide-react';

const STEPS = [
    {
        icon: UserPlus,
        title: 'Create Your Operator Account',
        description: 'Register in minutes and get your own isolated workspace — your data never mixes with any other operator on the platform.',
        gradient: 'from-[#FFAF00] to-amber-500',
    },
    {
        icon: MapPinned,
        title: 'Add Your Infrastructure',
        description: 'Map your locations, EVSEs and connectors, and define your tariff plans through a straightforward admin dashboard.',
        gradient: 'from-amber-500 to-emerald-500',
    },
    {
        icon: ShieldCheck,
        title: 'Get Reviewed & Approved',
        description: 'New listings enter a moderation queue so the public feed only ever shows verified, accurate infrastructure data.',
        gradient: 'from-emerald-500 to-[#73CB44]',
    },
    {
        icon: Share2,
        title: 'Go Live on the Open Feed',
        description: 'The moment you\'re approved, your network appears on the public OCPI feed — ready for maps, apps and roaming partners to consume.',
        gradient: 'from-[#73CB44] to-emerald-400',
    },
];

export default function HowItWorks() {
    return (
        <section id="how-it-works" className="relative overflow-hidden py-24 bg-[#FDFDFD]">
            {/* Dot-grid texture for a subtle technical feel */}
            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(15,23,42,0.08)_1px,transparent_1px)] bg-[size:22px_22px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black_40%,transparent_100%)]" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
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

                <div className="relative grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-6">
                    {/* Connecting line with a traveling pulse (desktop only) */}
                    <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-[2px] bg-gradient-to-r from-[#FFAF00] via-slate-200 to-[#73CB44] rounded-full overflow-visible">
                        <span
                            className="absolute top-1/2 h-3 w-3 rounded-full bg-white shadow-[0_0_12px_3px_rgba(255,175,0,0.7)] border-2 border-[#FFAF00]"
                            style={{ animation: 'travel-right 4s ease-in-out infinite' }}
                        />
                    </div>

                    {STEPS.map((step, idx) => (
                        <div key={step.title} className="group relative flex flex-col items-center text-center space-y-4">
                            <div className={`relative z-10 h-16 w-16 rounded-2xl bg-gradient-to-br ${step.gradient} text-slate-950 flex items-center justify-center shadow-lg shadow-slate-900/10 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300`}>
                                <step.icon size={26} strokeWidth={2.2} />
                                <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-slate-950 text-white text-[11px] font-black flex items-center justify-center border-2 border-white shadow-sm">
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
