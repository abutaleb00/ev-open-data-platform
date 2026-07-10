'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import {
    ShieldAlert, Clock, User, Database,
    RefreshCw, Search, Activity
} from 'lucide-react';

export default function AuditLogsPage() {
    const { user } = useAuthStore();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await api.get('/audit');
            if (response.data.success) {
                setLogs(response.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch audit logs", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchLogs();
    }, [user]);

    // Format Date Helper
    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
                <div className="flex items-center space-x-4">
                    <div className="p-3.5 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl text-purple-600 ring-1 ring-purple-200/50 shadow-inner">
                        <ShieldAlert size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">System Audit Logs</h2>
                        <p className="text-sm text-slate-500 mt-0.5 font-medium">Tracking all critical data modifications and access events</p>
                    </div>
                </div>

                <button
                    onClick={fetchLogs}
                    disabled={loading}
                    className="flex items-center justify-center space-x-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all shadow-sm font-bold active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    <span>Refresh Logs</span>
                </button>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">User / Role</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Target Entity</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-16 text-center text-slate-400">
                                        <Activity size={32} className="animate-pulse mx-auto mb-3 text-purple-400" />
                                        <p className="text-sm font-medium">Querying security logs...</p>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-16 text-center text-slate-500">
                                        <ShieldAlert size={36} className="mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
                                        <p className="text-base font-bold text-slate-900">No audit logs found</p>
                                        <p className="text-sm mt-1">System events and modifications will appear here.</p>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">

                                        {/* Timestamp */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm font-semibold text-slate-700">
                                                <Clock size={14} className="mr-2 text-slate-400" />
                                                {formatTime(log.timestamp)}
                                            </div>
                                        </td>

                                        {/* User */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs mr-3">
                                                    {log.user?.name ? log.user.name.charAt(0).toUpperCase() : <User size={14} />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-900">{log.user?.name || log.user?.email || 'System'}</span>
                                                    <span className="text-xs font-medium text-slate-500 mt-0.5">{log.user?.role || 'AUTO'}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Action */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-md border 
                                                ${log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    log.action === 'UPDATE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                        log.action === 'DELETE' ? 'bg-red-50 text-red-700 border-red-200' :
                                                            'bg-blue-50 text-blue-700 border-blue-200'}`}
                                            >
                                                {log.action}
                                            </span>
                                        </td>

                                        {/* Entity */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm font-bold text-slate-700">
                                                <Database size={14} className="mr-1.5 text-slate-400" />
                                                {log.entity} <span className="text-slate-400 font-normal ml-1">(ID: {log.entityId})</span>
                                            </div>
                                        </td>

                                        {/* Details */}
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-600 font-medium">
                                                {log.details}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}