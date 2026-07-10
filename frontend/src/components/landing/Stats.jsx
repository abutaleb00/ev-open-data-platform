'use client';

import { Activity, MapPin, Cpu, Percent } from 'lucide-react';

export default function Stats() {
    return (
        <section id="stats" className="bg-white border-y border-slate-200/60 py-16">
            <div className="max-w-7xl mx-auto px-6">
                <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">Global Network Telemetry Metrics</h2>
                    <p className="text-sm text-slate-500 font-medium">Aggregated real-time metrics across all interconnected network nodes.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    <div className="space-y-2">
                        <div className="mx-auto h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><MapPin size={20} /></div>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">1,420+</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Charging Hubs</p>
                    </div>
                    <div className="space-y-2">
                        <div className="mx-auto h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Cpu size={20} /></div>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">8,940+</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monitored Connectors</p>
                    </div>
                    <div className="space-y-2">
                        <div className="mx-auto h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Activity size={20} /></div>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">2.4M+</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">API Sync Queries / Day</p>
                    </div>
                    <div className="space-y-2">
                        <div className="mx-auto h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Percent size={20} /></div>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">99.98%</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telemetry Uptime</p>
                    </div>
                </div>
            </div>
        </section>
    );
}