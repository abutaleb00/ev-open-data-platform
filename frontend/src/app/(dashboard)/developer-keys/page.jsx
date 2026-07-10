'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import {
    Code, Plus, Key, Calendar, Building2, Trash2,
    Copy, Check, AlertCircle, RefreshCw, Layers, ShieldCheck
} from 'lucide-react';

export default function DeveloperKeysPage() {
    const [keys, setKeys] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form and Interactive Dialog State Controllers
    const [keyName, setKeyName] = useState('');
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [copiedKeyId, setCopiedKeyId] = useState(null);

    // Premium Toast Layout Notification Engine
    const [statusModal, setStatusModal] = useState({ show: false, type: 'success', message: '' });
    const [showCreateForm, setShowCreateForm] = useState(false);

    const loadKeysAndTenants = async () => {
        try {
            const [keysRes, companiesRes] = await Promise.all([
                api.get('/open-data/keys'),
                api.get('/companies')
            ]);
            if (keysRes.data.success) setKeys(keysRes.data.data);
            if (companiesRes.data.success) setCompanies(companiesRes.data.data);
        } catch (error) {
            console.error("Failed to read developer credentials pool:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadKeysAndTenants();
    }, []);

    const handleGenerateKey = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const response = await api.post('/open-data/keys', {
                name: keyName,
                companyId: selectedCompanyId
            });

            if (response.data.success) {
                setKeyName('');
                setShowCreateForm(false);
                loadKeysAndTenants();
                setStatusModal({
                    show: true,
                    type: 'success',
                    message: `API Credentials provisioned successfully! Secret string signature: ${response.data.data.key}`
                });
            }
        } catch (error) {
            setStatusModal({
                show: true,
                type: 'error',
                message: error.response?.data?.message || 'Failed to authenticate credential request.'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleRevokeKey = async (id) => {
        if (!confirm("Are you sure you want to instantly revoke and destroy this access key? Third party integrations using this sequence token will lose access immediately.")) return;
        try {
            // Bind fallback to delete hook if you build key tracking adjustments down the line
            await api.delete(`/open-data/keys/${id}`);
            loadKeysAndTenants();
            setStatusModal({
                show: true,
                type: 'success',
                message: 'The token variable was cleanly wiped from core authentication proxies.'
            });
        } catch (error) {
            setStatusModal({
                show: true,
                type: 'error',
                message: error.response?.data?.message || 'Failed to alter server parameters.'
            });
        }
    };

    const copyToClipboard = (token, id) => {
        navigator.clipboard.writeText(token);
        setCopiedKeyId(id);
        setTimeout(() => setCopiedKeyId(null), 2000);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
                <RefreshCw size={32} className="animate-spin text-[#FFAF00] mb-3" />
                <p className="text-sm font-semibold">Reading credential routing nodes...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto px-2 relative select-none">

            {/* Header Module Deck */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
                <div className="flex items-center space-x-4">
                    <div className="p-3.5 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl text-[#FFAF00] ring-1 ring-amber-200/50 shadow-inner">
                        <Code size={24} strokeWidth={2.5} className="text-slate-950" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Developer Tokens Matrix</h2>
                        <p className="text-sm text-slate-500 mt-0.5 font-medium">Issue public credentials and maintain strict throughput paths for OCPI pipelines</p>
                    </div>
                </div>

                <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="flex items-center justify-center space-x-2 bg-slate-950 text-white px-5 py-2.5 rounded-xl hover:bg-slate-900 transition-all shadow-md font-semibold text-xs uppercase tracking-wider active:scale-95"
                >
                    <Plus size={16} strokeWidth={2.5} />
                    <span>{showCreateForm ? 'Collapse Matrix' : 'Provision Key'}</span>
                </button>
            </div>

            {/* Dynamic Interactive Key Generation Form Component Panel */}
            {showCreateForm && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider flex items-center">
                        <Key size={14} className="mr-1.5 text-[#73CB44]" /> New Open-Data Access Pass
                    </h3>

                    <form onSubmit={handleGenerateKey} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-500 mb-1">Key Description Label</label>
                            <input
                                type="text" required
                                value={keyName}
                                onChange={(e) => setKeyName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm font-semibold transition-all shadow-2xs"
                                placeholder="e.g. ZapMap Production Node"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase text-slate-500 mb-1">Relational Client Tenant</label>
                            <select
                                required
                                value={selectedCompanyId}
                                onChange={(e) => setSelectedCompanyId(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm font-semibold transition-all shadow-2xs"
                            >
                                <option value="" disabled>Select target context...</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full flex items-center justify-center space-x-2 bg-[#73CB44] text-white font-black px-5 py-3 rounded-xl hover:bg-[#62b537] transition-all shadow-xs active:scale-98 text-xs uppercase tracking-wider"
                        >
                            <span>{submitting ? 'Signing Manifest...' : 'Generate Live Token Key'}</span>
                        </button>
                    </form>
                </div>
            )}

            {/* Credentials Layout Registry Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {keys.length === 0 ? (
                    <div className="col-span-full bg-white border border-slate-200 p-12 text-center rounded-3xl text-slate-400">
                        <ShieldCheck size={40} strokeWidth={1.5} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-bold text-slate-900">No active API endpoints mapped</p>
                        <p className="text-xs mt-1">Generate credentials above to authorize downstream client aggregators.</p>
                    </div>
                ) : (
                    keys.map((item) => (
                        <div key={item.id} className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-2xs space-y-4 relative overflow-hidden group">

                            <div className="flex justify-between items-start">
                                <div className="space-y-0.5">
                                    <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                                    <p className="text-xs text-slate-400 font-medium flex items-center">
                                        <Building2 size={12} className="mr-1 text-emerald-500" />
                                        Context: {item.company?.name || 'Global Shared Stream'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleRevokeKey(item.id)}
                                    className="text-slate-300 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    title="Revoke access immediately"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            {/* Masked Secret Key String Selector Interface */}
                            <div className="bg-slate-950 p-3 rounded-xl flex items-center justify-between border border-slate-800 shadow-inner">
                                <span className="font-mono text-xs font-bold text-emerald-400 tracking-wider overflow-hidden select-all pr-4">
                                    {copiedKeyId === item.id ? item.key : `${item.key.slice(0, 12)}••••••••••••••••••••••••`}
                                </span>
                                <button
                                    onClick={() => copyToClipboard(item.key, item.id)}
                                    className={`p-1.5 rounded-lg transition-all ${copiedKeyId === item.id ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
                                >
                                    {copiedKeyId === item.id ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                            </div>

                            <div className="flex items-center text-[10px] font-mono text-slate-400 space-x-4 pt-1">
                                <span className="flex items-center"><Calendar size={11} className="mr-1" /> Created: {new Date(item.createdAt).toLocaleDateString()}</span>
                                <span className="flex items-center text-emerald-600 font-bold"><Layers size={11} className="mr-1" /> Bound: OCPI Endpoints</span>
                            </div>

                        </div>
                    ))
                )}
            </div>

            {/* --- PREMIUM APP-WIDE TRANSACTION NOTIFIER --- */}
            {statusModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-3xs" onClick={() => setStatusModal({ ...statusModal, show: false })}></div>
                    <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center relative">
                            {statusModal.type === 'success' ? (
                                <>
                                    <div className="absolute inset-0 bg-emerald-50 rounded-full animate-pulse" />
                                    <ShieldCheck size={32} className="text-emerald-500 relative z-10" />
                                </>
                            ) : (
                                <>
                                    <div className="absolute inset-0 bg-rose-50 rounded-full animate-pulse" />
                                    <AlertCircle size={32} className="text-rose-600 relative z-10" />
                                </>
                            )}
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-base font-black text-slate-900 tracking-tight">
                                {statusModal.type === 'success' ? 'Credential Provisioned' : 'Validation Halt'}
                            </h4>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed px-2 select-text break-all">
                                {statusModal.message}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setStatusModal({ ...statusModal, show: false })}
                            className={`w-full py-2.5 text-xs font-bold rounded-xl text-white shadow-xs transition-colors ${statusModal.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                        >
                            Acknowledge Key Generation
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}