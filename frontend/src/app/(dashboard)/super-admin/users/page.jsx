'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import {
    Users, Search, RefreshCw, Mail,
    ShieldAlert, ShieldCheck, Shield, Building2, UserX, Loader2
} from 'lucide-react';

export default function SuperAdminUsersPage() {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [togglingId, setTogglingId] = useState(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/users');
            if (response.data.success) {
                setUsers(response.data.data);
                setFilteredUsers(response.data.data);
            }
        } catch (error) {
            console.error("Failed to sync platform users registry:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Handle Local Search Filtering Matrix
    useEffect(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) {
            setFilteredUsers(users);
            return;
        }

        const filtered = users.filter(u =>
            (u.name && u.name.toLowerCase().includes(query)) ||
            (u.email && u.email.toLowerCase().includes(query)) ||
            (u.role && u.role.toLowerCase().includes(query)) ||
            (u.company?.name && u.company.name.toLowerCase().includes(query))
        );
        setFilteredUsers(filtered);
    }, [searchQuery, users]);

    // Toggle Account Status Hook matching your atomic adminController
    const toggleUserStatus = async (id, currentStatus) => {
        setTogglingId(id);
        const targetStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        try {
            const response = await api.put(`/admin/users/${id}/status`, { status: targetStatus });
            if (response.data.success) {
                setUsers(prev => prev.map(u => u.id === id ? { ...u, status: targetStatus } : u));
            }
        } catch (error) {
            alert(error.response?.data?.message || "Failed to update target privilege state.");
        } finally {
            setTogglingId(null);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-2">

            {/* Header Matrix */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                        <Users size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Platform Users Control</h2>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">Manage operator profiles, account authorizations, and platform roles</p>
                    </div>
                </div>

                <div className="flex w-full sm:w-auto gap-3">
                    <div className="relative flex-1 sm:w-64">
                        <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search accounts or roles..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs font-semibold focus:outline-hidden transition-all focus:ring-2 focus:ring-slate-900/10 text-slate-800 placeholder-slate-400"
                        />
                    </div>
                    <button
                        onClick={fetchUsers}
                        className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Datatable Wrapper */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/70">
                            <tr>
                                <th className="px-6 py-4 text-left text-[11px] font-black uppercase text-slate-500 tracking-wider">User Profile</th>
                                <th className="px-6 py-4 text-left text-[11px] font-black uppercase text-slate-500 tracking-wider">Company / Node</th>
                                <th className="px-6 py-4 text-left text-[11px] font-black uppercase text-slate-500 tracking-wider">System Role</th>
                                <th className="px-6 py-4 text-left text-[11px] font-black uppercase text-slate-500 tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-[11px] font-black uppercase text-slate-500 tracking-wider">Administrative Execution</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-16 text-center text-xs font-bold text-slate-400">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <RefreshCw size={24} className="animate-spin text-indigo-600" />
                                            <span className="animate-pulse">Synchronising global access parameters...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-16 text-center text-slate-400 space-y-2">
                                        <UserX className="mx-auto text-slate-300" size={32} />
                                        <p className="text-xs font-bold text-slate-700">No matching user accounts identified</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">

                                        {/* User Block */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center space-x-3">
                                                <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                                    {u.name ? u.name.charAt(0) : u.email.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-extrabold text-slate-900">{u.name || 'Incomplete Profile'}</p>
                                                    <p className="text-xs font-medium text-slate-400 flex items-center mt-0.5">
                                                        <Mail size={11} className="mr-1 shrink-0" /> {u.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Company Relationship Option */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-xs font-bold text-slate-700">
                                                <Building2 size={13} className="text-slate-400 mr-1.5 shrink-0" />
                                                {u.company?.name || <span className="text-slate-400 font-normal italic">Standalone Account</span>}
                                            </div>
                                        </td>

                                        {/* System Role Badge */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-xs font-bold text-slate-800">
                                                <Shield size={13} className="text-indigo-400 mr-1.5 shrink-0" />
                                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200/60 font-mono text-[10px]">
                                                    {u.role}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Status Context Badge */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${u.status === 'SUSPENDED' || u.status === 'DISABLED'
                                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                }`}>
                                                {u.status || 'ACTIVE'}
                                            </span>
                                        </td>

                                        {/* Action Gateway Row */}
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button
                                                disabled={togglingId === u.id || u.role === 'SUPER_ADMIN'}
                                                onClick={() => toggleUserStatus(u.id, u.status || 'ACTIVE')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 disabled:opacity-50 min-w-[130px] inline-flex items-center justify-center ${u.status === 'SUSPENDED' || u.status === 'DISABLED'
                                                        ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 cursor-pointer'
                                                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 cursor-pointer'
                                                    } ${u.role === 'SUPER_ADMIN' ? 'cursor-not-allowed opacity-40 hover:bg-transparent text-slate-400 border-slate-200' : ''}`}
                                            >
                                                {togglingId === u.id ? (
                                                    <span className="flex items-center space-x-1">
                                                        <Loader2 size={12} className="animate-spin" />
                                                        <span>Syncing...</span>
                                                    </span>
                                                ) : u.role === 'SUPER_ADMIN' ? (
                                                    "Root Restricted"
                                                ) : u.status === 'SUSPENDED' || u.status === 'DISABLED' ? (
                                                    <span className="flex items-center space-x-1">
                                                        <ShieldCheck size={12} className="shrink-0" />
                                                        <span>Unsuspend User</span>
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center space-x-1">
                                                        <ShieldAlert size={12} className="shrink-0" />
                                                        <span>Revoke Access</span>
                                                    </span>
                                                )}
                                            </button>
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