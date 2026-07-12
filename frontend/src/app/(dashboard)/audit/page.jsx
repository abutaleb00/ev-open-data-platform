'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import {
    ShieldAlert, Clock, User, Database,
    RefreshCw, Search, Activity, Globe,
    ChevronLeft, ChevronRight, SlidersHorizontal
} from 'lucide-react';

export default function AuditLogsPage() {
    const { user } = useAuthStore();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Pagination & Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [entityFilter, setEntityFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [metaData, setMetaData] = useState({
        total_records: 0,
        total_pages: 1,
        limit_per_page: 20
    });

    const fetchLogs = useCallback(async (pageTarget = currentPage) => {
        setLoading(true);
        try {
            const params = {
                page: pageTarget,
                limit: 20,
                ...(searchQuery.trim() && { search: searchQuery.trim() }),
                ...(actionFilter && { action: actionFilter }),
                ...(entityFilter && { entity: entityFilter })
            };

            const response = await api.get('/audit', { params });
            if (response.data.success) {
                setLogs(response.data.data);
                setMetaData(response.data.meta || {
                    total_records: response.data.data.length,
                    total_pages: 1,
                    limit_per_page: 20
                });
            }
        } catch (error) {
            console.error("Failed to fetch audit logs:", error);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, actionFilter, entityFilter, currentPage]);

    useEffect(() => {
        if (user) {
            fetchLogs(1);
            setCurrentPage(1);
        }
    }, [actionFilter, entityFilter, user]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchLogs(1);
        setCurrentPage(1);
    };

    const handlePageChange = (direction) => {
        let targetPage = currentPage;
        if (direction === 'next' && currentPage < metaData.total_pages) {
            targetPage = currentPage + 1;
        } else if (direction === 'prev' && currentPage > 1) {
            targetPage = currentPage - 1;
        }

        if (targetPage !== currentPage) {
            setCurrentPage(targetPage);
            fetchLogs(targetPage);
        }
    };

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    const ACTION_TYPES = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN'];
    const ENTITY_TYPES = ['USER', 'USER_STATUS', 'USER_SECURITY', 'COMPANY', 'COMPANY_STATUS', 'LOCATION', 'CHARGE_POINT', 'CONNECTOR', 'API_KEY', 'SYSTEM_CONFIG'];

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-0 pb-12 select-none">

            {/* Header Canvas */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-xs">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-purple-50 rounded-xl text-purple-600 border border-purple-100 shadow-2xs">
                        <ShieldAlert size={24} strokeWidth={2.2} />
                    </div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">System Audit Logs</h2>
                        <p className="text-xs sm:text-sm text-slate-400 mt-0.5 font-medium">Real-time immutable ledger tracking security states and telemetry modifications</p>
                    </div>
                </div>

                <button
                    onClick={() => fetchLogs(currentPage)}
                    disabled={loading}
                    className="flex items-center space-x-2 bg-slate-900 border border-slate-800 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-sm font-bold text-xs uppercase tracking-wider active:scale-98 disabled:opacity-50 cursor-pointer w-full md:w-auto justify-center"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    <span>Refresh Stream</span>
                </button>
            </div>

            {/* Advanced Structural Filter Control Deck */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs">
                <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
                    
                    {/* Search string layout input component */}
                    <div className="lg:col-span-5 space-y-1.5">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center"><Search size={12} className="mr-1" /> Fuzzy Query String</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search details, emails, names or IP addresses..."
                                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm text-slate-800 placeholder-slate-400 font-medium focus:outline-hidden focus:border-purple-500 focus:bg-white transition-all"
                            />
                            {searchQuery.trim() && (
                                <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-600 hover:text-purple-700 font-bold text-xs px-2 py-1 rounded-md bg-purple-50 border border-purple-100 cursor-pointer">
                                    Go
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Action Select Filter Box */}
                    <div className="lg:col-span-3 space-y-1.5">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center"><Activity size={12} className="mr-1" /> Action Trigger</label>
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 font-bold focus:outline-hidden focus:border-purple-500 focus:bg-white transition-all cursor-pointer"
                        >
                            <option value="">All Actions</option>
                            {ACTION_TYPES.map(act => <option key={act} value={act}>{act}</option>)}
                        </select>
                    </div>

                    {/* Entity Select Filter Box */}
                    <div className="lg:col-span-3 space-y-1.5">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center"><Database size={12} className="mr-1" /> Target Model</label>
                        <select
                            value={entityFilter}
                            onChange={(e) => setEntityFilter(e.target.value)}
                            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 font-bold focus:outline-hidden focus:border-purple-500 focus:bg-white transition-all cursor-pointer"
                        >
                            <option value="">All Model Entities</option>
                            {ENTITY_TYPES.map(ent => <option key={ent} value={ent}>{ent.replace('_', ' ')}</option>)}
                        </select>
                    </div>

                    {/* Reset Button */}
                    <div className="lg:col-span-1">
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery('');
                                setActionFilter('');
                                setEntityFilter('');
                                setCurrentPage(1);
                                setTimeout(() => fetchLogs(1), 50);
                            }}
                            className="w-full flex items-center justify-center bg-slate-100 hover:bg-slate-200/80 text-slate-600 p-2.5 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                            title="Reset filters"
                        >
                            <SlidersHorizontal size={18} />
                        </button>
                    </div>
                </form>
            </div>

            {/* Core Data Presentation Grid Layout */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200/80">
                        <thead className="bg-slate-50/70">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Event Time</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Actor Node / Context</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Operation</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Model Scope</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Network IP</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Description Payload</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center text-slate-400">
                                        <Activity size={28} className="animate-pulse mx-auto mb-3 text-purple-500" />
                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Querying platform cluster ledgers...</p>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center text-slate-500">
                                        <ShieldAlert size={36} className="mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
                                        <p className="text-base font-black text-slate-800">No log entries resolved</p>
                                        <p className="text-xs text-slate-400 mt-1">Adjust search parameters or operational selectors above.</p>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors group">
                                        
                                        {/* Timestamp Column */}
                                        <td className="px-6 py-4.5 whitespace-nowrap">
                                            <div className="flex items-center text-xs font-bold text-slate-600">
                                                <Clock size={13} className="mr-2 text-slate-400 group-hover:text-purple-500 transition-colors" />
                                                {formatTime(log.timestamp)}
                                            </div>
                                        </td>

                                        {/* User Identity Frame */}
                                        <td className="px-6 py-4.5 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-black text-xs mr-3 shrink-0 shadow-2xs">
                                                    {log.user?.name ? log.user.name.charAt(0).toUpperCase() : <User size={13} />}
                                                </div>
                                                <div className="flex flex-col max-w-[180px]">
                                                    <span className="text-xs font-black text-slate-800 truncate" title={log.user?.name || log.user?.email || 'System'}>
                                                        {log.user?.name || log.user?.email || 'Automated System'}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 mt-0.5 flex items-center truncate">
                                                        {log.user?.role || 'CRON'} 
                                                        {log.user?.company?.name && (
                                                            <span className="ml-1 text-indigo-500 bg-indigo-50/50 border border-indigo-100/60 px-1 rounded-sm text-[9px] font-medium max-w-[80px] truncate">
                                                                {log.user.company.name}
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Action Badges Mapping */}
                                        <td className="px-6 py-4.5 whitespace-nowrap">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border tracking-wider uppercase
                                                ${log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                  log.action === 'UPDATE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                  log.action === 'DELETE' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                  'bg-blue-50 text-blue-700 border-blue-200'}`}
                                            >
                                                {log.action}
                                            </span>
                                        </td>

                                        {/* System Config Target Scope Models */}
                                        <td className="px-6 py-4.5 whitespace-nowrap">
                                            <div className="flex items-center text-xs font-bold text-slate-700">
                                                <Database size={13} className="mr-1.5 text-slate-400" />
                                                <span>{log.entity.replace('_', ' ')}</span>
                                                <span className="text-slate-400 font-medium text-[10px] ml-1 bg-slate-100 border border-slate-200 px-1 rounded-sm">#{log.entityId}</span>
                                            </div>
                                        </td>

                                        {/* Dynamic Captured Client IP Column */}
                                        <td className="px-6 py-4.5 whitespace-nowrap">
                                            <div className="flex items-center text-xs font-mono font-bold text-slate-600 bg-slate-50 border border-slate-200/60 px-2 py-1 rounded-lg w-fit">
                                                <Globe size={12} className="mr-1.5 text-slate-400 shrink-0" />
                                                <span>{log.ipAddress || '0.0.0.0'}</span>
                                            </div>
                                        </td>

                                        {/* Dynamic Content Details Block */}
                                        <td className="px-6 py-4.5 min-w-[250px]">
                                            <p className="text-xs text-slate-500 font-medium leading-relaxed break-words">
                                                {log.details}
                                            </p>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls Deck Footer */}
                {metaData.total_pages > 1 && (
                    <div className="bg-slate-50/50 border-t border-slate-200/60 px-6 py-4 flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-400">
                            Showing page <span className="text-slate-700 font-black">{currentPage}</span> of <span className="text-slate-700 font-black">{metaData.total_pages}</span> ({metaData.total_records} logs logged)
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => handlePageChange('prev')}
                                disabled={currentPage === 1 || loading}
                                className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 transition-colors cursor-pointer"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => handlePageChange('next')}
                                disabled={currentPage === metaData.total_pages || loading}
                                className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 transition-colors cursor-pointer"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}