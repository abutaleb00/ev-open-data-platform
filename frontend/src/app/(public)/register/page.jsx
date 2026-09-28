'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import BrandLoader from '@/components/BrandLoader';
import {
    Building2, User, Mail, Lock, Phone, Palette, Eye, EyeOff,
    ShieldCheck, AlertCircle, ArrowRight, CheckCircle2, ChevronRight
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
            const response = await api.post('/auth/register', formData);

            if (response.data.success) {
                setSuccessMsg(response.data.message || 'Self-registration completed successfully.');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (error) {
            setErrorMsg(error.response?.data?.message || 'We could not create the account. Check the details and try again.');
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
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            Operator signup
                        </div>
                        <div className="space-y-3">
                            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
                                Create your operator account
                            </h1>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                Set up your company, add your first admin, and start publishing charging data once a platform admin approves you.
                            </p>
                        </div>
                    </div>

                    <div className="pt-8 space-y-3 relative z-10 border-t border-slate-800/60 mt-8 lg:mt-0">
                        <div className="flex items-center space-x-3 text-xs text-slate-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#73CB44]" />
                            <span>OCPI-shaped public feed</span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-slate-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#73CB44]" />
                            <span>Your data stays in your company</span>
                        </div>
                        <p className="text-sm text-slate-400 pt-2">
                            Already have an account? <Link prefetch={false} href="/login" className="text-amber-300 hover:underline font-medium inline-flex items-center">Sign in <ChevronRight size={14} /></Link>
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
                                <h4 className="text-sm font-semibold text-slate-900">Check your email</h4>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    {successMsg} Open the message we sent and confirm your address to finish signup.
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
                                    <h3 className="text-sm font-semibold text-slate-800 flex items-center pb-2 border-b border-slate-200">
                                        <Building2 size={15} className="mr-2 text-slate-500" /> Company
                                    </h3>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Company name</label>
                                            <input
                                                type="text" required
                                                value={formData.companyName} onChange={(e) => handleInputChange('companyName', e.target.value)}
                                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-slate-400 transition-all outline-hidden text-slate-800"
                                                placeholder="e.g. ChargeVolt Grid Ltd"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Company email</label>
                                            <input
                                                type="email" required
                                                value={formData.companyEmail} onChange={(e) => handleInputChange('companyEmail', e.target.value)}
                                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-slate-400 transition-all outline-hidden text-slate-800"
                                                placeholder="ops@chargevolt.com"
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="col-span-2">
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                                                <input
                                                    type="text" required
                                                    value={formData.companyPhone} onChange={(e) => handleInputChange('companyPhone', e.target.value)}
                                                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-slate-400 transition-all outline-hidden text-slate-800"
                                                    placeholder="+44 20 7946 0958"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Colour</label>
                                                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-2 h-[42px]">
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
                                    <h3 className="text-sm font-semibold text-slate-800 flex items-center pb-2 border-b border-slate-200">
                                        <User size={15} className="mr-2 text-slate-500" /> Your account
                                    </h3>

                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">First name</label>
                                                <input
                                                    type="text" required
                                                    value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)}
                                                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-slate-400 transition-all outline-hidden text-slate-800"
                                                    placeholder="Sarah"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Last name</label>
                                                <input
                                                    type="text" required
                                                    value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)}
                                                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-slate-400 transition-all outline-hidden text-slate-800"
                                                    placeholder="Connor"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Login email</label>
                                            <input
                                                type="email" required
                                                value={formData.userEmail} onChange={(e) => handleInputChange('userEmail', e.target.value)}
                                                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-slate-400 transition-all outline-hidden text-slate-800"
                                                placeholder="s.connor@chargevolt.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'} required minLength={8}
                                                    value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)}
                                                    className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-slate-400 transition-all outline-hidden text-slate-800"
                                                    placeholder="••••••••••••"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                                <p className="text-sm text-slate-500 flex items-center">
                                    <ShieldCheck size={15} className="mr-1.5 text-emerald-600 shrink-0" />
                                    A platform admin reviews new companies before they go live.
                                </p>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full sm:w-auto flex items-center cursor-pointer justify-center gap-2 bg-[#F5A524] hover:bg-[#e09a12] text-slate-950 font-semibold px-6 py-3 rounded-xl transition-all text-sm"
                                >
                                    {submitting ? (
                                        <>
                                            <BrandLoader size="xs" tone="dark" />
                                            <span>Creating account…</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Create account</span>
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