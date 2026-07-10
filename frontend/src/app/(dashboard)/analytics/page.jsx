'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import {
    Activity, Zap, MapPin, Building2,
    CheckCircle2, AlertTriangle, XCircle, Clock, ShieldCheck, ArrowUpRight
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
            <div className="flex flex-col items-center justify-center h-[70vh] text-slate-400 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 m-6">
                <div className="relative flex items-center justify-center mb-4">
                    <div className="absolute w-12 h-12 bg-indigo-50 rounded-full animate-ping opacity-75" />
                    <Activity size={28} className="text-indigo-600 animate-pulse relative z-10" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing Asset Intelligence Metrics...</p>
            </div>
        );
    }

    const metrics = stats?.metrics || { companies: 0, locations: 0, chargePoints: 0 };
    const health = stats?.health || { AVAILABLE: 0, OPERATIONAL: 0, PLANNED: 0, OUT_OF_SERVICE: 0, FAULTED: 0 };
    const approvals = stats?.approvals || { locations: { total: 0, approved: 0 }, chargePoints: { total: 0, approved: 0 } };

    // Calculate total assets across health flags dynamically
    const totalHardwareFromHealth = Object.values(health).reduce((a, b) => a + b, 0);
    const totalHardware = metrics.chargePoints || totalHardwareFromHealth || 1;

    const getPercent = (value) => {
        if (!value || totalHardware === 0) return 0;
        return Math.round((value / totalHardware) * 100);
    };

    return (
        <div className="space-y-10 p-6 max-w-7xl mx-auto bg-slate-50/30 min-h-screen">

            {/* 1. PREMIUM HEADER META PANEL */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-8 gap-4">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 text-[10px] font-black uppercase tracking-wider text-slate-100 mb-2">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Live System Telemetry
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Network Analytics Platform</h2>
                    <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase">Core Infrastructure Diagnostics Framework & compliance telemetry matrix.</p>
                </div>
                <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm self-start md:self-auto">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-xs text-slate-700">
                        {user?.role?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Access Node Privilege</p>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-wide">{user?.role || 'Operator Context'}</p>
                    </div>
                </div>
            </div>

            {/* 2. CORE SYSTEM QUANTITY COUNTERS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {user?.role === 'SUPER_ADMIN' && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-all duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-500" />
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Building2 size={24} /></div>
                            <span className="text-slate-300 group-hover:text-indigo-400 transition-colors"><ArrowUpRight size={18} /></span>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">Registered System Operators</p>
                        <h4 className="text-4xl font-black text-slate-900 tracking-tight mt-1 relative z-10">{metrics.companies}</h4>
                    </div>
                )}

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/30 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-500" />
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><MapPin size={24} /></div>
                        <span className="text-slate-300 group-hover:text-emerald-400 transition-colors"><ArrowUpRight size={18} /></span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">Active Host Locations</p>
                    <h4 className="text-4xl font-black text-slate-900 tracking-tight mt-1 relative z-10">{metrics.locations}</h4>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50/30 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-500" />
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Zap size={24} /></div>
                        <span className="text-slate-300 group-hover:text-amber-400 transition-colors"><ArrowUpRight size={18} /></span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">Hardware Terminals Deployed</p>
                    <h4 className="text-4xl font-black text-slate-900 tracking-tight mt-1 relative z-10">{totalHardware}</h4>
                </div>
            </div>

            {/* 3. DIAGNOSTICS DISTRIBUTION AND COMPLIANCE MAP SPLIT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* BACKEND STATUS DISTRIBUTION DATA BLOCKS */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm lg:col-span-7 space-y-6">
                    <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <Activity size={18} className="text-indigo-600" /> Terminal Operational Diagnostics
                        </h3>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">Live breakdown of individual node status indicators across the active grid.</p>
                    </div>

                    <div className="space-y-5">
                        {/* Status Module Metric Render Block: AVAILABLE */}
                        <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between text-xs font-black mb-2 uppercase tracking-wider">
                                <span className="flex items-center text-emerald-600"><CheckCircle2 size={14} className="mr-1.5" /> Available for Use</span>
                                <span className="text-slate-700">{health.AVAILABLE || 0} Nodes <span className="text-slate-400 font-medium">({getPercent(health.AVAILABLE)}%)</span></span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div className="bg-emerald-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${getPercent(health.AVAILABLE)}%` }}></div>
                            </div>
                        </div>

                        {/* Status Module Metric Render Block: OPERATIONAL */}
                        <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between text-xs font-black mb-2 uppercase tracking-wider">
                                <span className="flex items-center text-teal-600"><CheckCircle2 size={14} className="mr-1.5" /> Charging Active</span>
                                <span className="text-slate-700">{health.OPERATIONAL || 0} Nodes <span className="text-slate-400 font-medium">({getPercent(health.OPERATIONAL)}%)</span></span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div className="bg-teal-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${getPercent(health.OPERATIONAL)}%` }}></div>
                            </div>
                        </div>

                        {/* Status Module Metric Render Block: PLANNED */}
                        <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between text-xs font-black mb-2 uppercase tracking-wider">
                                <span className="flex items-center text-blue-600"><Clock size={14} className="mr-1.5" /> Scheduled Implementation</span>
                                <span className="text-slate-700">{health.PLANNED || 0} Nodes <span className="text-slate-400 font-medium">({getPercent(health.PLANNED)}%)</span></span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div className="bg-blue-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${getPercent(health.PLANNED)}%` }}></div>
                            </div>
                        </div>

                        {/* Status Module Metric Render Block: OUT_OF_SERVICE */}
                        <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between text-xs font-black mb-2 uppercase tracking-wider">
                                <span className="flex items-center text-amber-600"><AlertTriangle size={14} className="mr-1.5" /> Maintenance Standby</span>
                                <span className="text-slate-700">{health.OUT_OF_SERVICE || 0} Nodes <span className="text-slate-400 font-medium">({getPercent(health.OUT_OF_SERVICE)}%)</span></span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div className="bg-amber-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${getPercent(health.OUT_OF_SERVICE)}%` }}></div>
                            </div>
                        </div>

                        {/* Status Module Metric Render Block: FAULTED */}
                        <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between text-xs font-black mb-2 uppercase tracking-wider">
                                <span className="flex items-center text-rose-600"><XCircle size={14} className="mr-1.5" /> Hardware Disconnected</span>
                                <span className="text-slate-700">{health.FAULTED || 0} Nodes <span className="text-slate-400 font-medium">({getPercent(health.FAULTED)}%)</span></span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div className="bg-rose-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${getPercent(health.FAULTED)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ADVANCED OPEN DATA REGISTRY AUDIT PANEL */}
                <div className="bg-slate-900 text-white p-8 rounded-3xl border border-slate-800 shadow-xl lg:col-span-5 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800/40 rounded-full -mr-20 -mt-20 blur-2xl pointer-events-none" />

                    <div className="relative z-10">
                        <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-slate-100">
                            <ShieldCheck size={18} className="text-teal-400" /> Registry Moderation Guard
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">
                            Asset approval indicators confirm hardware records meet complete schema specifications before syncing with public mapping nodes.
                        </p>
                    </div>

                    <div className="space-y-6 my-8 relative z-10">
                        {/* Registry Node Card: Locations */}
                        <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/60">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Site Indexes Verified</p>
                                <span className="text-[10px] font-black bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded-md border border-teal-500/20">
                                    {Math.round((approvals.locations.approved / (approvals.locations.total || 1)) * 100)}% Verified
                                </span>
                            </div>
                            <div className="flex items-end space-x-1.5">
                                <span className="text-4xl font-black text-white tracking-tight">{approvals.locations.approved}</span>
                                <span className="text-sm font-bold text-slate-500 mb-1">/ {approvals.locations.total} Sites</span>
                            </div>
                            <div className="mt-3 w-full bg-slate-700 rounded-full h-1">
                                <div className="bg-teal-400 h-1 rounded-full" style={{ width: `${(approvals.locations.approved / (approvals.locations.total || 1)) * 100}%` }}></div>
                            </div>
                        </div>

                        {/* Registry Node Card: Hardware */}
                        <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/60">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Station Clusters Audited</p>
                                <span className="text-[10px] font-black bg-teal-400/10 text-teal-400 px-2 py-0.5 rounded-md border border-teal-400/20">
                                    {Math.round((approvals.chargePoints.approved / (approvals.chargePoints.total || 1)) * 100)}% Verified
                                </span>
                            </div>
                            <div className="flex items-end space-x-1.5">
                                <span className="text-4xl font-black text-white tracking-tight">{approvals.chargePoints.approved}</span>
                                <span className="text-sm font-bold text-slate-500 mb-1">/ {approvals.chargePoints.total} Terminals</span>
                            </div>
                            <div className="mt-3 w-full bg-slate-700 rounded-full h-1">
                                <div className="bg-teal-400 h-1 rounded-full" style={{ width: `${(approvals.chargePoints.approved / (approvals.chargePoints.total || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider relative z-10 flex justify-between items-center">
                        <span>Data Integrity Level: Optimal</span>
                        <span className="text-teal-400">Secure Cluster Connection</span>
                    </div>
                </div>
            </div>

        </div>
    );
}