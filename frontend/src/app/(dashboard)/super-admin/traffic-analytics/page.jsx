'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import {
    BarChart3, Globe, ShieldAlert, CheckCircle2,
    Clock, RefreshCw, Zap, Server, Filter
} from 'lucide-react';

export default function TrafficAnalyticsPage() {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState('7');
    const [operatorRef, setOperatorRef] = useState('');

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('days', days);
            if (operatorRef.trim()) params.append('operator_reference_id', operatorRef.trim());

            const res = await api.get(`/open-data/admin/traffic-metrics?${params.toString()}`);
            if (res.data) {
                setMetrics(res.data);
            }
        } catch (err) {
            console.error('Failed to load traffic analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [days]);

    return (
        <div className="max-w-7xl mx-auto space-y-8 px-2 select-none">
            {/* Header Banner */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center space-x-4">
                    <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                        <BarChart3 size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">API Traffic Analytics</h2>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">High-level open data stream usage metrics and client IP volumes</p>
                    </div>
                </div>

                <div className="flex items-center space-x-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-48">
                        <Filter size={14} className="absolute left-3 text-slate-400 top-3" />
                        <input
                            type="text"
                            placeholder="Operator Ref ID..."
                            value={operatorRef}
                            onChange={(e) => setOperatorRef(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchAnalytics()}
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                        />
                    </div>

                    <button
                        onClick={fetchAnalytics} disabled={loading}
                        className="flex cursor-pointer items-center justify-center space-x-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 font-black text-xs uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        <span>Re-calculate</span>
                    </button>
                </div>
            </div>

            {/* Timeframe Selector & Metric Cards Grid */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Metric Counter Overview</span>
                    <select
                        value={days}
                        onChange={(e) => setDays(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs focus:outline-hidden"
                    >
                        <option value="1">Past 24 Hours</option>
                        <option value="7">Past 7 Days</option>
                        <option value="30">Past 30 Days</option>
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1: Total Hits */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-xs flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Request Volume</p>
                            <p className="text-3xl font-black text-slate-900">{metrics?.summary?.total_requests || 0}</p>
                            <p className="text-[11px] font-medium text-slate-400">Total hits recorded in timeframe</p>
                        </div>
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                            <Zap size={22} />
                        </div>
                    </div>

                    {/* Card 2: Unique IPs */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-xs flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Client IPs</p>
                            <p className="text-3xl font-black text-emerald-600">{metrics?.top_client_ips?.length || 0}</p>
                            <p className="text-[11px] font-medium text-slate-400">Distinct client connections</p>
                        </div>
                        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                            <Globe size={22} />
                        </div>
                    </div>

                    {/* Card 3: Throttling Window */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-xs flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">IP Rate Window</p>
                            <p className="text-3xl font-black text-slate-900">30s</p>
                            <p className="text-[11px] font-medium text-slate-400">Restricted to 1 request / 30 seconds</p>
                        </div>
                        <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                            <Clock size={22} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Requesting Client IPs List */}
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                        <h3 className="text-base font-black text-slate-900">Top Requesting IP Addresses</h3>
                        <p className="text-xs text-slate-400 font-medium">Clients generating the highest density of requests</p>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                        Top {metrics?.top_client_ips?.length || 0} IPs
                    </span>
                </div>

                {loading ? (
                    <div className="py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider animate-pulse">
                        Calculating IP density metrics...
                    </div>
                ) : metrics?.top_client_ips?.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                        No client traffic logged in this timeframe.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {metrics?.top_client_ips?.map((item, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-xs text-slate-700">
                                        #{idx + 1}
                                    </div>
                                    <div>
                                        <p className="text-xs font-mono font-bold text-slate-900">{item.ip}</p>
                                        <p className="text-[10px] font-medium text-slate-400">Registered Client IP</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-indigo-600">{item.count}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requests</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}