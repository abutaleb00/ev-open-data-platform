'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import {
    MapPin, Zap, Activity, DollarSign,
    Layers, RefreshCw, AlertTriangle, ShieldCheck,
    Clock, TrendingUp
} from 'lucide-react';

export default function IntegratedDashboardPage() {
    const { user } = useAuthStore();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeMetricView, setActiveMetricView] = useState('revenue');

    const fetchMetrics = useCallback(async () => {
        try {
            const response = await api.get('/dashboard/metrics');
            if (response.data.success) {
                setData(response.data);
            }
        } catch (error) {
            console.error("Dashboard synchronization error:", error);

            if (error.response?.status === 403) {
                setData({
                    errorOverride: true,
                    message: error.response.data.message || "Ecosystem isolation validation error."
                });
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchMetrics();
            const interval = setInterval(fetchMetrics, 20000); // 20-second polling interval
            return () => clearInterval(interval);
        }
    }, [user, fetchMetrics]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400 space-y-4 px-4 select-none">
                <RefreshCw size={36} className="animate-spin text-indigo-600" />
                <p className="text-xs font-bold tracking-widest text-center uppercase animate-pulse">Syncing corporate telemetry stream...</p>
            </div>
        );
    }

    if (data?.errorOverride) {
        return (
            <div className="max-w-md mx-auto my-20 bg-white border border-rose-100 p-8 rounded-3xl text-center space-y-5 shadow-xs select-none animate-in fade-in duration-200">
                <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-600 shadow-inner">
                    <AlertTriangle size={24} />
                </div>
                <div className="space-y-1">
                    <h3 className="text-base font-black text-slate-900 tracking-tight">Tenancy Activation Required</h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed px-2">
                        {data.message} This gate triggers if you access workspace environments before a platform Super Admin explicitly authorizes your network configuration metadata.
                    </p>
                </div>
                <div className="pt-2">
                    <button
                        onClick={() => { setLoading(true); fetchMetrics(); }}
                        className="inline-flex items-center space-x-2 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-all cursor-pointer active:scale-98"
                    >
                        <RefreshCw size={12} />
                        <span>Re-test Handshake Sync</span>
                    </button>
                </div>
            </div>
        );
    }

    if (!data || !data.summary) return null;

    const { summary, role, chartData } = data;

    return (
        <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8 px-2 sm:px-4 pb-16 select-none animate-in fade-in duration-300">

            {/* Top Interactive Row */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
                <div>
                    <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white px-2.5 py-0.5 rounded-md">
                            {(role || 'COMPANY_ADMIN').replace('_', ' ')} Hub
                        </span>
                        <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100/60 px-2 py-0.5 rounded-md">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-wide">Live</span>
                        </div>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1.5">Network Operation Control</h2>
                </div>

                <div className="flex items-center self-end sm:self-auto">
                    <button
                        onClick={() => { setLoading(true); fetchMetrics(); }}
                        className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-sm active:scale-98 cursor-pointer shrink-0"
                        title="Force refresh telemetry"
                    >
                        <RefreshCw size={15} />
                    </button>
                </div>
            </div>

            {/* Core Statistics Count Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">

                {/* FIXED: Total Infrastructure Locations Summary Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs group">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Locations</p>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{summary.locations?.total || 0}</h3>
                        </div>
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/60"><MapPin size={20} /></div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-400">Approved / Operational</span>
                        <span className="text-slate-700 font-extrabold">{summary.locations?.active || 0} Active</span>
                    </div>
                </div>

                {/* Hardware Assets Summary Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs group">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Stations Deployed</p>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{summary.hardware?.totalUnits || 0}</h3>
                        </div>
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100/60"><Zap size={20} /></div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-400">Pending Approvals</span>
                        <span className={`px-1.5 py-0.5 rounded-xs text-[10px] ${summary.hardware?.pendingApproval > 0 ? 'bg-amber-50 text-amber-700 font-black' : 'bg-slate-100 text-slate-500'}`}>
                            {summary.hardware?.pendingApproval || 0} Units
                        </span>
                    </div>
                </div>

                {/* Financial Income Summary Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs group">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Gross Revenue</p>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">£{(summary.financials?.totalRevenueCollected || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}</h3>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100/60"><DollarSign size={20} /></div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-400">Ticket Average</span>
                        <span className="text-emerald-600 font-extrabold">£{summary.financials?.averageSessionValue || 0}</span>
                    </div>
                </div>

                {/* Dispatched Energy Flow Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs group">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Output Load</p>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                {(summary.financials?.totalKwhDispensated || 0).toLocaleString('en-GB', { maximumFractionDigits: 1 })} <span className="text-xs font-bold text-slate-400 uppercase">kWh</span>
                            </h3>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100/60"><Layers size={20} /></div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-400">Total Transactions</span>
                        <span className="text-slate-700 font-extrabold">{summary.telemetry?.completedSessionsTotal || 0} items</span>
                    </div>
                </div>
            </div>

            {/* Split Status and Performance Metrics Segment */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* Left Telemetry Status Columns */}
                <div className="lg:col-span-4 space-y-5">

                    {/* Live Cluster Capacity Metric Meter */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs space-y-4">
                        <div>
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center"><TrendingUp size={13} className="mr-1 text-slate-400" /> Network Capacity Utilization</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">Live tenant interface socket load metrics</p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-baseline justify-between">
                                <span className="text-3xl font-black text-slate-900 tracking-tight">
                                    {summary.telemetry?.liveUtilizationRatePercentage || 0}%
                                </span>
                                <span className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                                    {summary.telemetry?.activeChargingSessions || 0} Active links
                                </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div
                                    style={{ width: `${summary.telemetry?.liveUtilizationRatePercentage || 0}%` }}
                                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Labeled Micro Connector Counters Mapping */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs space-y-3">
                        <div className="flex justify-between items-center mb-1">
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Connector Allocation Map</h4>
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                Outlets: {summary.hardware?.connectors?.total || 0}
                            </span>
                        </div>

                        <div className="bg-emerald-50/40 border border-emerald-100/60 px-4 py-2.5 rounded-xl flex items-center justify-between">
                            <div className="flex items-center text-emerald-800 font-bold text-xs">
                                <ShieldCheck size={14} className="mr-2 text-emerald-600" /> Available Plugs
                            </div>
                            <span className="text-sm font-black text-emerald-700">{summary.hardware?.connectors?.available || 0}</span>
                        </div>

                        <div className="bg-amber-50/40 border border-amber-100/60 px-4 py-2.5 rounded-xl flex items-center justify-between">
                            <div className="flex items-center text-amber-800 font-bold text-xs">
                                <Activity size={14} className="mr-2 text-amber-600 animate-pulse" /> In Use (Charging)
                            </div>
                            <span className="text-sm font-black text-amber-700">{summary.hardware?.connectors?.occupied || 0}</span>
                        </div>

                        <div className="bg-rose-50/40 border border-rose-100/60 px-4 py-2.5 rounded-xl flex items-center justify-between">
                            <div className="flex items-center text-rose-800 font-bold text-xs">
                                <AlertTriangle size={14} className="mr-2 text-rose-600" /> Out of Order
                            </div>
                            <span className="text-sm font-black text-rose-700">{summary.hardware?.connectors?.faulted || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Right Historical Graphical Performance Module */}
                <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
                        <div>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center"><Clock size={14} className="mr-1 text-slate-400" /> Retrospective Telemetry Performance</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Rolling 7-day operations logging timeline window</p>
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

                    {/* Retrospective Data Graph Canvas */}
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
    if (!chartMetrics.length) {
        return <div className="h-56 flex items-center justify-center text-xs text-slate-400 font-semibold">No operational session histories parsed inside database logs.</div>;
    }

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
                                <span className="block text-[8px] font-sans font-medium text-slate-400 text-center mt-0.5">{point.sessions || 0} sessions</span>
                            </div>

                            {/* Bar Columns Fill Layer Vector */}
                            <div
                                style={{ height: `${Math.max(pctHeight, 4)}%` }}
                                className={`w-full rounded-t-lg transition-all duration-500 shadow-inner 
                                    ${viewType === 'revenue'
                                        ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 group-hover:from-indigo-500 group-hover:to-indigo-300'
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