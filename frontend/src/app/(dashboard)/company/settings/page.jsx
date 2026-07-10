'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import {
    Building2, Mail, Save, RefreshCw,
    CheckCircle2, AlertCircle, ShieldCheck
} from 'lucide-react';

export default function CompanySettingsPage() {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        contactEmail: ''
    });

    useEffect(() => {
        const fetchCurrentCompanyProfile = async () => {
            try {
                // Fetch the list of companies, then isolate the one belonging to this specific user context
                const response = await api.get('/companies');
                if (response.data.success) {
                    const myCompany = response.data.data.find(c => c.id === user?.companyId);
                    if (myCompany) {
                        setFormData({
                            name: myCompany.name || '',
                            contactEmail: myCompany.contactEmail || ''
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to sync structural profile settings matrix:", error);
                setErrorMsg("Failed to synchronize corporate profile telemetry metrics.");
            } finally {
                setLoading(false);
            }
        };

        if (user?.companyId) {
            fetchCurrentCompanyProfile();
        }
    }, [user]);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            // Hit the secure isolated self-service endpoint directly
            const response = await api.put('/companies/profile', formData);
            if (response.data.success) {
                setSuccessMsg(response.data.message || "Profile configurations committed cleanly.");
                setTimeout(() => setSuccessMsg(''), 4000);
            }
        } catch (error) {
            setErrorMsg(error.response?.data?.message || "Failed to update operator profile variables.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-24 text-slate-400 space-y-4">
                <RefreshCw size={36} className="animate-spin text-indigo-600" />
                <p className="text-sm font-bold tracking-wide animate-pulse">Syncing corporate workspace parameters...</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 px-2">

            {/* Header Area */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex items-center space-x-4">
                <div className="p-3 bg-slate-900 rounded-xl text-white">
                    <Building2 size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Network Profile Workspace</h2>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">Customize corporate branding data parameters and public operator records</p>
                </div>
            </div>

            {/* Input Form Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 relative">

                {/* Status Messages */}
                {successMsg && (
                    <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start space-x-3 text-xs font-semibold text-emerald-800 animate-in fade-in duration-200">
                        <CheckCircle2 size={16} className="shrink-0 text-emerald-600 mt-0.5" />
                        <span>{successMsg}</span>
                    </div>
                )}

                {errorMsg && (
                    <div className="mb-6 bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start space-x-3 text-xs font-semibold text-rose-800 animate-in shake duration-300">
                        <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                <form onSubmit={handleFormSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-5">

                        {/* Field: Corporate Title */}
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Registered Operator Legal Name</label>
                            <div className="relative group">
                                <Building2 size={14} className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-slate-700 transition-colors" />
                                <input
                                    type="text" required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-slate-400 transition-all outline-hidden shadow-2xs"
                                    placeholder="e.g. ChargeVolt Grid Operations"
                                />
                            </div>
                        </div>

                        {/* Field: Communications Email */}
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Operational Core Support Email Address</label>
                            <div className="relative group">
                                <Mail size={14} className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-slate-700 transition-colors" />
                                <input
                                    type="email" required
                                    value={formData.contactEmail}
                                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-slate-400 transition-all outline-hidden shadow-2xs"
                                    placeholder="ops@chargevolt.com"
                                />
                            </div>
                        </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold mt-8">
                        <p className="text-[11px] font-medium text-slate-400 flex items-center">
                            <ShieldCheck size={14} className="mr-1.5 text-emerald-500 shrink-0" />
                            Security isolation scopes enforced via dynamic multi-tenant encryption filters.
                        </p>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full sm:w-auto flex cursor-pointer items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-black px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-[0.99] uppercase tracking-wider text-[11px] disabled:opacity-70"
                        >
                            {submitting ? (
                                <>
                                    <RefreshCw size={12} className="animate-spin text-white" />
                                    <span>Syncing Schema Alignment...</span>
                                </>
                            ) : (
                                <>
                                    <Save size={12} />
                                    <span>Commit Workspace Changes</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}