'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import {
    ShieldAlert, RefreshCw, Layers, Zap,
    CheckCircle2, Radio, MessageSquare, AlertTriangle, Save, X
} from 'lucide-react';

export default function MaintenanceAlertPage() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Live state tracking variables synchronized to database configuration metrics
    const [globalAlert, setGlobalAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [affectedServices, setAffectedServices] = useState({
        locationsFeed: false,
        tariffsFeed: false,
        operatorPortal: false,
        developerKeys: false
    });

    // Custom Professional Notification Modals State Engine
    const [confirmModal, setConfirmModal] = useState(false);
    const [statusModal, setStatusModal] = useState({ show: false, type: 'success', message: '' });

    // Fetch the active maintenance override configurations on initial mounting
    const fetchCurrentConfig = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/moderation/maintenance');
            if (response.data.success && response.data.data) {
                const config = response.data.data;
                setGlobalAlert(config.globalAlert);
                setAlertMessage(config.alertMessage || '');
                setAffectedServices({
                    locationsFeed: config.locationsBlocked,
                    tariffsFeed: config.tariffsBlocked,
                    operatorPortal: config.portalBlocked,
                    developerKeys: config.keysBlocked
                });
            }
        } catch (error) {
            console.error("Failed to read server pipeline configurations:", error);
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

    // Trigger the custom interstitial confirmation overlay instead of firing direct saves
    const triggerConfirmation = (e) => {
        e.preventDefault();
        setConfirmModal(true);
    };

    const handleSaveConfiguration = async () => {
        setConfirmModal(false);
        setSubmitting(true);
        try {
            await api.post('/admin/moderation/maintenance', {
                globalAlert,
                alertMessage,
                affectedServices
            });

            // Trigger premium layout success banner toast callback
            setStatusModal({
                show: true,
                type: 'success',
                message: 'System status gate matrices updated and propagated down to active proxy nodes successfully.'
            });
            fetchCurrentConfig();
        } catch (error) {
            setStatusModal({
                show: true,
                type: 'error',
                message: error.response?.data?.message || 'Failed to propagate structural security override parameters across storage nodes.'
            });
        } finally {
            setSubmitting(false);
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
        <div className="space-y-6 max-w-5xl mx-auto px-2 select-none relative">

            {/* Header Dashboard Banner */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
                <div className="flex items-center space-x-4">
                    <div className="p-3.5 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl text-[#FFAF00] ring-1 ring-amber-200/50 shadow-inner">
                        <ShieldAlert size={24} strokeWidth={2.5} className="text-slate-950" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Maintenance Alert Matrix</h2>
                        <p className="text-sm text-slate-500 mt-0.5 font-medium">Broadcast platform isolation codes and schedule open data stream updates</p>
                    </div>
                </div>

                <div className="flex items-center space-x-2 bg-slate-900 text-[#FFAF00] px-3.5 py-1.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider border border-slate-800">
                    <Radio size={12} className={globalAlert ? "animate-pulse text-[#73CB44]" : "text-slate-500"} />
                    <span>Status: {globalAlert ? 'System Intercept Active' : 'Normal Operations'}</span>
                </div>
            </div>

            {/* Core Workspace Configurations Multi-Grid Form */}
            <form onSubmit={triggerConfirmation} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* Left Section columns */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Block 1: Master Intercept Toggle Switch panel */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
                        <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider flex items-center">
                            <Radio size={14} className="mr-1.5 text-[#FFAF00]" /> Master Alert Switch
                        </h3>

                        <div className={`p-5 rounded-2xl border transition-all flex items-center justify-between ${globalAlert ? 'bg-amber-50/40 border-[#FFAF00]/40' : 'bg-slate-50 border-slate-200/60'}`}>
                            <div className="space-y-0.5 max-w-sm">
                                <p className="text-sm font-black text-slate-900">Activate System-Wide Intercept Banner</p>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    Enabling this injects a high-visibility warning notification component into all active tenant screens and endpoints instantly.
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
                    </div>

                    {/* Block 2: Custom Notification Message */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider flex items-center">
                                <MessageSquare size={14} className="mr-1.5 text-indigo-500" /> Broadcast Alert Message
                            </h3>
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">Markdown Supported</span>
                        </div>

                        <textarea
                            required
                            rows={4}
                            value={alertMessage}
                            onChange={(e) => setAlertMessage(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white text-sm font-semibold transition-all shadow-2xs leading-relaxed focus:ring-2 focus:ring-[#FFAF00]/20 resize-none text-slate-800"
                            placeholder="Enter detailed instructions for operators or end API consumers regarding the down-time scope..."
                        />
                    </div>
                </div>

                {/* Right Section columns */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm space-y-5">
                        <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider flex items-center">
                            <Layers size={14} className="mr-1.5 text-[#73CB44]" /> Targeted Pipelines
                        </h3>

                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Select which specific open-data streams or sub-modules are impacted to isolate target telemetry loops cleanly.
                        </p>

                        <div className="space-y-2.5">
                            {[
                                { key: 'locationsFeed', label: 'Public Locations JSON Feed' },
                                { key: 'tariffsFeed', label: 'Public Tariffs JSON Feed' },
                                { key: 'operatorPortal', label: 'Tenant Operator Portals' },
                                { key: 'developerKeys', label: 'Developer Key Provisioning' }
                            ].map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => handleToggleService(item.key)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-black transition-all ${affectedServices[item.key] ? 'bg-slate-900 border-slate-900 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/70'}`}
                                >
                                    <span className="capitalize tracking-wide">{item.label}</span>
                                    {affectedServices[item.key] ? (
                                        <span className="text-[10px] font-mono font-black bg-[#FFAF00] text-slate-950 px-1.5 py-0.5 rounded-md flex items-center uppercase"><AlertTriangle size={10} className="mr-0.5" /> Intercepted</span>
                                    ) : (
                                        <span className="text-[10px] font-mono font-black bg-[#73CB44]/10 text-[#73CB44] px-1.5 py-0.5 rounded-md flex items-center uppercase"><CheckCircle2 size={10} className="mr-0.5" /> Safe</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full flex items-center justify-center space-x-2 bg-[#73CB44] text-white font-black px-5 py-3 rounded-xl hover:bg-[#62b537] transition-all shadow-md shadow-[#73CB44]/10 active:scale-98 text-xs uppercase tracking-wider"
                            >
                                <Save size={14} strokeWidth={2.5} />
                                <span>{submitting ? 'Propagating Configuration...' : 'Commit System Overrides'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            {/* --- MODAL 1: PREMIUM CONFIRMATION MODAL OVERLAY --- */}
            {confirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={() => setConfirmModal(false)}></div>
                    <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-start space-x-4">
                            <div className="p-3 bg-amber-50 rounded-xl text-[#FFAF00] shrink-0">
                                <AlertTriangle size={24} className="text-slate-950" />
                            </div>
                            <div className="space-y-1.5">
                                <h4 className="text-lg font-extrabold text-slate-900 tracking-tight">Confirm Pipeline Overrides?</h4>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    You are executing modifications to global operational parameters. Toggled network gates will immediately block live open-data feeds and drop API traffic routes.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setConfirmModal(false)}
                                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                Cancel Discovery
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveConfiguration}
                                className="flex-1 px-4 py-2.5 bg-slate-950 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-md"
                            >
                                Execute Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL 2: CUSTOM TRANSACTION SUCCESS/FAILURE INTERCEPTOR BANNER --- */}
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
                                className={`w-full py-2.5 text-xs font-bold rounded-xl text-white transition-all shadow-sm ${statusModal.type === 'success' ? 'bg-[#73CB44] hover:bg-[#62b537]' : 'bg-rose-600 hover:bg-rose-700'}`}
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