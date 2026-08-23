'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import {
    Activity, Filter, RefreshCw, Search, ShieldAlert,
    CheckCircle2, XCircle, Clock, Globe, Eye,
    ChevronLeft, ChevronRight, X, Terminal, Server
} from 'lucide-react';

export default function RequestLogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [operatorFilter, setOperatorFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [timeframe, setTimeframe] = useState('7');

    // Modal & Pagination States
    const [selectedLog, setSelectedLog] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('days', timeframe);
            if (operatorFilter.trim()) params.append('operator_reference_id', operatorFilter.trim());

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
        setCurrentPage(1);
    }, [timeframe, operatorFilter]);

    // IP Formatting Helper (normalizes loopback ::1 addresses)
    const formatIp = (ip) => {
        if (!ip) return '127.0.0.1';
        if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1 (Localhost)';
        return ip;
    };

    // Client-side quick filter for search input & status code dropdown
    const filteredLogs = logs.filter(log => {
        const ipStr = log.ipAddress || log.ip || '';
        const endpointStr = log.endpoint || '';
        const opRefStr = log.operatorReferenceId || '';

        const matchesSearch =
            ipStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
            endpointStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
            opRefStr.toLowerCase().includes(searchTerm.toLowerCase());

        const code = Number(log.statusCode ?? log.status_code ?? 200);

        const matchesStatus =
            statusFilter === 'ALL' ? true :
                statusFilter === 'SUCCESS' ? code >= 200 && code < 300 :
                    statusFilter === 'RATE_LIMITED' ? code === 429 :
                        code >= 400;

        return matchesSearch && matchesStatus;
    });

    // Pagination slicing
    const totalLogs = filteredLogs.length;
    const totalPages = Math.ceil(totalLogs / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize;
    const currentLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

    const getStatusBadge = (code) => {
        const statusCode = Number(code);
        if (statusCode >= 200 && statusCode < 300) {
            return (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={11} />
                    <span>{statusCode} OK</span>
                </span>
            );
        } else if (statusCode === 429) {
            return (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                    <ShieldAlert size={11} />
                    <span>429 Throttled</span>
                </span>
            );
        } else {
            return (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                    <XCircle size={11} />
                    <span>{statusCode || 400}</span>
                </span>
            );
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 px-2 select-none pb-12">

            {/* Header Banner */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center space-x-4">
                    <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-2xs">
                        <Activity size={24} strokeWidth={2.5} />
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
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Search Input */}
                <div className="relative flex items-center">
                    <Search size={14} className="absolute left-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search IP, endpoint, or Ref ID..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 placeholder:text-slate-400"
                    />
                </div>

                {/* Operator Ref Filter */}
                <div className="relative flex items-center">
                    <Filter size={14} className="absolute left-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Operator Ref ID..."
                        value={operatorFilter}
                        onChange={(e) => { setOperatorFilter(e.target.value); setCurrentPage(1); }}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 placeholder:text-slate-400"
                    />
                </div>

                {/* Status Dropdown */}
                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none cursor-pointer"
                >
                    <option value="1">Last 24 Hours</option>
                    <option value="7">Last 7 Days</option>
                    <option value="30">Last 30 Days</option>
                </select>
            </div>

            {/* Audit Log Table Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-base font-black text-slate-900">Traffic Inspection Feed</h3>
                        <p className="text-xs text-slate-400 font-bold">Recorded HTTP requests passing rate-limiting gates</p>
                    </div>

                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-500">
                            <span>Rows per page:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                            </select>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">
                            Total {totalLogs} Filtered
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            <tr>
                                <th className="p-4 pl-6">Timestamp</th>
                                <th className="p-4">Client IP</th>
                                <th className="p-4">Method & Endpoint</th>
                                <th className="p-4">Operator Ref ID</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 pr-6 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-16 text-center text-slate-400 font-bold text-xs uppercase tracking-wider animate-pulse">
                                        <RefreshCw size={20} className="animate-spin text-indigo-600 mx-auto mb-2" />
                                        <span>Compiling incoming traffic audit records...</span>
                                    </td>
                                </tr>
                            ) : currentLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-16 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                                        <ShieldAlert size={24} className="text-slate-300 mx-auto mb-2" />
                                        <span>No request audit records match your filters.</span>
                                    </td>
                                </tr>
                            ) : (
                                currentLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="p-4 pl-6 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                            <div className="flex items-center space-x-1.5">
                                                <Clock size={12} className="text-slate-400 shrink-0" />
                                                <span>{new Date(log.createdAt || log.timestamp).toLocaleString()}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 font-mono font-extrabold text-slate-900 whitespace-nowrap">
                                            <span className="inline-flex items-center space-x-1.5 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px]">
                                                <Globe size={11} className="text-slate-400" />
                                                <span>{formatIp(log.ipAddress || log.ip)}</span>
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono text-slate-800 whitespace-nowrap">
                                            <span className={`px-1.5 py-0.5 font-mono text-[9px] font-black rounded mr-2 ${log.method === 'GET' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                                                }`}>
                                                {log.method}
                                            </span>
                                            <span className="text-slate-700 font-bold max-w-xs truncate inline-block align-middle" title={log.endpoint}>
                                                {log.endpoint}
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono text-xs whitespace-nowrap">
                                            {log.operatorReferenceId ? (
                                                <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-bold text-[10px]">
                                                    {log.operatorReferenceId}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 italic font-normal text-[11px]">Global Request</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center whitespace-nowrap">
                                            {getStatusBadge(log.statusCode ?? log.status_code)}
                                        </td>
                                        <td className="p-4 pr-6 text-right whitespace-nowrap">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                                title="Inspect Headers & User Agent"
                                            >
                                                <Eye size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls Footer */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">
                            Showing <span className="text-slate-900 font-black">{startIndex + 1}</span> to <span className="text-slate-900 font-black">{Math.min(startIndex + pageSize, totalLogs)}</span> of <span className="text-slate-900 font-black">{totalLogs}</span> records
                        </span>

                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <span className="text-xs font-black text-slate-700 px-2">
                                Page {currentPage} of {totalPages}
                            </span>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Inspection Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity" onClick={() => setSelectedLog(null)}></div>
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 z-50">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center">
                                <Terminal size={14} className="mr-2 text-indigo-600" /> Log Telemetry Inspection
                            </h3>
                            <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-[9px] font-black uppercase text-slate-400">Log ID</span>
                                    <p className="font-mono font-bold text-slate-800 mt-0.5">#{selectedLog.id}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-[9px] font-black uppercase text-slate-400">Client IP</span>
                                    <p className="font-mono font-bold text-slate-800 mt-0.5">{formatIp(selectedLog.ipAddress || selectedLog.ip)}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-[9px] font-black uppercase text-slate-400">HTTP Method</span>
                                    <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedLog.method}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-[9px] font-black uppercase text-slate-400">Response Code</span>
                                    <div className="mt-0.5">{getStatusBadge(selectedLog.statusCode ?? selectedLog.status_code)}</div>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Endpoint Path</span>
                                <p className="font-mono font-bold text-indigo-900 break-all">{selectedLog.endpoint}</p>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Timestamp</span>
                                <p className="font-bold text-slate-800">{new Date(selectedLog.createdAt || selectedLog.timestamp).toLocaleString()}</p>
                            </div>

                            {(selectedLog.userAgent || selectedLog.user_agent) && (
                                <div className="p-3 bg-slate-900 text-slate-200 rounded-xl space-y-1">
                                    <span className="text-[9px] font-mono font-bold uppercase text-indigo-400">User Agent Header</span>
                                    <p className="font-mono text-[10px] break-all leading-relaxed">{selectedLog.userAgent || selectedLog.user_agent}</p>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-right">
                            <button onClick={() => setSelectedLog(null)} className="px-5 py-1.5 bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-slate-800 cursor-pointer">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}