'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import {
    Activity, Filter, RefreshCw, Search, ShieldAlert,
    CheckCircle2, XCircle, Clock, Globe, ArrowUpDown
} from 'lucide-react';

export default function RequestLogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [operatorFilter, setOperatorFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [timeframe, setTimeframe] = useState('7');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('days', timeframe);
            if (operatorFilter) params.append('operator_reference_id', operatorFilter);

            const res = await api.get(`/open-data/admin/traffic-metrics?${params.toString()}`);
            if (res.data?.recent_logs) {
                setLogs(res.data.recent_logs);
            }
        } catch (err) {
            console.error('Failed to fetch request logs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [timeframe, operatorFilter]);

    // Client-side quick filter for search input & status code dropdown
    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.ipAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.endpoint?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.operatorReferenceId?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            statusFilter === 'ALL' ? true :
                statusFilter === 'SUCCESS' ? log.statusCode >= 200 && log.statusCode < 300 :
                    statusFilter === 'RATE_LIMITED' ? log.statusCode === 429 :
                        log.statusCode >= 400;

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="max-w-7xl mx-auto space-y-8 px-2 select-none">
            {/* Header Banner */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center space-x-4">
                    <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">API Request Audit Log</h2>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">Real-time IP traffic inspection and security access tracking</p>
                    </div>
                </div>

                <button
                    onClick={fetchLogs} disabled={loading}
                    className="flex cursor-pointer items-center justify-center space-x-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 font-black text-xs uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    <span>Refresh Stream</span>
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Search Input */}
                <div className="relative flex items-center">
                    <Search size={14} className="absolute left-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search IP, endpoint, or Ref ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-slate-800 placeholder:text-slate-400"
                    />
                </div>

                {/* Operator Ref Filter */}
                <div className="relative flex items-center">
                    <Filter size={14} className="absolute left-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Operator Ref ID..."
                        value={operatorFilter}
                        onChange={(e) => setOperatorFilter(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-slate-800 placeholder:text-slate-400"
                    />
                </div>

                {/* Status Dropdown */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                >
                    <option value="ALL">All Response Statuses</option>
                    <option value="SUCCESS">2xx Success Only</option>
                    <option value="RATE_LIMITED">429 Rate Limited</option>
                    <option value="ERROR">4xx / 5xx Errors</option>
                </select>

                {/* Timeframe Dropdown */}
                <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                >
                    <option value="1">Last 24 Hours</option>
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                </select>
            </div>

            {/* Audit Log Table */}
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xs overflow-hidden">
                {loading ? (
                    <div className="p-16 text-center text-slate-400 font-bold text-xs uppercase tracking-wider animate-pulse flex flex-col items-center justify-center space-y-3">
                        <RefreshCw size={20} className="animate-spin text-indigo-600" />
                        <span>Compiling incoming traffic audit records...</span>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 font-bold text-xs uppercase tracking-wider flex flex-col items-center justify-center space-y-2">
                        <ShieldAlert size={24} className="text-slate-300" />
                        <span>No request audit records match your filters.</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                    <th className="p-4 pl-6">Timestamp</th>
                                    <th className="p-4">IP Address</th>
                                    <th className="p-4">Method & Endpoint</th>
                                    <th className="p-4">Operator Ref ID</th>
                                    <th className="p-4 pr-6 text-right">HTTP Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="p-4 pl-6 font-mono text-[11px] text-slate-500 flex items-center space-x-2">
                                            <Clock size={12} className="text-slate-400 shrink-0" />
                                            <span>{new Date(log.createdAt).toLocaleString()}</span>
                                        </td>
                                        <td className="p-4 font-mono font-bold text-slate-900">
                                            <span className="inline-flex items-center space-x-1.5 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px]">
                                                <Globe size={11} className="text-slate-400" />
                                                <span>{log.ipAddress}</span>
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono text-slate-800">
                                            <span className="font-bold text-indigo-600 mr-2">{log.method}</span>
                                            <span className="text-slate-600">{log.endpoint}</span>
                                        </td>
                                        <td className="p-4 font-mono text-xs">
                                            {log.operatorReferenceId ? (
                                                <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-bold text-[10px]">
                                                    {log.operatorReferenceId}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 italic">Global Request</span>
                                            )}
                                        </td>
                                        <td className="p-4 pr-6 text-right">
                                            <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${log.statusCode < 300 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' :
                                                    log.statusCode === 429 ? 'bg-amber-50 text-amber-700 border border-amber-200/60' :
                                                        'bg-rose-50 text-rose-700 border border-rose-200/60'
                                                }`}>
                                                {log.statusCode < 300 ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                                                <span>{log.statusCode}</span>
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}