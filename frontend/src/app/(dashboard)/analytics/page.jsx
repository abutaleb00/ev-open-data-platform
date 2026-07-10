'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import {
    Activity, Zap, MapPin, Building2,
    CheckCircle2, AlertTriangle, XCircle, Clock
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
                console.error("Failed to fetch analytics", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchAnalytics();
    }, [user]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
                <Activity size={32} className="animate-pulse mb-4 text-indigo-500" />
                <p className="font-medium">Aggregating network analytics...</p>
            </div>
        );
    }

    // Helper to calculate percentages safely
    const getPercent = (value, total) => {
        if (!total || total === 0) return 0;
        return Math.round((value / total) * 100);
    };

    const cpTotal = stats?.metrics?.chargePoints || 0;
    const health = stats?.health || {};

    return (
        <div className="space-y-8 max-w-7xl mx-auto">

            {/* Header */}
            <div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Network Intelligence</h2>
                <p className="text-slate-500 mt-1 font-medium">Real-time overview of your infrastructure health and compliance status.</p>
            </div>

            {/* Top Level Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {user?.role === 'SUPER_ADMIN' && (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center space-x-4">
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Building2 size={28} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Operators</p>
                            <h4 className="text-3xl font-extrabold text-slate-900">{stats?.metrics?.companies || 0}</h4>
                        </div>
                    </div>
                )}

                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center space-x-4">
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
                        <MapPin size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Host Locations</p>
                        <h4 className="text-3xl font-extrabold text-slate-900">{stats?.metrics?.locations || 0}</h4>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center space-x-4">
                    <div className="p-4 bg-amber-50 text-amber-600 rounded-xl">
                        <Zap size={28} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Hardware Terminals</p>
                        <h4 className="text-3xl font-extrabold text-slate-900">{cpTotal}</h4>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Network Health Distribution */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                    <h3 className="text-lg font-extrabold text-slate-900 mb-6 flex items-center">
                        <Activity size={20} className="mr-2 text-blue-500" /> Operational Health
                    </h3>

                    <div className="space-y-5">
                        {/* Operational Bar */}
                        <div>
                            <div className="flex justify-between text-sm font-bold mb-1.5">
                                <span className="flex items-center text-emerald-700"><CheckCircle2 size={16} className="mr-1.5" /> Operational</span>
                                <span className="text-slate-600">{health.OPERATIONAL || 0} ({getPercent(health.OPERATIONAL, cpTotal)}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/60">
                                <div className="bg-emerald-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${getPercent(health.OPERATIONAL, cpTotal)}%` }}></div>
                            </div>
                        </div>

                        {/* Planned Bar */}
                        <div>
                            <div className="flex justify-between text-sm font-bold mb-1.5">
                                <span className="flex items-center text-blue-700"><Clock size={16} className="mr-1.5" /> Planned / Build</span>
                                <span className="text-slate-600">{health.PLANNED || 0} ({getPercent(health.PLANNED, cpTotal)}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/60">
                                <div className="bg-blue-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${getPercent(health.PLANNED, cpTotal)}%` }}></div>
                            </div>
                        </div>

                        {/* Out of Service Bar */}
                        <div>
                            <div className="flex justify-between text-sm font-bold mb-1.5">
                                <span className="flex items-center text-amber-700"><AlertTriangle size={16} className="mr-1.5" /> Out of Service</span>
                                <span className="text-slate-600">{health.OUT_OF_SERVICE || 0} ({getPercent(health.OUT_OF_SERVICE, cpTotal)}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/60">
                                <div className="bg-amber-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${getPercent(health.OUT_OF_SERVICE, cpTotal)}%` }}></div>
                            </div>
                        </div>

                        {/* Faulted Bar */}
                        <div>
                            <div className="flex justify-between text-sm font-bold mb-1.5">
                                <span className="flex items-center text-red-700"><XCircle size={16} className="mr-1.5" /> Faulted</span>
                                <span className="text-slate-600">{health.FAULTED || 0} ({getPercent(health.FAULTED, cpTotal)}%)</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/60">
                                <div className="bg-red-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${getPercent(health.FAULTED, cpTotal)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Open Data Compliance Status */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="text-lg font-extrabold text-slate-900 mb-6 flex items-center">
                            <CheckCircle2 size={20} className="mr-2 text-teal-500" /> Open Data Compliance
                        </h3>
                        <p className="text-sm text-slate-500 font-medium mb-8">
                            Track the ratio of physical assets that have been successfully verified and broadcasted to the public registry.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-center">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Locations Approved</p>
                            <div className="flex items-end justify-center space-x-1">
                                <span className="text-3xl font-extrabold text-slate-900">{stats?.approvals?.locations?.approved || 0}</span>
                                <span className="text-sm font-bold text-slate-400 mb-1">/ {stats?.approvals?.locations?.total || 0}</span>
                            </div>
                            <div className="mt-3 w-full bg-slate-200 rounded-full h-1.5">
                                <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${getPercent(stats?.approvals?.locations?.approved, stats?.approvals?.locations?.total)}%` }}></div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-center">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Hardware Approved</p>
                            <div className="flex items-end justify-center space-x-1">
                                <span className="text-3xl font-extrabold text-slate-900">{stats?.approvals?.chargePoints?.approved || 0}</span>
                                <span className="text-sm font-bold text-slate-400 mb-1">/ {stats?.approvals?.chargePoints?.total || 0}</span>
                            </div>
                            <div className="mt-3 w-full bg-slate-200 rounded-full h-1.5">
                                <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${getPercent(stats?.approvals?.chargePoints?.approved, stats?.approvals?.chargePoints?.total)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}