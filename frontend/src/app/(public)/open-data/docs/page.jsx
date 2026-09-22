'use client';

import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import { MapPin, DollarSign, KeyRound, Terminal, Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const ENDPOINTS = [
    {
        icon: MapPin,
        accent: '#FFAF00',
        title: 'Locations',
        path: '/open-data/public/location/{your-reference-id}',
        description: 'Your approved, published charging locations, connectors and EVSEs in OCPI-compliant JSON.'
    },
    {
        icon: DollarSign,
        accent: '#73CB44',
        title: 'Tariffs',
        path: '/open-data/public/tariff/{your-reference-id}',
        description: 'Your published tariff/pricing records in OCPI-compliant JSON.'
    }
];

export default function OpenDataDocsPage() {
    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans antialiased text-slate-900 select-none">
            <Header />

            <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
                <div className="space-y-3">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                        <Terminal size={12} /> Open Data API
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">How to pull your data</h1>
                    <p className="text-sm sm:text-base text-slate-500 font-medium max-w-2xl leading-relaxed">
                        Every open data request is scoped to a single operator. Pass your host reference ID in the URL and
                        you get back only your own approved records — there is no endpoint that returns every operator's
                        data at once.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {ENDPOINTS.map((ep) => (
                        <div key={ep.title} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200" style={{ color: ep.accent }}>
                                    <ep.icon size={16} />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">{ep.title}</h3>
                            </div>
                            <p className="text-xs font-semibold text-slate-500 leading-relaxed">{ep.description}</p>
                            <code className="block text-[11px] font-mono font-bold bg-slate-950 text-slate-200 px-3 py-2 rounded-lg overflow-x-auto">
                                GET {ep.path}
                            </code>
                        </div>
                    ))}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
                    <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest">Example request</h2>
                    <code className="block text-[11px] sm:text-xs font-mono font-bold bg-slate-950 text-slate-200 px-4 py-3 rounded-xl overflow-x-auto whitespace-pre">
                        {`curl ${API_BASE_URL}/open-data/public/location/YOUR_REFERENCE_ID`}
                    </code>
                    <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest pt-2">Example response</h2>
                    <code className="block text-[11px] sm:text-xs font-mono font-bold bg-slate-950 text-slate-200 px-4 py-3 rounded-xl overflow-x-auto whitespace-pre">
                        {`{
  "name": "Location",
  "operator_reference_id": "YOUR_REFERENCE_ID",
  "message": "Success",
  "meta": { "total_records": 12, "current_page": 1, ... },
  "data": [ { "id": "loc_5dd562", "name": "...", "evses": [...] } ]
}`}
                    </code>
                    <p className="text-[11px] font-semibold text-slate-400 leading-relaxed">
                        A missing or unrecognized reference ID returns <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">404</code>, never a full data dump.
                        Both endpoints accept optional <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">page</code> and <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">limit</code> query parameters.
                    </p>
                </div>

                <div className="bg-slate-950 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-[#73CB44] shrink-0">
                            <KeyRound size={18} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-sm font-black text-white">Don't have a reference ID yet?</h3>
                            <p className="text-xs font-semibold text-slate-400 leading-relaxed max-w-md">
                                It's issued when your operator account is set up. Existing operators can find theirs on the
                                company settings page in the dashboard.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <a href="mailto:ops@evopen.co.uk" className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition-colors">
                            <Mail size={14} /> ops@evopen.co.uk
                        </a>
                        <Link href="/login" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-[#FFAF00] hover:bg-[#e09e00] text-slate-950 transition-colors">
                            <span>Dashboard Login</span>
                            <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
