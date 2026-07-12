'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import {
    LayoutDashboard, MapPin, Zap, Activity, DollarSign,
    Layers, Building2, RefreshCw, AlertTriangle, ShieldCheck,
    Clock, Users, Key, Hourglass, TrendingUp, Cpu
} from 'lucide-react';

export default function IntegratedDashboardPage() {
    const { user } = useAuthStore();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedCompany, setSelectedCompany] = useState('');
    const [activeMetricView, setActiveMetricView] = useState('revenue');

    const fetchMetrics = useCallback(async () => {
        try {
            const url = selectedCompany
                ? `/dashboard/metrics?filterCompanyId=${selectedCompany}`
                : '/dashboard/metrics';
            const response = await api.get(url);
            if (response.data.success) {
                setData(response.data);
            }
        } catch (error) {
            console.error("Dashboard synchronization error:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedCompany]);

    useEffect(() => {
        if (user) {
            fetchMetrics();
            const interval = setInterval(fetchMetrics, 30000); // 30s poll interval to respect server cycles
            return () => clearInterval(interval);
        }
    }, [user, fetchMetrics]);

    if (loading || !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 space-y-4 px-4 select-none">
                <RefreshCw size={36} className="animate-spin text-purple-600" />
                <p className="text-xs font-bold tracking-widest text-center uppercase text-slate-400 animate-pulse">Syncing platform telemetry matrix...</p>
            </div>
        );
    }

    const { summary, role, companies, chartData, systemStats } = data;

    return (
        <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8 px-2 sm:px-4 pb-16 select-none animate-in fade-in duration-300">

            {/* Top Operational Command Bar */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white px-2.5 py-0.5 rounded-md">
                            {role?.replace('_', ' ')} Command Node
                        </span>
                        <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100/60 px-2 py-0.5 rounded-md">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-wide">Live Stream</span>
                        </div>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5">Platform Operations Control</h2>
                </div>

                {/* Tenancy Scope Dropdown Filters */}
                <div className="flex items-center space-x-2 w-full md:w-auto">
                    {companies?.length > 0 && (
                        <div className="flex-1 md:flex-initial flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-purple-500 transition-colors">
                            <Building2 size={15} className="text-slate-400 mr-2 shrink-0" />
                            <select
                                value={selectedCompany}
                                onChange={(e) => { setLoading(true); setSelectedCompany(e.target.value); }}
                                className="bg-transparent text-xs font-bold text-slate-700 outline-hidden pr-4 py-0.5 w-full cursor-pointer"
                            >
                                <option value="">Global Network View</option>
                                {companies.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <button
                        onClick={() => { setLoading(true); fetchMetrics(); }}
                        className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-sm active:scale-98 cursor-pointer shrink-0"
                        title="Force refresh"
                    >
                        <RefreshCw size={15} />
                    </button>
                </div>
            </div>

            {/* Core Telemetry Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">

                {/* Active Sites Mapping */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Operational Sites</p>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{summary?.locations?.total || 0}</h3>
                        </div>
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-100/60 shadow-3xs"><MapPin size={20} /></div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-400">Moderation Queue</span>
                        <span className={`px-2 py-0.5 rounded-sm text-[10px] ${summary?.locations?.pendingApproval > 0 ? 'bg-amber-50 text-amber-700 font-black border border-amber-200' : 'bg-slate-100 text-slate-500'}`}>
                            {summary?.locations?.pendingApproval || 0} Pending
                        </span>
                    </div>
                </div>

                {/* Charge Stations Mapping */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hardware Assets</p>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{summary?.hardware?.totalUnits || 0}</h3>
                        </div>
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100/60 shadow-3xs"><Zap size={20} /></div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-400">Deployments Pending</span>
                        <span className={`px-2 py-0.5 rounded-sm text-[10px] ${summary?.hardware?.pendingApproval > 0 ? 'bg-amber-50 text-amber-700 font-black border border-amber-200' : 'bg-slate-100 text-slate-500'}`}>
                            {summary?.hardware?.pendingApproval || 0} Blocked
                        </span>
                    </div>
                </div>

                {/* Gross Financial Accumulations */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Gross Revenue</p>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">£{(summary?.financials?.totalRevenueCollected || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100/60 shadow-3xs"><DollarSign size={20} /></div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-400">Average/Session</span>
                        <span className="text-emerald-600 font-extrabold bg-emerald-50/50 px-1.5 py-0.5 rounded border border-emerald-100/40">£{summary?.financials?.averageSessionValue || 0}</span>
                    </div>
                </div>

                {/* Telemetry Energy Flow Count */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs relative overflow-hidden group">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Energy Transferred</p>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                {(summary?.financials?.totalKwhDispensated || 0).toLocaleString('en-GB', { maximumFractionDigits: 1 })} <span className="text-xs font-bold text-slate-400 uppercase">kWh</span>
                            </h3>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100/60 shadow-3xs"><Layers size={20} /></div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-400">Completed Load Outs</span>
                        <span className="text-slate-700 font-extrabold">{summary?.telemetry?.completedSessionsTotal || 0} tx</span>
                    </div>
                </div>
            </div>

            {/* Dynamic System Stats Deck (Super Admin Exclusive Platform Diagnostics View) */}
            {role === 'SUPER_ADMIN' && systemStats && (
                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-md">
                    <div className="flex items-center space-x-2 mb-4">
                        <Cpu size={16} className="text-purple-400" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Platform Core Diagnostics Matrix</h4>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Registered Operators</span>
                            <div className="flex items-center space-x-2">
                                <Building2 size={14} className="text-slate-600" />
                                <span className="text-lg font-black">{systemStats.totalCompanies}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total User Accounts</span>
                            <div className="flex items-center space-x-2">
                                <Users size={14} className="text-slate-600" />
                                <span className="text-lg font-black">{systemStats.totalUsers}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">User Activation Queue</span>
                            <div className="flex items-center space-x-2">
                                <Hourglass size={14} className="text-slate-600" />
                                <span className={`text-lg font-black ${systemStats.pendingUsersCount > 0 ? 'text-amber-400' : 'text-white'}`}>
                                    {systemStats.pendingUsersCount}
                                </span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Third-Party API Keys</span>
                            <div className="flex items-center space-x-2">
                                <Key size={14} className="text-slate-600" />
                                <span className="text-lg font-black text-emerald-400">{systemStats.activeApiKeysCount}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Live Infrastructure Allocation Maps */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* Left Side Status Allocation Cards */}
                <div className="lg:col-span-4 space-y-5">

                    {/* Real-time Load Capacity Matrix */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
                        <div>
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center"><TrendingUp size={13} className="mr-1 text-slate-400" /> Network Telemetry Rate</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">Live cluster infrastructure utilization ratio</p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-baseline justify-between">
                                <span className="text-3xl font-black text-slate-900 tracking-tight">
                                    {summary?.telemetry?.liveUtilizationRatePercentage || 0}%
                                </span>
                                <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                                    {summary?.telemetry?.activeChargingSessions || 0} Live Links
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div
                                    style={{ width: `${summary?.telemetry?.liveUtilizationRatePercentage || 0}%` }}
                                    className="bg-purple-600 h-full rounded-full transition-all duration-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Labeled Micro Connector Counters Mapping */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs space-y-3">
                        <div className="flex justify-between items-center mb-1">
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Connector Allocation Map</h4>
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                Total: {summary?.hardware?.connectors?.total || 0}
                            </span>
                        </div>

                        <div className="bg-emerald-50/40 border border-emerald-100/60 px-4 py-2.5 rounded-xl flex items-center justify-between">
                            <div className="flex items-center text-emerald-800 font-bold text-xs">
                                <ShieldCheck size={14} className="mr-2 text-emerald-600" /> Available Plugs
                            </div>
                            <span className="text-sm font-black text-emerald-700">{summary?.hardware?.connectors?.available || 0}</span>
                        </div>

                        <div className="bg-amber-50/40 border border-amber-100/60 px-4 py-2.5 rounded-xl flex items-center justify-between">
                            <div className="flex items-center text-amber-800 font-bold text-xs">
                                <Activity size={14} className="mr-2 text-amber-600 animate-pulse" /> In Use (Occupied)
                            </div>
                            <span className="text-sm font-black text-amber-700">{summary?.hardware?.connectors?.occupied || 0}</span>
                        </div>

                        <div className="bg-rose-50/40 border border-rose-100/60 px-4 py-2.5 rounded-xl flex items-center justify-between">
                            <div className="flex items-center text-rose-800 font-bold text-xs">
                                <AlertTriangle size={14} className="mr-2 text-rose-600" /> Out Of Order
                            </div>
                            <span className="text-sm font-black text-rose-700">{summary?.hardware?.connectors?.faulted || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Right Side Historical Graphical Performance Deck */}
                <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
                        <div>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center"><Clock size={14} className="mr-1 text-slate-400" /> Load Performance Telemetry</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Genuine 7-day retrospective analytics window</p>
                        </div>
                        <div className="flex space-x-1 bg-slate-100 border border-slate-200/50 p-1 rounded-xl self-stretch sm:self-auto text-center">
                            <button
                                onClick={() => setActiveMetricView('revenue')}
                                className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${activeMetricView === 'revenue' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/40' : 'text-slate-400 hover:text-slate-700'}`}
                            >
                                Revenue
                            </button>
                            <button
                                onClick={() => setActiveMetricView('kwh')}
                                className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${activeMetricView === 'kwh' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/40' : 'text-slate-400 hover:text-slate-700'}`}
                            >
                                Energy
                            </button>
                        </div>
                    </div>

                    {/* Chart Container Canvas Rendering */}
                    <div className="overflow-x-auto scrollbar-none -mx-6 px-6 sm:mx-0 sm:px-0">
                        <div className="min-w-[500px] sm:min-w-0">
                            <PremiumDataExplorer chartMetrics={chartData} viewType={activeMetricView} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Pure HTML/CSS High Fidelity Micro Chart Sub-component
function PremiumDataExplorer({ chartMetrics = [], viewType }) {
    if (!chartMetrics.length) return <div className="h-48 flex items-center justify-center text-xs text-slate-400 font-medium">No chronological session logs found in database parameters.</div>;

    const values = chartMetrics.map(d => viewType === 'revenue' ? d.revenue : d.kwh);
    const maxValue = Math.max(...values, 10);

    return (
        <div className="pt-4 pb-2">
            <div className="h-56 flex items-end justify-between gap-4 px-4 border-b border-slate-100">
                {chartMetrics.map((point, idx) => {
                    const currentVal = viewType === 'revenue' ? point.revenue : point.kwh;
                    const pctHeight = (currentVal / maxValue) * 100;

                    return (
                        <div key={idx} className="flex-1 flex flex-col items-center group h-full justify-end relative">
                            {/* Hover State Dynamic Micro Tooltip Box */}
                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-[calc(100%-4px)] mb-2 bg-slate-900 text-white font-mono font-bold text-[10px] px-2.5 py-1 rounded-lg transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 shadow-md whitespace-nowrap z-20 pointer-events-none border border-slate-800">
                                {viewType === 'revenue' ? `£${currentVal.toFixed(2)}` : `${currentVal.toFixed(1)} kWh`}
                                <span className="block text-[8px] font-sans font-medium text-slate-400 text-center mt-0.5">{point.sessions} sessions</span>
                            </div>

                            {/* Bar Columns Fill Layer Vector */}
                            <div
                                style={{ height: `${Math.max(pctHeight, 4)}%` }}
                                className={`w-full rounded-t-lg transition-all duration-500 shadow-inner 
                                    ${viewType === 'revenue'
                                        ? 'bg-gradient-to-t from-purple-600 to-purple-400 group-hover:from-purple-500 group-hover:to-purple-300'
                                        : 'bg-gradient-to-t from-blue-600 to-blue-400 group-hover:from-blue-500 group-hover:to-blue-300'}`}
                            />

                            {/* Horizontal Axis Matrix Day Labels */}
                            <span className="text-[10px] font-black text-slate-400 mt-3 h-5 uppercase tracking-wider text-center block w-full truncate">
                                {point.date}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}