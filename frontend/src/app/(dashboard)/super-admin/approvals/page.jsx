'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import {
    ShieldAlert, CheckCircle2, XCircle, MapPin,
    Zap, Building2, Calendar, RefreshCw, X, MessageSquare
} from 'lucide-react';

export default function ApprovalsPage() {
    const [activeTab, setActiveTab] = useState('locations');
    const [locations, setLocations] = useState([]);
    const [chargePoints, setChargePoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    // Rejection Modal State
    const [rejectModal, setRejectModal] = useState({ isOpen: false, type: null, id: null, title: '' });
    const [rejectNote, setRejectNote] = useState('');

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/moderation/submissions');
            if (response.data.success) {
                setLocations(response.data.data.locations);
                setChargePoints(response.data.data.chargePoints);
            }
        } catch (error) {
            console.error("Failed to load moderation queue", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    // Immediate Approval (No note needed)
    const handleApprove = async (type, id) => {
        await executeModeration(type, id, true, null);
    };

    // Open Rejection Modal
    const promptReject = (type, id, title) => {
        setRejectNote('');
        setRejectModal({ isOpen: true, type, id, title });
    };

    // Confirm Rejection (Submit note)
    const confirmReject = async (e) => {
        e.preventDefault();
        await executeModeration(rejectModal.type, rejectModal.id, false, rejectNote);
        setRejectModal({ isOpen: false, type: null, id: null, title: '' });
    };

    // Core Moderation Execution
    const executeModeration = async (type, id, approved, note) => {
        setProcessingId(`${type}-${id}`);
        try {
            const endpoint = type === 'location'
                ? `/admin/moderation/locations/${id}/moderate`
                : `/admin/moderation/charge-points/${id}/moderate`;

            const response = await api.patch(endpoint, { approved, note });
            if (response.data.success) {
                await fetchQueue();
            }
        } catch (error) {
            alert(error.response?.data?.message || "Action failed execution");
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header banner */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
                <div className="flex items-center space-x-4">
                    <div className="p-3.5 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl text-indigo-600 ring-1 ring-indigo-200/50 shadow-inner">
                        <ShieldAlert size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Open Data Approvals</h2>
                        <p className="text-sm text-slate-500 mt-0.5 font-medium">Verify structural integrity and coordinate validations before public broadcasting.</p>
                    </div>
                </div>
                <button onClick={fetchQueue} className="p-2.5 text-slate-500 hover:text-slate-900 bg-slate-50 rounded-xl border border-slate-200 hover:shadow-sm transition-all">
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 space-x-6">
                <button
                    onClick={() => setActiveTab('locations')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center space-x-2 ${activeTab === 'locations' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                >
                    <MapPin size={16} />
                    <span>Host Locations ({locations.length})</span>
                </button>
                <button
                    onClick={() => setActiveTab('chargePoints')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center space-x-2 ${activeTab === 'chargePoints' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                >
                    <Zap size={16} />
                    <span>Hardware Terminals ({chargePoints.length})</span>
                </button>
            </div>

            {/* Main Content Node */}
            {loading ? (
                <div className="bg-white rounded-2xl p-16 text-center border border-slate-200/60">
                    <RefreshCw size={32} className="animate-spin mx-auto text-indigo-500 mb-3" />
                    <p className="text-slate-500 font-medium text-sm">Processing verification queues...</p>
                </div>
            ) : activeTab === 'locations' ? (
                /* LOCATIONS LISTING */
                <div className="grid grid-cols-1 gap-4">
                    {locations.length === 0 ? (
                        <div className="bg-white p-12 text-center rounded-2xl text-slate-400 border border-slate-100">No sites submitted for appraisal.</div>
                    ) : (
                        locations.map((loc) => (
                            <div key={loc.id} className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-300 transition-colors">
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs px-2.5 py-0.5 rounded-md font-bold bg-slate-100 text-slate-700 uppercase tracking-wider flex items-center">
                                            <Building2 size={12} className="mr-1" /> {loc.company?.name}
                                        </span>
                                        {loc.isApproved ? (
                                            <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 rounded font-semibold">Live Dataset</span>
                                        ) : (
                                            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 rounded font-semibold">Pending Verification</span>
                                        )}
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-900">{loc.name}</h4>
                                    <p className="text-sm text-slate-500 font-medium">{loc.address}, {loc.postcode}</p>
                                    <div className="text-xs text-slate-400 flex items-center space-x-4 pt-1">
                                        <span className="flex items-center"><Calendar size={12} className="mr-1" /> Sub: {new Date(loc.createdAt).toLocaleDateString()}</span>
                                        <span>• {loc._count?.chargePoints || 0} Terminals Attached</span>
                                    </div>
                                    {loc.rejectionNote && !loc.isApproved && (
                                        <div className="mt-2 text-xs font-medium bg-red-50 text-red-600 p-2.5 rounded-lg border border-red-100 flex items-start">
                                            <MessageSquare size={14} className="mr-1.5 mt-0.5 shrink-0" />
                                            <span><strong>Rejected:</strong> {loc.rejectionNote}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center space-x-3 self-end md:self-center">
                                    <button
                                        disabled={processingId === `location-${loc.id}`}
                                        onClick={() => promptReject('location', loc.id, loc.name)}
                                        className="flex items-center space-x-1 text-xs font-bold px-4 py-2.5 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all disabled:opacity-50"
                                    >
                                        <XCircle size={14} />
                                        <span>{loc.isApproved ? 'Revoke' : 'Reject'}</span>
                                    </button>

                                    {!loc.isApproved && (
                                        <button
                                            disabled={processingId === `location-${loc.id}`}
                                            onClick={() => handleApprove('location', loc.id)}
                                            className="flex items-center space-x-1 text-xs font-bold px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-xl transition-all disabled:opacity-50"
                                        >
                                            <CheckCircle2 size={14} />
                                            <span>Approve & Publish</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                /* CHARGE POINTS LISTING */
                <div className="grid grid-cols-1 gap-4">
                    {chargePoints.length === 0 ? (
                        <div className="bg-white p-12 text-center rounded-2xl text-slate-400 border border-slate-100">No hardware machines submitted for processing.</div>
                    ) : (
                        chargePoints.map((cp) => (
                            <div key={cp.id} className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-300 transition-colors">
                                <div className="space-y-1.5">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-600 font-bold">HW: {cp.hardwareId}</span>
                                        {cp.isApproved ? (
                                            <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 rounded font-semibold">Approved</span>
                                        ) : (
                                            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 rounded font-semibold">Awaiting Approval</span>
                                        )}
                                    </div>
                                    <h4 className="text-base font-bold text-slate-900">Assigned Site: {cp.location?.name || 'Unlinked'}</h4>
                                    <div className="text-xs text-slate-500 font-medium">
                                        Outlets Configured: {cp.connectors?.map(c => `${c.type} (${c.maxPowerKw}kW)`).join(', ') || 'None'}
                                    </div>
                                    {cp.rejectionNote && !cp.isApproved && (
                                        <div className="mt-2 text-xs font-medium bg-red-50 text-red-600 p-2.5 rounded-lg border border-red-100 flex items-start">
                                            <MessageSquare size={14} className="mr-1.5 mt-0.5 shrink-0" />
                                            <span><strong>Rejected:</strong> {cp.rejectionNote}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center space-x-3 self-end md:self-center">
                                    <button
                                        disabled={processingId === `cp-${cp.id}`}
                                        onClick={() => promptReject('cp', cp.id, cp.hardwareId)}
                                        className="flex items-center space-x-1 text-xs font-bold px-4 py-2.5 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all disabled:opacity-50"
                                    >
                                        <XCircle size={14} />
                                        <span>{cp.isApproved ? 'Revoke' : 'Reject'}</span>
                                    </button>

                                    {!cp.isApproved && (
                                        <button
                                            disabled={processingId === `cp-${cp.id}`}
                                            onClick={() => handleApprove('cp', cp.id)}
                                            className="flex items-center space-x-1 text-xs font-bold px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-xl transition-all disabled:opacity-50"
                                        >
                                            <CheckCircle2 size={14} />
                                            <span>Approve Machine</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Rejection Note Modal */}
            {rejectModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setRejectModal({ isOpen: false })}></div>

                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-red-50/50">
                            <h3 className="text-lg font-extrabold text-red-700 flex items-center">
                                <ShieldAlert size={20} className="mr-2" /> Revoke Verification
                            </h3>
                            <button onClick={() => setRejectModal({ isOpen: false })} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 p-1.5 rounded-full transition-colors">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        <form onSubmit={confirmReject} className="p-6 space-y-4">
                            <p className="text-sm font-medium text-slate-600">
                                You are about to reject/revoke <span className="font-bold text-slate-900">"{rejectModal.title}"</span>. Please provide a reason to the operator so they can correct the issue.
                            </p>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Rejection Reason</label>
                                <textarea
                                    required
                                    rows="4"
                                    value={rejectNote}
                                    onChange={(e) => setRejectNote(e.target.value)}
                                    placeholder="e.g., GPS coordinates do not match the provided address..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm transition-all shadow-sm"
                                ></textarea>
                            </div>

                            <div className="flex space-x-3 mt-6 pt-4">
                                <button type="button" onClick={() => setRejectModal({ isOpen: false })} className="flex-1 px-4 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={!rejectNote.trim()} className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50">
                                    Confirm Rejection
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}