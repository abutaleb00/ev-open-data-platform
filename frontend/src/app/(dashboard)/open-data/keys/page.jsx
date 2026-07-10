'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { Key, Eye, EyeOff, Copy, Check, Plus, RefreshCw, Globe, ShieldAlert } from 'lucide-react';

export default function ApiKeysPage() {
    const { user } = useAuthStore();
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [keyName, setKeyName] = useState('');
    const [revealedKeys, setRevealedKeys] = useState({});
    const [copiedKeyId, setCopiedKeyId] = useState(null);

    const fetchKeys = useCallback(async () => {
        try {
            const response = await api.get('/open-data/keys');
            if (response.data.success) setKeys(response.data.data);
        } catch (err) {
            console.error("Failed fetching API key matrices", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) fetchKeys();
    }, [user, fetchKeys]);

    const handleCreateKey = async (e) => {
        e.preventDefault();
        if (!keyName) return;
        try {
            const response = await api.post('/open-data/keys', { name: keyName });
            if (response.data.success) {
                setKeyName('');
                fetchKeys();
            }
        } catch (err) {
            alert("Error creating API key token.");
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

    return (
        <div className="max-w-5xl mx-auto space-y-8">

            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-3xl text-white flex justify-between items-center shadow-lg border border-slate-700">
                <div className="flex items-center space-x-4">
                    <div className="p-3.5 bg-white/10 rounded-xl text-indigo-400 border border-white/15"><Globe size={24} /></div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight">Developer API Gateway</h2>
                        <p className="text-xs text-slate-300 font-medium mt-1">Expose roaming endpoints and open data feeds to third-party maps</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* Generation Block */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider flex items-center">
                        <Plus size={16} className="mr-1 text-indigo-600" /> Provision Access Token
                    </h3>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">Generate single-use client authorization keys to feed data services.</p>

                    <form onSubmit={handleCreateKey} className="space-y-3 pt-2">
                        <input
                            type="text"
                            required
                            placeholder="e.g. ZapMap Sync Service"
                            value={keyName}
                            onChange={(e) => setKeyName(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm font-semibold outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                        />
                        <button type="submit" className="w-full bg-slate-900 text-white font-bold text-sm py-3 rounded-xl hover:bg-slate-800 transition-all active:scale-98">
                            Generate Live Token
                        </button>
                    </form>
                </div>

                {/* Listing Matrix Data Table */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                        <h4 className="text-sm font-black uppercase text-slate-900 tracking-wider">Active Credentials</h4>
                        <button onClick={fetchKeys} className="text-slate-400 hover:text-slate-900 transition-colors"><RefreshCw size={14} /></button>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {loading ? (
                            <p className="p-8 text-center text-xs font-semibold text-slate-400 animate-pulse">Loading secure tokens...</p>
                        ) : keys.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 space-y-2">
                                <Key size={28} className="mx-auto text-slate-300" />
                                <p className="text-xs font-bold text-slate-700">No developer keys registered</p>
                                <p className="text-xs max-w-xs mx-auto font-medium">Issue an access key above to begin broadcasting roaming endpoint vectors.</p>
                            </div>
                        ) : (
                            keys.map((k) => (
                                <div key={k.id} className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                                    <div className="space-y-1">
                                        <p className="text-sm font-extrabold text-slate-900">{k.name}</p>
                                        <div className="flex items-center space-x-2 font-mono text-xs text-slate-500 bg-slate-100/80 px-2 py-1 rounded-lg border border-slate-200/50">
                                            <span>{revealedKeys[k.id] ? k.key : 'ev_live_••••••••••••••••••••••••••••••••'}</span>
                                        </div>
                                    </div>

                                    {/* Action row switches */}
                                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                                        <button
                                            onClick={() => toggleKeyVisibility(k.id)}
                                            className="p-2 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-all"
                                        >
                                            {revealedKeys[k.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                        <button
                                            onClick={() => copyToClipboard(k.id, k.key)}
                                            className="p-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-all flex items-center space-x-1 min-w-[65px] justify-center text-xs font-bold"
                                        >
                                            {copiedKeyId === k.id ? (
                                                <> <Check size={12} className="text-emerald-400" /> <span>Copied</span> </>
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
        </div>
    );
}