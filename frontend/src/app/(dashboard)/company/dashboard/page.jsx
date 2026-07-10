'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import {
    MapPin, Zap, Activity, DollarSign,
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
            
            // Catch authentication/tenantic containment exceptions (403) gracefully
            if (error.response?.status === 403) {
                setData({
                    errorOverride: true,
                    message: error.response.data.message || "Ecosystem isolation validation error."
                });
            }
        } finally {
            setLoading(false);
        }
    }, [selectedCompany]);

    useEffect(() => {
        if (user) {
            fetchMetrics();
            // Enable telemetry background update loops every 15 seconds
            const interval = setInterval(fetchMetrics, 15000);
            return () => clearInterval(interval);
        }
    }, [user, fetchMetrics]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-24 text-slate-400 space-y-4">
                <RefreshCw size={36} className="animate-spin text-indigo-600" />
                <p className="text-sm font-bold tracking-wide animate-pulse">Syncing platform telemetry nodes...</p>
            </div>
        );
    }

    // --- RESILIENT OVERRIDE: INTERCEPT LOCKED/UNMAPPED TEAMS ---
    if (data?.errorOverride) {
        return (
            <div className="max-w-md mx-auto my-20 bg-white border border-rose-100 p-8 rounded-3xl text-center space-y-5 shadow-xs animate-in fade-in duration-200">
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

    // Safety fallback block if data object drops unexpectedly
    if (!data || !data.metrics) return null;

    const { metrics, role, companies, chartData } = data;

    return (
        <div className="max-w-7xl mx-auto space-y-8 px-2">

            {/* Top Interactive Row */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div>
                    <div className="flex items-center space-x-2">
                        <span className="text-xs font-black uppercase tracking-widest bg-slate-900 text-white px-2.5 py-0.5 rounded-md">
                            {(role || 'COMPANY_ADMIN').replace('_', ' ')} Mode
                        </span>
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs text-slate-400 font-bold">Real-time Telemetry Live</span>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight mt-1">Platform Operations Control</h2>
                </div>

                {/* Scope Filtering Matrix */}
                <div className="flex items-center space-x-3 w-full md:w-auto">
                    {role === 'SUPER_ADMIN' && companies?.length > 0 && (
                        <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                            <Building2 size={16} className="text-slate-400 ml-2" />
                            <select
                                value={selectedCompany}
                                onChange={(e) => { setLoading(true); setSelectedCompany(e.target.value); }}
                                className="bg-transparent text-sm font-bold text-slate-700 outline-hidden pr-4 py-1 cursor-pointer"
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
                        className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Core Statistics Count Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-4">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><MapPin size={24} /></div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Sites</p>
                        <h3 className="text-2xl font-black text-slate-900 mt-0.5">{metrics.totalLocations}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-4">
                    <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl"><Zap size={24} /></div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Charge Stations</p>
                        <h3 className="text-2xl font-black text-slate-900 mt-0.5">{metrics.totalHardwareUnits}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-4">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><DollarSign size={24} /></div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Revenue</p>
                        <h3 className="text-2xl font-black text-slate-900 mt-0.5">£{(metrics.totalRevenue || 0).toFixed(2)}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Layers size={24} /></div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Energy Pumped</p>
                        <h3 className="text-2xl font-black text-slate-900 mt-0.5">{(metrics.totalPowerDelivered || 0).toFixed(1)} <span className="text-xs font-bold text-slate-400">kWh</span></h3>
                    </div>
                </div>

            </div>

            {/* Live Hardware Connector Status Blocks */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Connector Allocation Map</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-emerald-700 font-bold text-sm">
                            <ShieldCheck size={16} /> <span>Available Plugs</span>
                        </div>
                        <span className="text-xl font-black text-emerald-700">{metrics.connectorsAvailable}</span>
                    </div>
                    <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-amber-700 font-bold text-sm">
                            <Activity size={16} /> <span>In Use (Charging)</span>
                        </div>
                        <span className="text-xl font-black text-amber-700">{metrics.connectorsOccupied}</span>
                    </div>
                    <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-rose-700 font-bold text-sm">
                            <AlertTriangle size={16} /> <span>Out of Order</span>
                        </div>
                        <span className="text-xl font-black text-rose-700">{metrics.connectorsFaulted}</span>
                    </div>
                </div>
            </div>

            {/* Graphical Visualization Module Wrapper */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                    <div>
                        <h4 className="text-lg font-black text-slate-900">Performance Telemetry</h4>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">Weekly tracking distributions across data nodes</p>
                    </div>
                    <div className="flex space-x-1.5 bg-slate-100 p-1 rounded-xl">
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

                {/* Render Embedded Chart Explorer UI */}
                {chartData && <PremiumDataExplorer chartMetrics={chartData} viewType={activeMetricView} />}
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
            <div className="h-64 flex items-end justify-between gap-4 px-4 border-b border-slate-100">
                {chartMetrics.map((point, idx) => {
                    const currentVal = viewType === 'revenue' ? point.revenue : point.kwh;
                    const pctHeight = (currentVal / maxValue) * 100;

                    return (
                        <div key={idx} className="flex-1 flex flex-col items-center group h-full justify-end">
                            {/* Interactive Tooltip popup trigger */}
                            <div className="opacity-0 group-hover:opacity-100 mb-2 bg-slate-900 text-white font-bold text-xs px-2.5 py-1 rounded-lg transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 shadow-md pointer-events-none">
                                {viewType === 'revenue' ? `£${currentVal.toFixed(1)}` : `${currentVal.toFixed(1)} kWh`}
                            </div>

                            {/* Vector bar container */}
                            <div
                                style={{ height: `${Math.max(pctHeight, 6)}%` }}
                                className={`w-full rounded-t-xl transition-all duration-500 ${viewType === 'revenue' ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 group-hover:from-indigo-500 group-hover:to-indigo-300' : 'bg-gradient-to-t from-blue-600 to-blue-400 group-hover:from-blue-500 group-hover:to-blue-300'}`}
                            />

                            <span className="text-xs font-bold text-slate-400 mt-3 h-6">{point.date}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}