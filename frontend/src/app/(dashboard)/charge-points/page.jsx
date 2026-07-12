'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import {
    Plus, Zap, MapPin, Edit2, Trash2, Layers,
    X, AlertCircle, CheckCircle2, Clock, Server
} from 'lucide-react';

export default function ChargePointsPage() {
    const { user } = useAuthStore(); // Grab user context profile securely
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    // Data State
    const [chargePoints, setChargePoints] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [modalMode, setModalMode] = useState(null);
    const [selectedCP, setSelectedCP] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        hardwareId: '',
        locationId: '',
        status: 'UNKNOWN',
        isApproved: false,
        floorLevel: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // Fetch Initial Data Matrix
    const fetchData = async () => {
        setLoading(true);
        try {
            const [cpResponse, locResponse] = await Promise.allSettled([
                api.get('/charge-points'),
                api.get('/locations')
            ]);

            if (cpResponse.status === 'fulfilled' && cpResponse.value.data.success) {
                setChargePoints(cpResponse.value.data.data);
            }
            if (locResponse.status === 'fulfilled' && locResponse.value.data.success) {
                setLocations(locResponse.value.data.data);
            }
        } catch (error) {
            console.error("Failed to sync asset registry configurations:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    // Modal Handlers
    const openModal = (mode, cp = null) => {
        setModalMode(mode);
        setSelectedCP(cp);
        if (cp && mode === 'edit') {
            setFormData({
                hardwareId: cp.hardwareId || '',
                locationId: cp.locationId || '',
                status: cp.status || 'UNKNOWN',
                isApproved: cp.isApproved || false,
                floorLevel: cp.floorLevel || ''
            });
        } else {
            // 🔥 FORCE FALSE ON CREATION: New deployments from company dashboards start as pending moderation
            setFormData({
                hardwareId: '',
                locationId: '',
                status: 'PLANNED',
                isApproved: false,
                floorLevel: ''
            });
        }
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedCP(null);
    };

    // CRUD Operations
    const handleSave = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        // Security Guard Layer: Strip authorization values if a non-admin attempts a profile injection exploit
        const payload = {
            ...formData,
            isApproved: isSuperAdmin ? formData.isApproved : (modalMode === 'edit' ? selectedCP.isApproved : false)
        };

        try {
            if (modalMode === 'create') {
                await api.post('/charge-points', payload);
            } else if (modalMode === 'edit') {
                await api.put(`/charge-points/${selectedCP.id}`, payload);
            }
            fetchData();
            closeModal();
        } catch (error) {
            alert(`Failed to ${modalMode} charge point: ` + (error.response?.data?.message || 'Unknown error'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setSubmitting(true);
        try {
            await api.delete(`/charge-points/${selectedCP.id}`);
            fetchData();
            closeModal();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to drop hardware entity reference.");
        } finally {
            setSubmitting(false);
        }
    };

    // Helper for status badges
    const getStatusBadge = (status) => {
        switch (status) {
            case 'OPERATIONAL': return <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-xs font-bold border border-emerald-200/60 flex items-center w-max"><CheckCircle2 size={12} className="mr-1.5" /> Operational</span>;
            case 'AVAILABLE': return <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-xs font-bold border border-emerald-200/60 flex items-center w-max"><CheckCircle2 size={12} className="mr-1.5" /> Available</span>;
            case 'PLANNED': return <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-bold border border-blue-200/60 flex items-center w-max"><Clock size={12} className="mr-1.5" /> Planned</span>;
            case 'OUT_OF_SERVICE': return <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-md text-xs font-bold border border-amber-200/60 flex items-center w-max"><AlertCircle size={12} className="mr-1.5" /> Out of Service</span>;
            case 'FAULTED': return <span className="px-2.5 py-0.5 bg-red-50 text-red-700 rounded-md text-xs font-bold border border-red-200/60 flex items-center w-max"><X size={12} className="mr-1.5" /> Faulted</span>;
            default: return <span className="px-2.5 py-0.5 bg-gray-50 text-gray-700 rounded-md text-xs font-bold border border-gray-200 flex items-center w-max">{status || 'UNKNOWN'}</span>;
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">

            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
                <div className="flex items-center space-x-4">
                    <div className="p-3.5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl text-blue-600 ring-1 ring-blue-200/50 shadow-inner">
                        <Zap size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Hardware Assets</h2>
                        <p className="text-sm text-slate-500 mt-0.5 font-medium">Manage physical chargers, deployment floor ranges, and hardware IDs</p>
                    </div>
                </div>

                <button
                    onClick={() => openModal('create')}
                    className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg font-semibold active:scale-95"
                >
                    <Plus size={18} strokeWidth={2.5} />
                    <span>Deploy Charger</span>
                </button>
            </div>

            {/* Main Table Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Hardware ID</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Host Location</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Floor Placement</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Operator</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Platform Auth</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-16 text-center text-slate-400">
                                        <Zap size={32} className="animate-pulse mx-auto mb-3 text-blue-400" />
                                        <p className="text-sm font-medium">Synchronizing active asset structures...</p>
                                    </td>
                                </tr>
                            ) : chargePoints.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-16 text-center text-slate-500">
                                        <Server size={36} className="mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
                                        <p className="text-base font-bold text-slate-900">No hardware deployed</p>
                                        <p className="text-sm mt-1">Deploy your first charge point to map out routing parameters.</p>
                                    </td>
                                </tr>
                            ) : (
                                chargePoints.map((cp) => (
                                    <tr key={cp.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm font-bold text-slate-900 font-mono">
                                                <Server size={14} className="mr-2 text-slate-400" />
                                                {cp.hardwareId}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm text-slate-700 font-semibold">
                                                <MapPin size={13} className="mr-2 text-blue-500" />
                                                {cp.location?.name || <span className="text-red-400 font-medium italic">Orphaned Station</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-xs font-bold text-slate-500">
                                                <Layers size={13} className="mr-1.5 text-slate-400" />
                                                {cp.floorLevel ? `Floor ${cp.floorLevel}` : <span className="font-normal text-slate-400 italic">Ground Level</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-600">
                                            {cp.location?.company?.name || '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(cp.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {cp.isApproved ? (
                                                <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md flex items-center text-xs font-black w-max"><CheckCircle2 size={13} className="mr-1" /> Verified</span>
                                            ) : (
                                                <span className="text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-md flex items-center text-xs font-black w-max"><Clock size={13} className="mr-1" /> Pending</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openModal('edit', cp)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Configure">
                                                    <Edit2 size={16} strokeWidth={2.5} />
                                                </button>
                                                <button onClick={() => openModal('delete', cp)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Decommission">
                                                    <Trash2 size={16} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Dynamic Dialog Modal */}
            {modalMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={closeModal}></div>

                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-150 bg-slate-50/50">
                            <h3 className="text-lg font-black text-slate-900">
                                {modalMode === 'create' && 'Deploy New Hardware'}
                                {modalMode === 'edit' && 'Configure Hardware Scope'}
                                {modalMode === 'delete' && 'Decommission Asset'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 p-1.5 rounded-full transition-colors">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Form Content Elements */}
                        {(modalMode === 'create' || modalMode === 'edit') && (
                            <form onSubmit={handleSave} className="p-6 space-y-5">
                                {locations.length === 0 && (
                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3 text-amber-800 text-sm">
                                        <AlertCircle size={18} className="shrink-0 text-amber-500 mt-0.5" />
                                        <p className="font-medium">No Host Locations discovered. You must populate an active operational mapping context site before mapping hardware entries.</p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Hardware Serial ID</label>
                                    <input
                                        type="text" required
                                        value={formData.hardwareId}
                                        onChange={(e) => setFormData({ ...formData, hardwareId: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 font-mono text-sm font-semibold transition-all shadow-2xs"
                                        placeholder="e.g. GB*CEV*E5f40193"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Host Target Location Node</label>
                                    <select
                                        required
                                        value={formData.locationId}
                                        onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm font-bold text-slate-700 shadow-2xs"
                                    >
                                        <option value="" disabled>Select physical installation hub...</option>
                                        {locations.map(loc => (
                                            <option key={loc.id} value={loc.id}>{loc.name} ({loc.postal_code || loc.postcode})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Operational Status</label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs font-bold text-slate-700 shadow-2xs"
                                        >
                                            <option value="UNKNOWN">UNKNOWN</option>
                                            <option value="AVAILABLE">AVAILABLE</option>
                                            <option value="PLANNED">PLANNED / BUILD</option>
                                            <option value="OUT_OF_SERVICE">OUT OF SERVICE</option>
                                            <option value="FAULTED">HARDWARE FAULTED</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Floor Level Context</label>
                                        <input
                                            type="text"
                                            value={formData.floorLevel}
                                            onChange={(e) => setFormData({ ...formData, floorLevel: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs font-semibold shadow-2xs"
                                            placeholder="e.g. -1, Ground, 2"
                                        />
                                    </div>
                                </div>

                                {/* 🔥 FIXED ACTION CONTROL GATED BY SECURE SYSTEM ROLE CALLS */}
                                {modalMode === 'edit' && isSuperAdmin && (
                                    <div className="pt-2 animate-in slide-in-from-top-2 duration-200">
                                        <label className="flex items-center space-x-3 cursor-pointer group w-fit">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.isApproved ? 'bg-blue-600 border-blue-600' : 'bg-slate-50 border-slate-300'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.isApproved}
                                                    onChange={(e) => setFormData({ ...formData, isApproved: e.target.checked })}
                                                    className="hidden"
                                                />
                                                {formData.isApproved && <CheckCircle2 size={14} className="text-white" strokeWidth={3} />}
                                            </div>
                                            <span className="text-sm text-slate-700 font-extrabold select-none">Authorize broadcast vectors to live maps</span>
                                        </label>
                                    </div>
                                )}

                                <div className="flex space-x-3 mt-8 pt-4 border-t border-slate-100">
                                    <button type="button" onClick={closeModal} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={submitting || locations.length === 0} className="flex-1 px-4 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all shadow-md">
                                        {submitting ? 'Processing...' : 'Commit Hardware State'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Delete Confirm */}
                        {modalMode === 'delete' && selectedCP && (
                            <div className="p-8">
                                <div className="flex flex-col items-center text-center space-y-4 mb-8">
                                    <div className="h-16 w-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 mb-2 ring-8 ring-rose-50/40">
                                        <Trash2 size={32} />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black text-slate-900">Decommission Asset?</h4>
                                        <p className="text-xs text-slate-400 mt-2 max-w-sm font-semibold leading-relaxed">
                                            You are executing decommissioning procedures on serial entry: <span className="font-mono font-black text-slate-800">"{selectedCP.hardwareId}"</span>. Attached connector parameters must be detached prior to processing deletion cycles.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex space-x-3">
                                    <button onClick={closeModal} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                                    <button onClick={handleDelete} disabled={submitting} className="flex-1 px-4 py-2.5 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 transition-all shadow-md">
                                        {submitting ? 'Dropping...' : 'Confirm Decommission'}
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
}