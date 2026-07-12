'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import {
    Activity, Zap, MapPin, Building2,
    CheckCircle2, AlertTriangle, XCircle, Clock, ShieldCheck, ArrowUpRight,
    Hourglass, Compass
} from 'lucide-react';

export default function AnalyticsPage() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const response = await api.get('/analytics/overview');
                if (response.data.success) {
                    setStats(response.data.data);
                }
            } catch (error) {
                console.error("Failed to fetch analytics data vectors", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchAnalytics();
    }, [user]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-slate-400 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 m-6 select-none">
                <div className="relative flex items-center justify-center mb-4">
                    <div className="absolute w-12 h-12 bg-purple-50 rounded-full animate-ping opacity-75" />
                    <Activity size={28} className="text-purple-600 animate-pulse relative z-10" />
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing Asset Intelligence Metrics...</p>
            </div>
        );
    }

    // --- DESTRUCTURING PATHS MATCHING YOUR LIVE UPDATED API ---
    const metrics = stats?.metrics || { companies: 0, locations: 0, chargePoints: 0 };
    const health = stats?.health || {
        AVAILABLE: 0, OCCUPIED: 0, CHARGING: 0, RESERVED: 0,
        FAULTED: 0, OUT_OF_SERVICE: 0, PLANNED: 0, OPERATIONAL: 0
    };
    const approvals = stats?.approvals || { 
        locations: { total: 0, approved: 0, pending: 0 }, 
        chargePoints: { total: 0, approved: 0, pending: 0 } 
    };

    // Safely parse absolute hardware totals to avoid divide-by-zero layout warnings
    const totalHardware = metrics.chargePoints || 0;

    const getPercent = (value) => {
        if (!value || totalHardware === 0) return 0;
        return Math.round((value / totalHardware) * 100);
    };

    return (
        <div className="space-y-8 p-4 sm:p-6 max-w-7xl mx-auto bg-slate-50/30 min-h-screen select-none animate-in fade-in duration-300">

            {/* 1. PREMIUM HEADER NODE CONTAINER */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-6 gap-4">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-slate-900 text-[10px] font-black uppercase tracking-wider text-slate-100 mb-1">
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" /> Live Telemetry Matrix
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">Network Analytics Engine</h2>
                    <p className="text-xs text-slate-500 font-bold tracking-wide uppercase">Core Infrastructure Diagnostics Framework & compliance diagnostics data logs.</p>
                </div>
                <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs self-start md:self-auto">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-xs text-slate-700 uppercase">
                        {user?.role?.charAt(0) || 'O'}
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Access Node Privilege</p>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-wide">{user?.role?.replace('_', ' ') || 'Operator Context'}</p>
                    </div>
                </div>
            </div>

            {/* 2. CORE SYSTEM DENSITY SUMMARY BLOCKS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {user?.role === 'SUPER_ADMIN' && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs relative overflow-hidden group hover:border-purple-300 transition-all duration-300">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50/40 rounded-full -mr-6 -mt-6 transition-transform group-hover:scale-110 duration-500" />
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100/40 shadow-3xs"><Building2 size={20} /></div>
                            <span className="text-slate-300 group-hover:text-purple-400 transition-colors"><ArrowUpRight size={16} /></span>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider relative z-10">Registered Operators</p>
                        <h4 className="text-3xl font-black text-slate-900 tracking-tight mt-1 relative z-10">{metrics.companies}</h4>
                    </div>
                )}

                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs relative overflow-hidden group hover:border-blue-300 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/40 rounded-full -mr-6 -mt-6 transition-transform group-hover:scale-110 duration-500" />
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100/40 shadow-3xs"><MapPin size={20} /></div>
                        <span className="text-slate-300 group-hover:text-blue-400 transition-colors"><ArrowUpRight size={16} /></span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider relative z-10">Active Host Locations</p>
                    <h4 className="text-3xl font-black text-slate-900 tracking-tight mt-1 relative z-10">{metrics.locations}</h4>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs relative overflow-hidden group hover:border-amber-300 transition-all duration-300 sm:col-span-2 lg:col-span-1">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50/40 rounded-full -mr-6 -mt-6 transition-transform group-hover:scale-110 duration-500" />
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100/40 shadow-3xs"><Zap size={20} /></div>
                        <span className="text-slate-300 group-hover:text-amber-400 transition-colors"><ArrowUpRight size={16} /></span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider relative z-10">Hardware Terminals Deployed</p>
                    <h4 className="text-3xl font-black text-slate-900 tracking-tight mt-1 relative z-10">{totalHardware}</h4>
                </div>
            </div>

            {/* 3. DIAGNOSTICS LOG MATRIX & PIPELINE INTERCEPT MAP SPLIT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* TRACKING COLUMNS DISPATCH DECK */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs lg:col-span-7 space-y-5">
                    <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <Activity size={16} className="text-indigo-600" /> Terminal Operational Diagnostics
                        </h3>
                        <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Live breakdown of individual node status indicators across the active grid configuration.</p>
                    </div>

                    <div className="space-y-4">
                        {/* Status Module Metric: AVAILABLE */}
                        <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100/70 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between text-xs font-black mb-2 uppercase tracking-wider">
                                <span className="flex items-center text-emerald-600"><ShieldCheck size={14} className="mr-1.5" /> Available for Use</span>
                                <span className="text-slate-700">{health.AVAILABLE || 0} Nodes <span className="text-slate-400 font-medium">({getPercent(health.AVAILABLE)}%)</span></span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${getPercent(health.AVAILABLE)}%` }} />
                            </div>
                        </div>

                        {/* Status Module Metric: CHARGING / OCCUPIED */}
                        <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100/70 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between text-xs font-black mb-2 uppercase tracking-wider">
                                <span className="flex items-center text-indigo-600"><Activity size={14} className="mr-1.5" /> Charging / Occupied</span>
                                <span className="text-slate-700">{(health.OCCUPIED || 0) + (health.CHARGING || 0) + (health.OPERATIONAL || 0)} Nodes <span className="text-slate-400 font-medium">({getPercent((health.OCCUPIED || 0) + (health.CHARGING || 0) + (health.OPERATIONAL || 0))}%)</span></span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${getPercent((health.OCCUPIED || 0) + (health.CHARGING || 0) + (health.OPERATIONAL || 0))}%` }} />
                            </div>
                        </div>

                        {/* Status Module Metric: RESERVED */}
                        <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100/70 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between text-xs font-black mb-2 uppercase tracking-wider">
                                <span className="flex items-center text-blue-600"><Compass size={14} className="mr-1.5" /> Booked / Reserved</span>
                                <span className="text-slate-700">{health.RESERVED || 0} Nodes <span className="text-slate-400 font-medium">({getPercent(health.RESERVED)}%)</span></span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${getPercent(health.RESERVED)}%` }} />
                            </div>
                        </div>

                        {/* Status Module Metric: PLANNED */}
                        <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100/70 hover:bg-slate-50 transition-colors border-l-2 border-l-sky-500">
                            <div className="flex justify-between text-xs font-black mb-2 uppercase tracking-wider">
                                <span className="flex items-center text-sky-600"><Clock size={14} className="mr-1.5" /> Scheduled / Pending Approval</span>
                                <span className="text-slate-700">{health.PLANNED || 0} Nodes <span className="text-slate-400 font-medium">({getPercent(health.PLANNED)}%)</span></span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-sky-500 h-full rounded-full transition-all duration-500" style={{ width: `${getPercent(health.PLANNED)}%` }} />
                            </div>
                        </div>

                        {/* Status Module Metric: FAULTED / OUT OF SERVICE */}
                        <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-100/70 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between text-xs font-black mb-2 uppercase tracking-wider">
                                <span className="flex items-center text-rose-600"><XCircle size={14} className="mr-1.5" /> Disconnected / Faulted</span>
                                <span className="text-slate-700">{(health.FAULTED || 0) + (health.OUT_OF_SERVICE || 0)} Nodes <span className="text-slate-400 font-medium">({getPercent((health.FAULTED || 0) + (health.OUT_OF_SERVICE || 0))}%)</span></span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${getPercent((health.FAULTED || 0) + (health.OUT_OF_SERVICE || 0))}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ADVANCED REVIEWS PIPELINE MODERATION DECK */}
                <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md lg:col-span-5 flex flex-col justify-between relative overflow-hidden min-h-[420px]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800/40 rounded-full -mr-20 -mt-20 blur-2xl pointer-events-none" />

                    <div className="relative z-10 space-y-1">
                        <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-slate-100">
                            <ShieldCheck size={16} className="text-purple-400" /> Registry Moderation Guard
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                            Asset approval pipelines confirm corporate resource items meet absolute technical schema constraints before broadcasting vectors out onto public data logs.
                        </p>
                    </div>

                    <div className="space-y-4 my-6 relative z-10">
                        {/* Registry Node Card: Locations */}
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60">
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Site Approvals Matrix</p>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${approvals.locations?.pending > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse' : 'bg-slate-700 text-slate-400 border-transparent'}`}>
                                    {approvals.locations?.pending || 0} Queued
                                </span>
                            </div>
                            <div className="flex items-end space-x-1.5">
                                <span className="text-3xl font-black text-white tracking-tight">{approvals.locations?.approved || 0}</span>
                                <span className="text-xs font-bold text-slate-500 mb-1">/ {approvals.locations?.total || 0} Total Sites</span>
                            </div>
                            <div className="mt-2.5 w-full bg-slate-700 h-1 rounded-full overflow-hidden">
                                <div 
                                    className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                                    style={{ width: `${(approvals.locations?.approved / (approvals.locations?.total || 1)) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Registry Node Card: Hardware */}
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60">
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Terminal Approvals Matrix</p>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${approvals.chargePoints?.pending > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse' : 'bg-slate-700 text-slate-400 border-transparent'}`}>
                                    {approvals.chargePoints?.pending || 0} Queued
                                </span>
                            </div>
                            <div className="flex items-end space-x-1.5">
                                <span className="text-3xl font-black text-white tracking-tight">{approvals.chargePoints?.approved || 0}</span>
                                <span className="text-xs font-bold text-slate-500 mb-1">/ {approvals.chargePoints?.total || 0} Total Units</span>
                            </div>
                            <div className="mt-2.5 w-full bg-slate-700 h-1 rounded-full overflow-hidden">
                                <div 
                                    className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                                    style={{ width: `${(approvals.chargePoints?.approved / (approvals.chargePoints?.total || 1)) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider relative z-10 flex justify-between items-center">
                        <span className="flex items-center gap-1"><Hourglass size={10} className="text-purple-400 animate-spin" /> Stream Sync Active</span>
                        <span className="text-slate-400">Secure Cluster Connection</span>
                    </div>
                </div>

            </div>
        </div>
    );
}