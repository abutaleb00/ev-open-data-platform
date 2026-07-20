'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import {
    Key, Eye, EyeOff, Copy, CheckCircle2, Plus, RefreshCw,
    Globe, ShieldAlert, Building2, Loader2, ClipboardCheck
} from 'lucide-react';

export default function ApiKeysPage() {
    const { user } = useAuthStore();
    const [keys, setKeys] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [keyName, setKeyName] = useState('');
    const [targetCompanyId, setTargetCompanyId] = useState('');
    const [revealedKeys, setRevealedKeys] = useState({});
    const [copiedKeyId, setCopiedKeyId] = useState(null);
    const [statusFeedback, setStatusFeedback] = useState({ show: false, type: 'success', message: '' });

    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    const fetchKeys = useCallback(async () => {
        try {
            const response = await api.get('/open-data/keys');
            // Check if response.data.data exists and is an array (Standard envelope format)
            if (response.data && response.data.success && Array.isArray(response.data.data)) {
                setKeys(response.data.data);
            }
            // Fallback if your backend sends the array directly via response.data
            else if (Array.isArray(response.data)) {
                setKeys(response.data);
            }
        } catch (err) {
            console.error("Failed fetching API key matrices", err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch drop-down company pool context ONLY if user is a Super Admin
    const fetchCompanies = useCallback(async () => {
        if (!isSuperAdmin) return;
        try {
            const response = await api.get('/companies');
            if (response.data.success) setCompanies(response.data.data);
        } catch (err) {
            console.error("Failed fetching partner directories", err);
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        if (user) {
            fetchKeys();
            fetchCompanies();
        }
    }, [user, fetchKeys, fetchCompanies]);

    const handleCreateKey = async (e) => {
        e.preventDefault();
        if (!keyName.trim()) return;

        if (isSuperAdmin && !targetCompanyId) {
            setStatusFeedback({ show: true, type: 'error', message: 'Please select a valid partner company assignment context.' });
            return;
        }

        setSubmitting(true);
        try {
            const response = await api.post('/open-data/keys', {
                name: keyName.trim(),
                // Send the selected ID for Super Admins, otherwise let backend drop back to auth injection token parameters
                companyId: isSuperAdmin ? targetCompanyId : undefined
            });

            if (response.data.success) {
                setKeyName('');
                setTargetCompanyId('');
                setStatusFeedback({ show: true, type: 'success', message: 'New deployment API credential token provisioned successfully.' });
                fetchKeys();
            }
        } catch (err) {
            setStatusFeedback({
                show: true,
                type: 'error',
                message: err.response?.data?.message || "Rejection error provisioning API key token structure."
            });
        } finally {
            setSubmitting(false);
        }
    };

    const toggleKeyVisibility = (id) => {
        setRevealedKeys(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const copyToClipboard = (id, val) => {
        navigator.clipboard.writeText(val);
        setCopiedKeyId(id);
        setTimeout(() => setCopiedKeyId(null), 2000);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400 font-bold text-xs uppercase tracking-wider">
                <Loader2 className="animate-spin text-indigo-600 mb-3" size={28} />
                <span>Syncing Secure Credentials Pool...</span>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 select-none">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-3xl text-white flex justify-between items-center shadow-md border border-slate-700">
                <div className="flex items-center space-x-4">
                    <div className="p-3.5 bg-white/10 rounded-xl text-indigo-400 border border-white/15">
                        <Globe size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight">Developer API Gateway</h2>
                        <p className="text-xs text-slate-300 font-medium mt-1">
                            {isSuperAdmin
                                ? "Master Workspace: Provision and manage roaming data endpoints across all tenants."
                                : "Expose network roaming endpoints and open data feeds to third-party services."}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* Generation Block Form Layout */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center border-b pb-2">
                        <Plus size={16} className="mr-1 text-indigo-600" /> Provision Access Token
                    </h3>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                        Generate live programmatic authentication keys to feed open data mapping structures.
                    </p>

                    <form onSubmit={handleCreateKey} className="space-y-4 pt-2">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Key Label Descriptor</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. ZapMap Production Ingest Feed"
                                value={keyName}
                                onChange={(e) => setKeyName(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs font-semibold outline-hidden transition-all"
                            />
                        </div>

                        {/* DYNAMIC SUPER ADMIN TENANT ASSIGNMENT DROPDOWN */}
                        {isSuperAdmin && (
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Target Account Assignment</label>
                                <select
                                    required
                                    value={targetCompanyId}
                                    onChange={(e) => setTargetCompanyId(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white outline-hidden transition-all cursor-pointer"
                                >
                                    <option value="">Select network operator context...</option>
                                    {companies.map(company => (
                                        <option key={company.id} value={company.id}>{company.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs py-2.5 rounded-xl uppercase tracking-wider transition-all disabled:opacity-50 active:scale-98 cursor-pointer shadow-xs"
                        >
                            {submitting ? 'Generating Secret...' : 'Generate Live Token'}
                        </button>
                    </form>
                </div>

                {/* Listing Matrix Data Table Panel */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Active Credentials Pools</h4>
                        <button onClick={fetchKeys} className="text-slate-400 hover:text-slate-900 transition-colors cursor-pointer">
                            <RefreshCw size={14} />
                        </button>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {keys.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 space-y-2">
                                <Key size={28} className="mx-auto text-slate-300" />
                                <p className="text-xs font-bold text-slate-700">No active keys registered</p>
                                <p className="text-[11px] max-w-xs mx-auto font-medium">Issue an access key block to map connections.</p>
                            </div>
                        ) : (
                            keys.map((k) => (
                                <div key={k.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                                    <div className="space-y-1.5 flex-1">
                                        <div className="flex items-center space-x-2">
                                            <p className="text-xs font-black text-slate-900">{k.name}</p>
                                            {isSuperAdmin && k.company?.name && (
                                                <span className="inline-flex items-center text-[9px] font-black uppercase bg-slate-100 border text-slate-500 rounded px-1.5 py-0.5">
                                                    <Building2 size={9} className="mr-1 text-indigo-500" /> {k.company.name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-2 font-mono text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200/60 w-fit">
                                            <span>{revealedKeys[k.id] ? k.key : 'ev_live_••••••••••••••••••••••••••••••••'}</span>
                                        </div>
                                    </div>

                                    {/* Actions Switch Row */}
                                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                                        <button
                                            type="button"
                                            onClick={() => toggleKeyVisibility(k.id)}
                                            className="p-2 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                                            title={revealedKeys[k.id] ? "Mask token sequence" : "Reveal cleartext secret"}
                                        >
                                            {revealedKeys[k.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(k.id, k.key)}
                                            className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all flex items-center space-x-1 min-w-[75px] justify-center text-xs font-black uppercase tracking-wider cursor-pointer shadow-xs active:scale-95"
                                        >
                                            {copiedKeyId === k.id ? (
                                                <> <ClipboardCheck size={12} className="text-emerald-400" /> <span>Copied</span> </>
                                            ) : (
                                                <> <Copy size={12} /> <span>Copy</span> </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* STATUS NOTIFICATION REGISTRY DRAWER POPUP */}
            {statusFeedback.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-3xs" onClick={() => setStatusFeedback({ ...statusFeedback, show: false })}></div>
                    <div className="relative bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 text-center space-y-4 z-50 animate-in zoom-in-95 duration-150">
                        <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center">
                            {statusFeedback.type === 'success' ? (
                                <CheckCircle2 size={28} className="text-emerald-500" />
                            ) : (
                                <ShieldAlert size={28} className="text-rose-600" />
                            )}
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Notification Registry</h4>
                            <p className="text-xs text-slate-500 font-bold px-2 leading-relaxed">{statusFeedback.message}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setStatusFeedback({ ...statusFeedback, show: false })}
                            className={`w-full py-2.5 text-xs font-black uppercase tracking-wider rounded-xl text-white ${statusFeedback.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                        >
                            Dismiss Notifier
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}