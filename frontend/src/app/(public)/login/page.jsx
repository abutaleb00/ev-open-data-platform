'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import { Zap, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, ShieldAlert, ChevronLeft } from 'lucide-react';
import api from '@/lib/axios';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const router = useRouter();
    const login = useAuthStore((state) => state.login);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', { email, password });

            if (response.data.success) {
                login(response.data.user, response.data.token);
                document.cookie = `token=${response.data.token}; path=/; max-age=86400; SameSite=Strict`;
                document.cookie = `userRole=${response.data.user.role}; path=/; max-age=86400; SameSite=Strict`;

                if (response.data.user.role === 'SUPER_ADMIN') {
                    router.push('/super-admin/dashboard');
                } else {
                    router.push('/company/dashboard');
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials. Please verify data entries.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-slate-50 relative select-none items-stretch">

            {/* LEFT PANE: LOGIN PANEL CONTAINER */}
            <div className="w-full lg:w-[45%] flex flex-col justify-between px-6 sm:px-16 lg:px-12 xl:px-24 bg-white relative z-10 py-10 shadow-xl border-r border-slate-200/60">
                
                {/* Header Back Button - FIXED PATH REDIRECTION */}
                <div className="flex items-center justify-between w-full shrink-0">
                    <Link href="/" className="inline-flex cursor-pointer items-center space-x-2 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-slate-900 transition-colors py-1 group">
                        <ChevronLeft size={14} strokeWidth={2.5} className="transform transition-transform group-hover:-translate-x-0.5" />
                        <span>Return Home</span>
                    </Link>
                    
                    <div className="lg:hidden flex items-center space-x-2">
                        <div className="p-1.5 bg-[#FFAF00] text-slate-950 rounded-lg">
                            <Zap size={14} fill="currentColor" />
                        </div>
                        <span className="text-xs font-black tracking-widest text-slate-900">EV DATA HUB</span>
                    </div>
                </div>

                {/* Core Login Form Matrix */}
                <div className="w-full max-w-sm mx-auto lg:mx-0 my-auto py-12 space-y-7">
                    <div className="space-y-1.5">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Operator Sign In</h2>
                        <p className="text-xs text-slate-400 font-bold">Authenticate your terminal workspace matrix variables below.</p>
                    </div>

                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-start space-x-2.5 text-xs font-semibold animate-in shake duration-300">
                            <ShieldAlert size={16} className="shrink-0 text-rose-600 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Email Input */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Identity Account Email</label>
                            <div className="relative group">
                                <Mail size={14} className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-slate-800 transition-colors" />
                                <input
                                    type="email" required
                                    value={email} onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-slate-400 outline-hidden transition-all shadow-3xs"
                                    placeholder="ops@chargevolt.com"
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Account Access Key</label>
                                <Link href="/forgot-password" className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-900 transition-colors">
                                    Forgot?
                                </Link>
                            </div>
                            <div className="relative group">
                                <Lock size={14} className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-slate-800 transition-colors" />
                                <input
                                    type={showPassword ? 'text' : 'password'} required
                                    value={password} onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 focus:bg-white focus:border-slate-400 outline-hidden transition-all shadow-3xs"
                                    placeholder="••••••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                >
                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex cursor-pointer justify-center items-center py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-md active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin mr-2 text-white" />
                                        <span>Verifying Identity Handshake...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Secure Core Sign In</span>
                                        <ArrowRight size={14} strokeWidth={2.5} className="ml-2" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Footer Copy Ribbon Links */}
                <div className="pt-4 border-t border-slate-100 text-center lg:text-left shrink-0">
                    <p className="text-xs font-medium text-slate-400">
                        Deploying a fresh charging network profile?{' '}
                        <Link href="/register" className="font-bold text-slate-900 hover:underline">
                            Register Organization
                        </Link>
                    </p>
                </div>
            </div>

            {/* RIGHT PANE: DECORATIVE BLUEPRINT GRID SIDEBAR */}
            <div className="hidden lg:flex lg:w-[55%] relative bg-[#0F172A] flex-col justify-between p-16 text-white overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-transparent to-transparent pointer-events-none" />

                {/* Neon Ambient Blurs */}
                <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

                {/* Brand Header Link */}
                <Link href="/" className="flex items-center space-x-3 relative z-10 cursor-pointer w-max">
                    <div className="p-2.5 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl text-slate-950 shadow-md">
                        <Zap size={18} strokeWidth={2.5} />
                    </div>
                    <span className="text-xs font-black tracking-widest text-white uppercase">EV Data Hub Platform</span>
                </Link>

                {/* Mid Section Banner */}
                <div className="max-w-xl relative z-10 my-auto space-y-4">
                    <span className="text-[9px] font-mono font-black tracking-widest text-[#FFAF00] bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 uppercase shadow-2xs">
                        Authorized Node Access
                    </span>
                    <h1 className="text-4xl font-black tracking-tight leading-tight mt-2 text-white">
                        Orchestrate Your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-emerald-400">Charging Grid Matrix</span>
                    </h1>
                    <p className="text-xs text-slate-400 font-bold leading-relaxed max-w-md">
                        A centralized multi-tenant optimization engine for corporate operators to monitor telemetry coordinates, compile OCPI datasets, and clear active compliance checks in real-time.
                    </p>
                </div>

                {/* Bottom Core Analytical Specs Deck */}
                <div className="grid grid-cols-2 gap-8 border-t border-slate-800/80 pt-8 relative z-10 max-w-sm">
                    <div className="space-y-0.5">
                        <p className="text-2xl font-black text-white">99.98%</p>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Telemetry API Gateway</p>
                    </div>
                    <div className="space-y-0.5">
                        <p className="text-2xl font-black text-[#73CB44]">OCPI 2.2.1</p>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Native Manifest Pipeline</p>
                    </div>
                </div>
            </div>

        </div>
    );
}