'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import {
    ShieldAlert, RefreshCw, Layers, Zap, Gauge, Clock,
    CheckCircle2, Radio, MessageSquare, AlertTriangle, Save, ToggleLeft, ToggleRight
} from 'lucide-react';

export default function MaintenanceAlertPage() {
    const [loading, setLoading] = useState(true);
    const [savingMaint, setSavingMaint] = useState(false);
    const [savingRate, setSavingRate] = useState(false);

    // Maintenance & Alert States
    const [globalAlert, setGlobalAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [affectedServices, setAffectedServices] = useState({
        locationsFeed: false,
        tariffsFeed: false,
        operatorPortal: false,
        developerKeys: false
    });

    // Rate Limiting States (Window in SECONDS)
    const [rateLimitingEnabled, setRateLimitingEnabled] = useState(true);
    const [feedRateLimitMax, setFeedRateLimitMax] = useState(100);
    const [feedRateLimitWindow, setFeedRateLimitWindow] = useState(30); // Default 30 seconds

    // Modal Confirmation & Status Banners
    const [confirmModal, setConfirmModal] = useState({ show: false, actionType: null });
    const [statusModal, setStatusModal] = useState({ show: false, type: 'success', message: '' });

    const fetchCurrentConfig = async () => {
        setLoading(true);
        try {
            const [maintRes, rateRes] = await Promise.all([
                api.get('/admin/moderation/maintenance').catch(() => null),
                api.get('/admin/config/rate-limit').catch(() => null)
            ]);

            if (maintRes?.data?.success && maintRes.data.data) {
                const config = maintRes.data.data;
                setGlobalAlert(config.globalAlert);
                setAlertMessage(config.alertMessage || '');
                setAffectedServices({
                    locationsFeed: config.locationsBlocked,
                    tariffsFeed: config.tariffsBlocked,
                    operatorPortal: config.portalBlocked,
                    developerKeys: config.keysBlocked
                });
            }

            if (rateRes?.data?.success && rateRes.data.data) {
                const rConfig = rateRes.data.data;
                setRateLimitingEnabled(rConfig.rateLimitingEnabled ?? true);
                setFeedRateLimitMax(rConfig.feedRateLimitMax || 100);
                setFeedRateLimitWindow(rConfig.feedRateLimitWindow || 30); // Seconds
            }
        } catch (error) {
            console.error("Failed to read server configuration parameters:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCurrentConfig();
    }, []);

    const handleToggleService = (key) => {
        setAffectedServices(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const promptConfirm = (actionType) => {
        setConfirmModal({ show: true, actionType });
    };

    // SAVE ACTION 1: Maintenance Settings Only
    const handleSaveMaintenance = async () => {
        setConfirmModal({ show: false, actionType: null });
        setSavingMaint(true);
        try {
            await api.post('/admin/moderation/maintenance', {
                globalAlert,
                alertMessage,
                affectedServices
            });

            setStatusModal({
                show: true,
                type: 'success',
                message: 'Maintenance alerts and targeted pipeline status updated successfully.'
            });
            fetchCurrentConfig();
        } catch (error) {
            setStatusModal({
                show: true,
                type: 'error',
                message: error.response?.data?.message || 'Failed to update maintenance configuration.'
            });
        } finally {
            setSavingMaint(false);
        }
    };

    // SAVE ACTION 2: Rate Limiting Policies Only
    const handleSaveRateLimiting = async () => {
        setConfirmModal({ show: false, actionType: null });
        setSavingRate(true);
        try {
            await api.put('/admin/config/rate-limit', {
                feedRateLimitMax: parseInt(feedRateLimitMax, 10),
                feedRateLimitWindow: parseInt(feedRateLimitWindow, 10), // Passed in SECONDS
                rateLimitingEnabled
            });

            setStatusModal({
                show: true,
                type: 'success',
                message: 'API rate limiting quotas updated and synchronized across all request gateways.'
            });
            fetchCurrentConfig();
        } catch (error) {
            setStatusModal({
                show: true,
                type: 'error',
                message: error.response?.data?.message || 'Failed to update rate limit parameters.'
            });
        } finally {
            setSavingRate(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
                <RefreshCw size={32} className="animate-spin text-[#FFAF00] mb-3" />
                <p className="text-sm font-semibold">Reading matrix gate parameters...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto px-2 select-none relative pb-12">

            {/* Header Dashboard Banner */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
                <div className="flex items-center space-x-4">
                    <div className="p-3.5 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl text-[#FFAF00] ring-1 ring-amber-200/50 shadow-inner">
                        <ShieldAlert size={24} strokeWidth={2.5} className="text-slate-950" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">System Controls & Traffic Matrix</h2>
                        <p className="text-sm text-slate-500 mt-0.5 font-medium">Independently manage maintenance overrides and API traffic rate limits</p>
                    </div>
                </div>

                <div className="flex items-center space-x-2 bg-slate-900 text-[#FFAF00] px-3.5 py-1.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider border border-slate-800">
                    <Radio size={12} className={globalAlert ? "animate-pulse text-[#73CB44]" : "text-slate-500"} />
                    <span>Status: {globalAlert ? 'System Intercept Active' : 'Normal Operations'}</span>
                </div>
            </div>

            {/* SECTION 1: MAINTENANCE & SYSTEM ALERTS FORM */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                        <h3 className="text-base font-black text-slate-900 flex items-center">
                            <ShieldAlert size={18} className="mr-2 text-[#FFAF00]" /> Maintenance & Intercept Controls
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">Broadcast platform alerts and temporarily isolate open-data pipelines</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Left Column: Intercept & Message */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${globalAlert ? 'bg-amber-50/40 border-[#FFAF00]/40' : 'bg-slate-50 border-slate-200/60'}`}>
                            <div className="space-y-0.5 max-w-sm">
                                <p className="text-sm font-black text-slate-900">Activate System-Wide Intercept Banner</p>
                                <p className="text-xs text-slate-500 font-medium">
                                    Injects a high-visibility warning notification component into active tenant screens instantly.
                                </p>
                            </div>

                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={globalAlert}
                                    onChange={(e) => setGlobalAlert(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FFAF00]" />
                            </label>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center">
                                <MessageSquare size={13} className="mr-1.5 text-indigo-500" /> Broadcast Alert Message
                            </label>
                            <textarea
                                rows={3}
                                value={alertMessage}
                                onChange={(e) => setAlertMessage(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white text-sm font-semibold transition-all outline-none leading-relaxed focus:ring-2 focus:ring-[#FFAF00]/20 resize-none text-slate-800"
                                placeholder="Enter detailed instructions for operators or API consumers..."
                            />
                        </div>
                    </div>

                    {/* Right Column: Targeted Pipelines & Save Button */}
                    <div className="space-y-4">
                        <label className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center">
                            <Layers size={13} className="mr-1.5 text-[#73CB44]" /> Targeted Pipelines
                        </label>

                        <div className="space-y-2">
                            {[
                                { key: 'locationsFeed', label: 'Public Locations Feed' },
                                { key: 'tariffsFeed', label: 'Public Tariffs Feed' },
                                { key: 'operatorPortal', label: 'Operator Portals' },
                                { key: 'developerKeys', label: 'Developer Key Provisioning' }
                            ].map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => handleToggleService(item.key)}
                                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${affectedServices[item.key] ? 'bg-slate-900 border-slate-900 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/70'}`}
                                >
                                    <span>{item.label}</span>
                                    {affectedServices[item.key] ? (
                                        <span className="text-[10px] font-mono font-black bg-[#FFAF00] text-slate-950 px-1.5 py-0.5 rounded-md flex items-center uppercase"><AlertTriangle size={10} className="mr-0.5" /> Intercepted</span>
                                    ) : (
                                        <span className="text-[10px] font-mono font-black bg-[#73CB44]/10 text-[#73CB44] px-1.5 py-0.5 rounded-md flex items-center uppercase"><CheckCircle2 size={10} className="mr-0.5" /> Safe</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            disabled={savingMaint}
                            onClick={() => promptConfirm('MAINTENANCE')}
                            className="w-full flex items-center justify-center space-x-2 bg-[#73CB44] text-white font-black px-5 py-3 rounded-xl hover:bg-[#62b537] transition-all shadow-md shadow-[#73CB44]/10 active:scale-98 text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
                        >
                            <Save size={14} strokeWidth={2.5} />
                            <span>{savingMaint ? 'Saving Maintenance...' : 'Save Maintenance Settings'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* SECTION 2: API THROTTLE & RATE LIMITING FORM */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                        <h3 className="text-base font-black text-slate-900 flex items-center">
                            <Gauge size={18} className="mr-2 text-indigo-600" /> API Throttle & Rate Limit Controls
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">Configure request throughput rules and IP throttling thresholds in seconds</p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setRateLimitingEnabled(!rateLimitingEnabled)}
                        className="flex items-center space-x-2 text-indigo-600 cursor-pointer focus:outline-none"
                    >
                        <span className="text-xs font-extrabold tracking-wide uppercase text-slate-500">
                            {rateLimitingEnabled ? 'Limiter Active' : 'Bypassed'}
                        </span>
                        {rateLimitingEnabled ? (
                            <ToggleRight size={34} className="text-indigo-600" />
                        ) : (
                            <ToggleLeft size={34} className="text-slate-300" />
                        )}
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
                    {/* Max Requests Input */}
                    <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                        <div className="flex items-center space-x-2 text-slate-800">
                            <Zap size={14} className="text-amber-500" />
                            <label className="text-xs font-black uppercase tracking-wider text-slate-800">
                                Max Requests
                            </label>
                        </div>
                        <input
                            type="number"
                            min="1"
                            max="10000"
                            required
                            value={feedRateLimitMax}
                            onChange={(e) => setFeedRateLimitMax(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-black text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                        />
                        <p className="text-[10px] text-slate-400 font-semibold">Max allowed queries per IP before HTTP 429 error.</p>
                    </div>

                    {/* Window SECONDS Input */}
                    <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                        <div className="flex items-center space-x-2 text-slate-800">
                            <Clock size={14} className="text-indigo-500" />
                            <label className="text-xs font-black uppercase tracking-wider text-slate-800">
                                Window Size (Seconds)
                            </label>
                        </div>
                        <input
                            type="number"
                            min="1"
                            max="86400"
                            required
                            value={feedRateLimitWindow}
                            onChange={(e) => setFeedRateLimitWindow(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-black text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                        />
                        <p className="text-[10px] text-slate-400 font-semibold">Resets request counter per IP after this duration (sec).</p>
                    </div>

                    {/* Save Button 2 */}
                    <div className="space-y-2">
                        <div className="p-2.5 bg-slate-900 text-slate-200 rounded-xl border border-slate-800 text-[11px] font-mono">
                            Policy: {rateLimitingEnabled ? `${feedRateLimitMax} reqs / ${feedRateLimitWindow} sec` : 'Bypassed'}
                        </div>
                        <button
                            type="button"
                            disabled={savingRate}
                            onClick={() => promptConfirm('RATELIMIT')}
                            className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black px-5 py-3 rounded-xl transition-all shadow-md active:scale-98 text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
                        >
                            <Save size={14} strokeWidth={2.5} />
                            <span>{savingRate ? 'Saving Policies...' : 'Save Rate Limit Policy'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Confirmation Overlay Modal */}
            {confirmModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={() => setConfirmModal({ show: false, actionType: null })}></div>
                    <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-start space-x-4">
                            <div className="p-3 bg-amber-50 rounded-xl text-[#FFAF00] shrink-0">
                                <AlertTriangle size={24} className="text-slate-950" />
                            </div>
                            <div className="space-y-1.5">
                                <h4 className="text-lg font-extrabold text-slate-900 tracking-tight">
                                    {confirmModal.actionType === 'MAINTENANCE' ? 'Commit Maintenance Overrides?' : 'Update Rate Limit Policies?'}
                                </h4>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    {confirmModal.actionType === 'MAINTENANCE'
                                        ? 'You are updating global maintenance banners and service gates. Changes take effect immediately.'
                                        : 'You are applying new API traffic quotas in seconds. Modified rate limits will immediately take effect across all gateways.'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setConfirmModal({ show: false, actionType: null })}
                                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmModal.actionType === 'MAINTENANCE' ? handleSaveMaintenance : handleSaveRateLimiting}
                                className="flex-1 px-4 py-2.5 bg-slate-950 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-md cursor-pointer"
                            >
                                Confirm Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Interceptor Modal */}
            {statusModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-3xs" onClick={() => setStatusModal({ ...statusModal, show: false })}></div>
                    <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">

                        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center shadow-inner relative">
                            {statusModal.type === 'success' ? (
                                <>
                                    <div className="absolute inset-0 bg-[#73CB44]/10 rounded-full animate-pulse" />
                                    <CheckCircle2 size={32} className="text-[#73CB44] relative z-10" />
                                </>
                            ) : (
                                <>
                                    <div className="absolute inset-0 bg-rose-100 rounded-full animate-pulse" />
                                    <AlertTriangle size={32} className="text-rose-600 relative z-10" />
                                </>
                            )}
                        </div>

                        <div className="space-y-1">
                            <h4 className="text-base font-black text-slate-900 tracking-tight">
                                {statusModal.type === 'success' ? 'Transaction Complete' : 'Execution Failed'}
                            </h4>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed px-2">
                                {statusModal.message}
                            </p>
                        </div>

                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => setStatusModal({ ...statusModal, show: false })}
                                className={`w-full py-2.5 text-xs font-bold rounded-xl text-white transition-all shadow-sm cursor-pointer ${statusModal.type === 'success' ? 'bg-[#73CB44] hover:bg-[#62b537]' : 'bg-rose-600 hover:bg-rose-700'}`}
                            >
                                Acknowledge
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}