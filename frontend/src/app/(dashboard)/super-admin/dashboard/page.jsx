'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import {
    LayoutDashboard, MapPin, Zap, Activity, DollarSign,
    Layers, Building2, RefreshCw, AlertTriangle, ShieldCheck
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
            const interval = setInterval(fetchMetrics, 15000);
            return () => clearInterval(interval);
        }
    }, [user, fetchMetrics]);

    if (loading || !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400 space-y-4 px-4">
                <RefreshCw size={36} className="animate-spin text-indigo-600" />
                <p className="text-sm font-bold tracking-wide text-center animate-pulse">Syncing platform telemetry nodes...</p>
            </div>
        );
    }

    const { metrics, role, companies, chartData } = data;

    return (
        <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8 px-2 sm:px-4">

            {/* Top Interactive Row - Stacked on Mobile, Row on Desktop */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest bg-slate-900 text-white px-2.5 py-0.5 rounded-md">
                            {role?.replace('_', ' ')} Mode
                        </span>
                        <div className="flex items-center space-x-1.5">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] sm:text-xs text-slate-400 font-bold">Real-time Telemetry Live</span>
                        </div>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">Platform Operations Control</h2>
                </div>

                {/* Scope Filtering Matrix */}
                <div className="flex items-center space-x-2 sm:space-x-3 w-full md:w-auto">
                    {role === 'SUPER_ADMIN' && companies?.length > 0 && (
                        <div className="flex-1 md:flex-initial flex items-center bg-slate-50 p-1.5 rounded-xl border border-slate-200 min-w-0">
                            <Building2 size={16} className="text-slate-400 ml-2 shrink-0" />
                            <select
                                value={selectedCompany}
                                onChange={(e) => { setLoading(true); setSelectedCompany(e.target.value); }}
                                className="bg-transparent text-xs sm:text-sm font-bold text-slate-700 outline-none pr-6 pl-1 py-1 w-full truncate"
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
                        className="p-2.5 sm:p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Core Statistics Count Matrix - 1 col on Mobile, 2 on Tablet, 4 on Large Screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-4">
                    <div className="p-3 sm:p-4 bg-indigo-50 text-indigo-600 rounded-xl sm:rounded-2xl shrink-0"><MapPin size={22} /></div>
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Active Sites</p>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 truncate">{metrics.totalLocations}</h3>
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-4">
                    <div className="p-3 sm:p-4 bg-amber-50 text-amber-600 rounded-xl sm:rounded-2xl shrink-0"><Zap size={22} /></div>
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Charge Stations</p>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 truncate">{metrics.totalHardwareUnits}</h3>
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-4">
                    <div className="p-3 sm:p-4 bg-emerald-50 text-emerald-600 rounded-xl sm:rounded-2xl shrink-0"><DollarSign size={22} /></div>
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Gross Revenue</p>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 truncate">£{metrics.totalRevenue.toFixed(2)}</h3>
                    </div>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-4">
                    <div className="p-3 sm:p-4 bg-blue-50 text-blue-600 rounded-xl sm:rounded-2xl shrink-0"><Layers size={22} /></div>
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Energy Pumped</p>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 truncate">
                            {metrics.totalPowerDelivered.toFixed(1)} <span className="text-[10px] sm:text-xs font-bold text-slate-400">kWh</span>
                        </h3>
                    </div>
                </div>
            </div>

            {/* Live Hardware Connector Status Blocks */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">Connector Allocation Map</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                    <div className="bg-emerald-50/50 border border-emerald-100 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-emerald-700 font-bold text-xs sm:text-sm">
                            <ShieldCheck size={16} className="shrink-0" /> <span>Available Plugs</span>
                        </div>
                        <span className="text-lg sm:text-xl font-black text-emerald-700">{metrics.connectorsAvailable}</span>
                    </div>
                    <div className="bg-amber-50/50 border border-amber-100 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-amber-700 font-bold text-xs sm:text-sm">
                            <Activity size={16} className="shrink-0" /> <span>In Use (Charging)</span>
                        </div>
                        <span className="text-lg sm:text-xl font-black text-amber-700">{metrics.connectorsOccupied}</span>
                    </div>
                    <div className="bg-rose-50/50 border border-rose-100 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-rose-700 font-bold text-xs sm:text-sm">
                            <AlertTriangle size={16} className="shrink-0" /> <span>Out of Order</span>
                        </div>
                        <span className="text-lg sm:text-xl font-black text-rose-700">{metrics.connectorsFaulted}</span>
                    </div>
                </div>
            </div>

            {/* Graphical Visualization Module Wrapper */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-50 pb-4">
                    <div>
                        <h4 className="text-base sm:text-lg font-black text-slate-900">Performance Telemetry</h4>
                        <p className="text-[11px] sm:text-xs text-slate-400 font-bold mt-0.5">Weekly tracking distributions across data nodes</p>
                    </div>
                    <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl self-end sm:self-auto">
                        <button
                            onClick={() => setActiveMetricView('revenue')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeMetricView === 'revenue' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Revenue
                        </button>
                        <button
                            onClick={() => setActiveMetricView('kwh')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeMetricView === 'kwh' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Energy
                        </button>
                    </div>
                </div>

                {/* Render Embedded Chart Explorer UI - Wrapped with horizontal scroll safety for tiny screens */}
                <div className="overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="min-w-[480px] sm:min-w-0">
                        <PremiumDataExplorer chartMetrics={chartData} viewType={activeMetricView} />
                    </div>
                </div>
            </div>

        </div>
    );
}

// Interactive Pure CSS/HTML Premium Bar Chart Sub-component
function PremiumDataExplorer({ chartMetrics, viewType }) {
    const values = chartMetrics.map(d => viewType === 'revenue' ? d.revenue : d.kwh);
    const maxValue = Math.max(...values, 10);

    return (
        <div className="pt-6 pb-2">
            <div className="h-48 sm:h-64 flex items-end justify-between gap-2 sm:gap-4 px-2 sm:px-4 border-b border-slate-100">
                {chartMetrics.map((point, idx) => {
                    const currentVal = viewType === 'revenue' ? point.revenue : point.kwh;
                    const pctHeight = (currentVal / maxValue) * 100;

                    return (
                        <div key={idx} className="flex-1 flex flex-col items-center group h-full justify-end relative">
                            {/* Interactive Tooltip popup trigger - Adjusted layout position coordinates */}
                            <div className="opacity-0 group-hover:opacity-100 absolute bottom-[calc(100%-8px)] mb-2 bg-slate-900 text-white font-bold text-[10px] sm:text-xs px-2 py-1 rounded-lg transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 shadow-md whitespace-nowrap z-10 pointer-events-none">
                                {viewType === 'revenue' ? `£${currentVal.toFixed(1)}` : `${currentVal.toFixed(1)} kWh`}
                            </div>

                            {/* Vector bar container */}
                            <div
                                style={{ height: `${Math.max(pctHeight, 6)}%` }}
                                className={`w-full rounded-t-lg sm:rounded-t-xl transition-all duration-500 ${viewType === 'revenue' ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 group-hover:from-indigo-500 group-hover:to-indigo-300' : 'bg-gradient-to-t from-blue-600 to-blue-400 group-hover:from-blue-500 group-hover:to-blue-300'}`}
                            />

                            <span className="text-[10px] sm:text-xs font-bold text-slate-400 mt-3 h-6 text-center truncate w-full">{point.date}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}