'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
    Building2, User, Mail, Lock, Phone, Palette, Eye, EyeOff,
    ShieldCheck, AlertCircle, ArrowRight, RefreshCw, CheckCircle2, ChevronRight
} from 'lucide-react';
import Link from 'next/link';

export default function CorporateRegisterPage() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Consolidated Staged Data Matrix
    const [formData, setFormData] = useState({
        companyName: '', companyEmail: '', companyPhone: '', primaryColor: '#73CB44',
        firstName: '', lastName: '', userEmail: '', password: ''
    });

    const handleInputChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'https://evopen-api.maanrishfaxyz.xyz/api/v1'}/auth/register`;
            const response = await axios.post(apiUrl, formData);

            if (response.data.success) {
                setSuccessMsg(response.data.message || 'Self-registration completed successfully.');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (error) {
            setErrorMsg(error.response?.data?.message || 'Failed to establish platform tenant structure variables.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-700 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden selection-none">
            {/* Soft Ambient Geometric Light Accents */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

            <div className="max-w-5xl w-full bg-white/80 border border-slate-200 rounded-3xl backdrop-blur-xl p-6 sm:p-10 shadow-xl relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                
                {/* LEFT COLUMN: VISUAL BRANDING HEADER SUMMARY PANEL */}
                <div className="lg:col-span-4 flex flex-col justify-between bg-slate-900 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg shadow-slate-950/20">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 via-transparent to-transparent pointer-events-none" />
                    
                    <div className="space-y-6 relative z-10">
                        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-amber-500/10 text-[#FFAF00] border border-amber-500/20">
                            CPO Ecosystem Gate
                        </div>
                        <div className="space-y-3">
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-none">
                                Begin Your <br/><span className="text-[#FFAF00]">Network</span> Journey.
                            </h1>
                            <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                Seamlessly deploy dynamic open data sets, orchestrate OCPP charge corridors, and align infrastructure layouts with modern validation boundaries.
                            </p>
                        </div>
                    </div>

                    <div className="pt-8 space-y-3 relative z-10 border-t border-slate-800/60 mt-8 lg:mt-0">
                        <div className="flex items-center space-x-3 text-xs text-slate-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#73CB44]" />
                            <span>OCPI 2.2.1 Compliant Output</span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-slate-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#73CB44]" />
                            <span>Self-Registration Loop Gate</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium pt-2">
                            Already configured? <Link href="/login" className="text-[#FFAF00] hover:underline font-bold inline-flex items-center">Sign in <ChevronRight size={12} /></Link>
                        </p>
                    </div>
                </div>

                {/* RIGHT COLUMN: INTERACTIVE INPUT FORM WORKSPACE */}
                <div className="lg:col-span-8 space-y-6 flex flex-col justify-center">
                    
                    {/* Conditional Success Banner */}
                    {successMsg && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start space-x-3.5 animate-in fade-in duration-200">
                            <CheckCircle2 className="text-[#73CB44] shrink-0 mt-0.5" size={22} />
                            <div className="space-y-1">
                                <h4 className="text-sm font-black text-slate-900">Activation Pipeline Dispatched</h4>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                    {successMsg} Check your operational email box to confirm registration vectors.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Conditional Error Notification Toast */}
                    {errorMsg && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center space-x-2.5 text-xs font-semibold animate-in shake duration-300">
                            <AlertCircle size={18} className="shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {!successMsg && (
                        <form onSubmit={handleRegister} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* BLOCK 1: OPERATOR CORPORATE SUMMARY METRICS */}
                                <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-2xs">
                                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center pb-2 border-b border-slate-200">
                                        <Building2 size={13} className="mr-2 text-slate-500" /> 1. Company Information
                                    </h3>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">Company Registered Name</label>
                                            <input
                                                type="text" required
                                                value={formData.companyName} onChange={(e) => handleInputChange('companyName', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-slate-400 focus:bg-white transition-all outline-hidden text-slate-800"
                                                placeholder="e.g. ChargeVolt Grid Ltd"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">Corporate Support Email</label>
                                            <input
                                                type="email" required
                                                value={formData.companyEmail} onChange={(e) => handleInputChange('companyEmail', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-slate-400 transition-all outline-hidden text-slate-800"
                                                placeholder="ops@chargevolt.com"
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="col-span-2">
                                                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">Helpline Phone</label>
                                                <input
                                                    type="text" required
                                                    value={formData.companyPhone} onChange={(e) => handleInputChange('companyPhone', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-slate-400 transition-all outline-hidden text-slate-800"
                                                    placeholder="+44 20 7946 0958"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">Brand Hex</label>
                                                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-1 h-[32px]">
                                                    <input
                                                        type="color"
                                                        value={formData.primaryColor} onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                                                        className="w-5 h-full bg-transparent border-0 rounded cursor-pointer"
                                                    />
                                                    <span className="text-[9px] font-mono font-bold text-slate-500 mr-1">{formData.primaryColor.toUpperCase()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* BLOCK 2: SECURED ADMIN USER ATTRIBUTES */}
                                <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-2xs">
                                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center pb-2 border-b border-slate-200">
                                        <User size={13} className="mr-2 text-slate-500" /> 2. Administrator Identity
                                    </h3>

                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">First Name</label>
                                                <input
                                                    type="text" required
                                                    value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-slate-400 transition-all outline-hidden text-slate-800"
                                                    placeholder="Sarah"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">Last Name</label>
                                                <input
                                                    type="text" required
                                                    value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-slate-400 transition-all outline-hidden text-slate-800"
                                                    placeholder="Connor"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">Personal Login Email</label>
                                            <input
                                                type="email" required
                                                value={formData.userEmail} onChange={(e) => handleInputChange('userEmail', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-slate-400 transition-all outline-hidden text-slate-800"
                                                placeholder="s.connor@chargevolt.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">Account Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'} required minLength={8}
                                                    value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)}
                                                    className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:border-slate-400 transition-all outline-hidden text-slate-800"
                                                    placeholder="••••••••••••"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                                                >
                                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Execution Deck Footer Trigger Panel */}
                            <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold border-t border-slate-200">
                                <p className="text-[11px] font-medium text-slate-400 flex items-center">
                                    <ShieldCheck size={14} className="mr-1.5 text-emerald-500 shrink-0" />
                                    Access token validation criteria managed via isolated transactions.
                                </p>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full sm:w-auto flex items-center cursor-pointer justify-center space-x-2 bg-[#FFAF00] hover:bg-[#73CB44] text-white font-black px-6 py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.99] uppercase tracking-wider text-[11px]"
                                >
                                    {submitting ? (
                                        <>
                                            <RefreshCw size={12} className="animate-spin text-white" />
                                            <span>Building Tenancy...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Register</span>
                                            <ArrowRight size={12} strokeWidth={2.5} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                </div>
            </div>
        </div>
    );
}