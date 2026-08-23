'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import {
    BarChart3, Globe, ShieldAlert, CheckCircle2,
    Clock, RefreshCw, Zap, Filter, Activity,
    ChevronLeft, ChevronRight, Eye, X, Terminal
} from 'lucide-react';

export default function TrafficAnalyticsPage() {
    const [metrics, setMetrics] = useState(null);
    const [telemetry, setTelemetry] = useState(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState('7');
    const [operatorRef, setOperatorRef] = useState('');

    // Pagination State for Recent Logs
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [selectedLog, setSelectedLog] = useState(null);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('days', days);
            if (operatorRef.trim()) params.append('operator_reference_id', operatorRef.trim());

            const [metricsRes, telemetryRes] = await Promise.allSettled([
                api.get(`/open-data/admin/traffic-metrics?${params.toString()}`),
                api.get('/open-data/admin/rate-limit-telemetry')
            ]);

            if (metricsRes.status === 'fulfilled' && metricsRes.value.data) {
                setMetrics(metricsRes.value.data);
            }
            if (telemetryRes.status === 'fulfilled' && telemetryRes.value.data?.success) {
                setTelemetry(telemetryRes.value.data.data);
            }
        } catch (err) {
            console.error('Failed to load traffic analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
        setCurrentPage(1);
    }, [days]);

    // IP Formatting Helper (normalizes loopback ::1 addresses to 127.0.0.1)
    const formatIp = (ip) => {
        if (!ip) return '127.0.0.1';
        if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1 (Localhost)';
        return ip;
    };

    const getStatusBadge = (code) => {
        const statusCode = Number(code);
        if (statusCode >= 200 && statusCode < 300) {
            return <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-mono text-[10px] font-black rounded-md border border-emerald-200">{statusCode} OK</span>;
        } else if (statusCode === 429) {
            return <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 font-mono text-[10px] font-black rounded-md border border-rose-200">429 THROTTLED</span>;
        } else if (statusCode >= 400 && statusCode < 500) {
            return <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 font-mono text-[10px] font-black rounded-md border border-amber-200">{statusCode} BAD REQ</span>;
        } else {
            return <span className="px-2.5 py-0.5 bg-slate-50 text-slate-700 font-mono text-[10px] font-black rounded-md border border-slate-200">{statusCode || 200}</span>;
        }
    };

    // Client-side pagination slicing
    const allLogs = metrics?.recent_logs || [];
    const totalLogs = allLogs.length;
    const totalPages = Math.ceil(totalLogs / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize;
    const currentLogs = allLogs.slice(startIndex, startIndex + pageSize);

    return (
        <div className="max-w-7xl mx-auto space-y-8 px-2 select-none pb-12">

            {/* Header Banner */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center space-x-4">
                    <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-2xs">
                        <BarChart3 size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">API Traffic Analytics</h2>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">Real-time open data stream usage, throttling metrics, and client telemetry</p>
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
                            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
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
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Live System Overview</span>
                    <select
                        value={days}
                        onChange={(e) => setDays(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs focus:outline-none cursor-pointer"
                    >
                        <option value="1">Past 24 Hours</option>
                        <option value="7">Past 7 Days</option>
                        <option value="30">Past 30 Days</option>
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Card 1: Total Hits */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Requests</p>
                            <p className="text-2xl font-black text-slate-900">{metrics?.summary?.total_requests || 0}</p>
                            <p className="text-[10px] font-bold text-slate-400">Timeframe volume</p>
                        </div>
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                            <Zap size={20} />
                        </div>
                    </div>

                    {/* Card 2: Active IPs */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Client IPs</p>
                            <p className="text-2xl font-black text-emerald-600">{metrics?.top_client_ips?.length || 0}</p>
                            <p className="text-[10px] font-bold text-slate-400">Distinct connection nodes</p>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                            <Globe size={20} />
                        </div>
                    </div>

                    {/* Card 3: Throttled Requests */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Rate Throttled</p>
                            <p className="text-2xl font-black text-rose-600">{metrics?.summary?.rate_limited_requests || 0}</p>
                            <p className="text-[10px] font-bold text-slate-400">429 limit enforcement hits</p>
                        </div>
                        <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
                            <ShieldAlert size={20} />
                        </div>
                    </div>

                    {/* Card 4: Rate Limit Window */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Limiter Config</p>
                            <p className="text-2xl font-black text-slate-900">{telemetry?.feedRateLimitMax || 100} <span className="text-xs text-slate-400 font-bold">req</span></p>
                            <p className="text-[10px] font-bold text-slate-400">Per {telemetry?.feedRateLimitWindow || 300}s window</p>
                        </div>
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                            <Clock size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Requesting Client IPs & Breakdown Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Top Requesting Client IPs List */}
                <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div>
                            <h3 className="text-base font-black text-slate-900">Top Requesting Client IPs</h3>
                            <p className="text-xs text-slate-400 font-bold">IP addresses generating high-density traffic</p>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {metrics?.top_client_ips?.map((item, idx) => (
                                <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-mono font-black text-xs text-slate-700">
                                            #{idx + 1}
                                        </div>
                                        <div>
                                            <p className="text-xs font-mono font-extrabold text-slate-900">{formatIp(item.ip)}</p>
                                            <p className="text-[10px] font-bold text-slate-400">Client Node</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-indigo-600">{item.count}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Requests</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Status Code Breakdown */}
                <div className="bg-slate-900 text-white rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">
                                Traffic Summary
                            </span>
                            <Activity size={16} className="text-indigo-400" />
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                                <span className="font-mono text-emerald-400 font-bold">200 / 201 Success</span>
                                <span className="font-extrabold text-slate-100">{metrics?.summary?.success_requests || 0}</span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
                                <span className="font-mono text-rose-400 font-bold">429 Throttled</span>
                                <span className="font-extrabold text-slate-100">{metrics?.summary?.rate_limited_requests || 0}</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-400 font-medium leading-relaxed">
                        Throttled requests respond with HTTP 429 and include `Retry-After` header specifications.
                    </div>
                </div>
            </div>

            {/* Live Request Telemetry Table with Pagination */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-base font-black text-slate-900">Recent Request Telemetry</h3>
                        <p className="text-xs text-slate-400 font-bold">Live stream of incoming client API calls</p>
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
                            Total {totalLogs} Logs
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/70">
                            <tr>
                                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-black uppercase text-slate-500 tracking-wider">Timestamp</th>
                                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-black uppercase text-slate-500 tracking-wider">Method & Endpoint</th>
                                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-black uppercase text-slate-500 tracking-wider">Client IP</th>
                                <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-black uppercase text-slate-500 tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3.5 text-right text-[11px] font-black uppercase text-slate-500 tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider animate-pulse">
                                        Loading stream logs...
                                    </td>
                                </tr>
                            ) : currentLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-bold text-xs">
                                        No recent logs captured.
                                    </td>
                                </tr>
                            ) : (
                                currentLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-3.5 whitespace-nowrap text-xs font-semibold text-slate-500 font-mono">
                                            {new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap">
                                            <div className="flex items-center space-x-2">
                                                <span className={`px-1.5 py-0.5 font-mono text-[9px] font-black rounded ${log.method === 'GET' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                                                    }`}>
                                                    {log.method}
                                                </span>
                                                <span className="font-mono text-xs font-bold text-slate-800 max-w-xs sm:max-w-md truncate" title={log.endpoint}>
                                                    {log.endpoint}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap font-mono text-xs text-slate-600 font-bold">
                                            {formatIp(log.ip)}
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap">
                                            {getStatusBadge(log.status_code ?? log.statusCode)}
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap text-right">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                                title="Inspect User Agent & Headers"
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
                            Showing <span className="text-slate-900 font-black">{startIndex + 1}</span> to <span className="text-slate-900 font-black">{Math.min(startIndex + pageSize, totalLogs)}</span> of <span className="text-slate-900 font-black">{totalLogs}</span> entries
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

            {/* Log Details Modal */}
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
                                    <p className="font-mono font-bold text-slate-800 mt-0.5">{formatIp(selectedLog.ip)}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-[9px] font-black uppercase text-slate-400">HTTP Method</span>
                                    <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedLog.method}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-[9px] font-black uppercase text-slate-400">Response Code</span>
                                    <div className="mt-0.5">{getStatusBadge(selectedLog.status_code ?? selectedLog.statusCode)}</div>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Endpoint Path</span>
                                <p className="font-mono font-bold text-indigo-900 break-all">{selectedLog.endpoint}</p>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Timestamp</span>
                                <p className="font-bold text-slate-800">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                            </div>

                            {selectedLog.user_agent && (
                                <div className="p-3 bg-slate-900 text-slate-200 rounded-xl space-y-1">
                                    <span className="text-[9px] font-mono font-bold uppercase text-indigo-400">User Agent</span>
                                    <p className="font-mono text-[10px] break-all leading-relaxed">{selectedLog.user_agent}</p>
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