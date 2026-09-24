'use client';

import { Zap } from 'lucide-react';

// Shared animated brand mark used for every loading state across the admin
// portal (page boot, section/table fetches, inline button spinners) so the
// app has one consistent "charging pulse" identity instead of a different
// bare icon-with-animate-spin per page. Colors match the established brand
// accents (amber #FFAF00 / green #73CB44) used across the dashboard nav/CTAs.
const DIMENSIONS = {
    xs: { box: 14, ring: 2, badge: null, icon: 0 },
    sm: { box: 22, ring: 2.5, badge: 9, icon: 10 },
    md: { box: 56, ring: 4, badge: 22, icon: 22 },
    lg: { box: 84, ring: 5, badge: 34, icon: 32 }
};

// Each tone is a self-contained palette so the mark always reads clearly
// against whatever surface it sits on:
//   brand - default amber-to-green gradient ring + ripple, dark badge. For
//           neutral/white/dark-neutral surfaces (cards, tables, dark navy).
//   light - flat white ring, no ripple, translucent white badge. For sitting
//           on a saturated brand-colored CTA button (e.g. the amber/green
//           register button) where the brand gradient would blend in.
//   dark  - dark navy-to-green ring + white ripple, white badge with amber
//           icon. For sitting on a bright brand-yellow surface (the
//           fullscreen boot splash) where the default gradient's amber leg
//           would nearly vanish against a matching yellow background.
const TONES = {
    brand: {
        ripple: 'bg-gradient-to-br from-[#FFAF00] to-[#73CB44] opacity-25',
        gradientStops: [{ offset: '0%', color: '#FFAF00' }, { offset: '100%', color: '#73CB44' }],
        badge: 'bg-slate-900',
        icon: 'text-[#FFAF00]',
        iconFill: '#FFAF00'
    },
    light: {
        ripple: null,
        gradientStops: [{ offset: '0%', color: '#ffffff', opacity: 0.55 }, { offset: '100%', color: '#ffffff' }],
        badge: 'bg-white/15',
        icon: 'text-white',
        iconFill: '#ffffff'
    },
    dark: {
        ripple: 'bg-white opacity-30',
        gradientStops: [{ offset: '0%', color: '#0F172A' }, { offset: '100%', color: '#166534' }],
        badge: 'bg-white',
        icon: 'text-[#FFAF00]',
        iconFill: '#FFAF00'
    }
};

function Mark({ size = 'md', tone = 'brand', className = '' }) {
    const d = DIMENSIONS[size] || DIMENSIONS.md;
    const t = TONES[tone] || TONES.brand;
    const circumference = 2 * Math.PI * ((64 - d.ring * 2) / 2);
    const gradId = `brandLoaderGrad-${size}-${tone}`;

    return (
        <div className={`relative shrink-0 ${className}`} style={{ width: d.box, height: d.box }}>
            {size !== 'xs' && t.ripple && (
                <span
                    className={`absolute inset-0 rounded-2xl ${t.ripple}`}
                    style={{ animation: 'brand-loader-ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite' }}
                />
            )}
            <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 64 64"
                fill="none"
                style={{ animation: 'brand-loader-spin 1.4s linear infinite' }}
            >
                <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="64" y2="64">
                        {t.gradientStops.map((stop, i) => (
                            <stop key={i} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity ?? 1} />
                        ))}
                    </linearGradient>
                </defs>
                <circle
                    cx="32" cy="32" r={(64 - d.ring * 2) / 2}
                    stroke={`url(#${gradId})`}
                    strokeWidth={d.ring}
                    strokeLinecap="round"
                    strokeDasharray={`${circumference * 0.28} ${circumference}`}
                    fill="none"
                />
            </svg>
            {d.badge && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div
                        className={`rounded-xl flex items-center justify-center shadow-lg ${t.badge}`}
                        style={{ width: d.badge, height: d.badge }}
                    >
                        <Zap size={d.icon} className={t.icon} fill={t.iconFill} strokeWidth={1.5} />
                    </div>
                </div>
            )}
        </div>
    );
}

export default function BrandLoader({ size = 'md', tone = 'brand', label, sublabel, fullscreen = false, className = '' }) {
    if (size === 'xs') return <Mark size="xs" tone={tone} className={className} />;

    if (fullscreen) {
        return (
            <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#FFAF00]">
                <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
                    <Mark size={size} tone="dark" />
                    {label && (
                        <p className="text-xs font-black uppercase tracking-widest text-slate-900 animate-pulse text-center">
                            {label}
                        </p>
                    )}
                    {sublabel && (
                        <p className="text-[10px] font-bold text-slate-900/60 text-center max-w-xs">{sublabel}</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
            <Mark size={size} tone={tone} />
            {label && (
                <p className="text-xs font-black uppercase tracking-widest text-slate-500 animate-pulse text-center">
                    {label}
                </p>
            )}
            {sublabel && (
                <p className="text-[10px] font-bold text-slate-400 text-center max-w-xs">{sublabel}</p>
            )}
        </div>
    );
}
