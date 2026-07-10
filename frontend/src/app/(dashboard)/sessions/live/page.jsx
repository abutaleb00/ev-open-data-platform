'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import {
    Activity, Zap, MapPin, Clock, BatteryCharging,
    RefreshCw, Layers, DollarSign
} from 'lucide-react';

export default function LiveSessionsPage() {
    const { user } = useAuthStore();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchLiveSessions = async () => {
        setLoading(true);
        try {
            const response = await api.get('/sessions/live');
            if (response.data.success) {
                setSessions(response.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch live sessions", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchLiveSessions();

        // Auto-refresh every 30 seconds to simulate live telemetry
        const interval = setInterval(() => {
            if (user) fetchLiveSessions();
        }, 30000);

        return () => clearInterval(interval);
    }, [user]);

    // Helper to calculate elapsed time
    const getDuration = (startTime) => {
        const start = new Date(startTime);
        const now = new Date();
        const diffMs = now - start;

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">

            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
                <div className="flex items-center space-x-4">
                    <div className="p-3.5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl text-blue-600 ring-1 ring-blue-200/50 shadow-inner relative">
                        <Activity size={24} strokeWidth={2.5} />
                        {/* Live pulsating dot */}
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500 border-2 border-white"></span>
                        </span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Active Charging Sessions</h2>
                        <p className="text-sm text-slate-500 mt-0.5 font-medium">Real-time telemetry and energy delivery tracking</p>
                    </div>
                </div>

                <button
                    onClick={fetchLiveSessions}
                    disabled={loading}
                    className="flex items-center justify-center space-x-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all shadow-sm font-bold active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    <span>Sync Telemetry</span>
                </button>
            </div>

            {/* Live Sessions Grid */}
            {loading && sessions.length === 0 ? (
                <div className="bg-white rounded-2xl p-16 text-center border border-slate-200/60">
                    <RefreshCw size={32} className="animate-spin mx-auto text-blue-500 mb-3" />
                    <p className="text-slate-500 font-medium text-sm">Pinging network hardware...</p>
                </div>
            ) : sessions.length === 0 ? (
                <div className="bg-white rounded-2xl p-16 text-center border border-slate-200/60 flex flex-col items-center">
                    <BatteryCharging size={48} className="text-slate-300 mb-4" strokeWidth={1.5} />
                    <h3 className="text-xl font-extrabold text-slate-900 mb-1">No EVs Charging</h3>
                    <p className="text-slate-500 font-medium text-sm max-w-md">
                        There are currently no active sessions on your network. When a driver plugs in and initiates a charge, it will appear here instantly.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {sessions.map((session) => (
                        <div key={session.id} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">

                            {/* Card Header */}
                            <div className="bg-slate-900 px-5 py-4 flex justify-between items-center">
                                <div className="flex items-center space-x-2 text-white">
                                    <Zap size={18} className="text-amber-400 fill-amber-400/20" />
                                    <span className="font-bold text-sm tracking-wide">SESSION #{session.id}</span>
                                </div>
                                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs font-bold flex items-center">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span> Delivering
                                </span>
                            </div>

                            {/* Card Body */}
                            <div className="p-5 flex-1 space-y-5">
                                {/* Location & Hardware */}
                                <div>
                                    <h4 className="text-lg font-extrabold text-slate-900 mb-1">
                                        {session.connector?.chargePoint?.location?.name || 'Unknown Location'}
                                    </h4>
                                    <div className="flex items-center text-sm font-medium text-slate-500 space-x-3">
                                        <span className="flex items-center">
                                            <Layers size={14} className="mr-1.5" />
                                            {session.connector?.chargePoint?.hardwareId}
                                        </span>
                                        <span className="text-slate-300">•</span>
                                        <span className="font-bold text-slate-700">{session.connector?.type.replace('_', ' ')}</span>
                                    </div>
                                </div>

                                {/* Live Metrics */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center">
                                            <Clock size={12} className="mr-1" /> Elapsed Time
                                        </div>
                                        <div className="text-lg font-extrabold text-slate-900">
                                            {getDuration(session.startTime)}
                                        </div>
                                    </div>
                                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-100/50">
                                        <div className="text-xs font-bold text-amber-600/70 uppercase tracking-wider mb-1 flex items-center">
                                            <Zap size={12} className="mr-1" /> Energy Drawn
                                        </div>
                                        <div className="text-lg font-extrabold text-amber-600">
                                            {session.kwhConsumed.toFixed(2)} <span className="text-sm">kWh</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tariff & Pricing */}
                                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center text-sm font-medium text-slate-500">
                                        <DollarSign size={16} className="mr-1 text-emerald-600" />
                                        {session.connector?.tariff ? (
                                            <span>
                                                <span className="font-bold text-slate-700">{session.connector.tariff.name}</span>
                                                <span className="ml-1 text-xs">({session.connector.tariff.pricePerKwh} {session.connector.tariff.currency}/kWh)</span>
                                            </span>
                                        ) : (
                                            <span className="italic">Free Vend (No Tariff)</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    ))}
                </div>
            )}

        </div>
    );
}