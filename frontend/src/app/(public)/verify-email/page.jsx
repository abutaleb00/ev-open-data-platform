'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

// --- 1. CORE LOGIC COMPONENT ---
// Extract everything using useSearchParams() into this isolated sub-module
function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token'); // Safely pulled inside Suspense boundary context

    const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
    const [message, setMessage] = useState('');

    useEffect(() => {
        const confirmTokenVerification = async () => {
            if (!token) {
                setStatus('error');
                setMessage('Verification token parameters missing from URL string structure.');
                return;
            }

            try {
                const response = await api.get(`/auth/verify-email?token=${token}`);
                if (response.data.success) {
                    setStatus('success');
                    setMessage('Your operator workspace access profile is fully activated.');
                }
            } catch (error) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Token signature expired or invalid.');
            }
        };

        confirmTokenVerification();
    }, [token]);

    return (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full text-center space-y-6">
            <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center relative">
                {status === 'verifying' && (
                    <>
                        <div className="absolute inset-0 bg-indigo-50 rounded-full animate-pulse" />
                        <Loader2 size={28} className="text-indigo-600 animate-spin relative z-10" />
                    </>
                )}
                {status === 'success' && (
                    <>
                        <div className="absolute inset-0 bg-emerald-50 rounded-full" />
                        <CheckCircle2 size={28} className="text-emerald-500 relative z-10" />
                    </>
                )}
                {status === 'error' && (
                    <>
                        <div className="absolute inset-0 bg-rose-50 rounded-full" />
                        <AlertCircle size={28} className="text-rose-600 relative z-10" />
                    </>
                )}
            </div>

            <div className="space-y-1">
                <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-wider">
                    {status === 'verifying' && 'Validating Token'}
                    {status === 'success' && 'Account Activated'}
                    {status === 'error' && 'Verification Failed'}
                </h2>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed px-4">
                    {message || 'Synchronizing digital token vectors with secure database nodes...'}
                </p>
            </div>

            {status !== 'verifying' && (
                <Link
                    href="/login"
                    className="w-full flex cursor-pointer justify-center items-center py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
                >
                    <span>Proceed to Sign In</span>
                    <ArrowRight size={14} className="ml-2" />
                </Link>
            )}
        </div>
    );
}

// --- 2. DEFAULT EXPORTED WRAPPER GATEWAY ---
// Next.js targets this signature. Wrapping in Suspense fixes the compilation bailout exception!
export default function VerifyEmailPage() {
    return (
        <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
            <Suspense
                fallback={
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-sm w-full text-center space-y-4">
                        <Loader2 size={24} className="animate-spin text-slate-400 mx-auto" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Initializing Security Boundaries...</p>
                    </div>
                }
            >
                <VerifyEmailContent />
            </Suspense>
        </div>
    );
}