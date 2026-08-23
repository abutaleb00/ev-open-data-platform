'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import {
    Plus, Zap, MapPin, Edit2, Trash2, Layers,
    X, AlertCircle, CheckCircle2, Clock, Server,
    Eye, Info, Building2, Navigation, Plug
} from 'lucide-react';

export default function ChargePointsPage() {
    const { user } = useAuthStore();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    // Data States
    const [chargePoints, setChargePoints] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal Control States
    const [modalMode, setModalMode] = useState(null); // 'create', 'edit', 'delete', 'details'
    const [selectedCP, setSelectedCP] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    // Form State
    const [formData, setFormData] = useState({
        hardwareId: '',
        evseUid: '',
        locationId: '',
        status: 'AVAILABLE',
        isApproved: false,
        floorLevel: '',
        physicalReference: '',
        parkingRestrictions: '',
        capabilities: 'REMOTE_START_STOP_CAPABLE',
        evseLatitude: '',
        evseLongitude: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // Fetch Initial Data
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
        setActiveTab('overview');

        if (cp && (mode === 'edit' || mode === 'details')) {
            setFormData({
                hardwareId: cp.hardwareId || '',
                evseUid: cp.evseUid || '',
                locationId: cp.locationId || '',
                status: cp.status || 'AVAILABLE',
                isApproved: cp.isApproved || false,
                floorLevel: cp.floorLevel || '',
                physicalReference: cp.physicalReference || '',
                parkingRestrictions: Array.isArray(cp.parkingRestrictions) ? cp.parkingRestrictions.join(', ') : cp.parkingRestrictions || '',
                capabilities: Array.isArray(cp.capabilities) ? cp.capabilities.join(', ') : cp.capabilities || 'REMOTE_START_STOP_CAPABLE',
                evseLatitude: cp.evseLatitude || '',
                evseLongitude: cp.evseLongitude || ''
            });
        } else {
            setFormData({
                hardwareId: '',
                evseUid: '',
                locationId: '',
                status: 'AVAILABLE',
                isApproved: false,
                floorLevel: '',
                physicalReference: '',
                parkingRestrictions: '',
                capabilities: 'REMOTE_START_STOP_CAPABLE',
                evseLatitude: '',
                evseLongitude: ''
            });
        }
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedCP(null);
    };

    // Save Action
    const handleSave = async (e) => {
        e.preventDefault();
        setSubmitting(true);

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

    // Delete Action
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

    const getStatusBadge = (status) => {
        switch (status) {
            case 'OPERATIONAL':
            case 'AVAILABLE':
            case 'CHARGING':
                return <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black border border-emerald-200 flex items-center w-max"><CheckCircle2 size={11} className="mr-1" /> {status}</span>;
            case 'PLANNED':
            case 'INOPERATIVE':
                return <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black border border-blue-200 flex items-center w-max"><Clock size={11} className="mr-1" /> {status}</span>;
            case 'OUT_OF_SERVICE':
            case 'BLOCKED':
                return <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-black border border-amber-200 flex items-center w-max"><AlertCircle size={11} className="mr-1" /> {status}</span>;
            case 'FAULTED':
                return <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 rounded-full text-[10px] font-black border border-rose-200 flex items-center w-max"><X size={11} className="mr-1" /> FAULTED</span>;
            default:
                return <span className="px-2.5 py-0.5 bg-slate-50 text-slate-700 rounded-full text-[10px] font-black border border-slate-200 flex items-center w-max">{status || 'UNKNOWN'}</span>;
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 select-none">

            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center space-x-4">
                    <div className="p-3.5 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100 shadow-2xs">
                        <Zap size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Hardware Charge Points (EVSEs)</h2>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">Manage physical charge points, connectors, and OCPI hardware capabilities</p>
                    </div>
                </div>

                <button
                    onClick={() => openModal('create')}
                    className="flex cursor-pointer items-center justify-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 text-xs font-black uppercase tracking-wider transition-all shadow-2xs active:scale-95"
                >
                    <Plus size={14} strokeWidth={2.5} />
                    <span>Deploy Charger</span>
                </button>
            </div>

            {/* Main Table Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Hardware ID & UID</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Host Site Location</th>
                                <th scope="col" className="px-6 py-4 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Plugs (Connectors)</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Operator</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Auth Status</th>
                                <th scope="col" className="px-6 py-4 text-right text-[11px] font-black text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-16 text-center text-slate-400">
                                        <Zap size={24} className="animate-spin mx-auto mb-3 text-indigo-500" />
                                        <p className="text-xs font-bold uppercase tracking-wider animate-pulse">Loading hardware registry...</p>
                                    </td>
                                </tr>
                            ) : chargePoints.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-16 text-center text-slate-500">
                                        <Server size={36} className="mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
                                        <p className="text-sm font-black text-slate-900">No EVSE hardware deployed</p>
                                    </td>
                                </tr>
                            ) : (
                                chargePoints.map((cp) => (
                                    <tr key={cp.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <div className="flex items-center text-sm font-black text-slate-900 font-mono">
                                                    <Server size={14} className="mr-2 text-slate-400 shrink-0" />
                                                    {cp.hardwareId}
                                                </div>
                                                <div className="flex items-center space-x-2 mt-0.5">
                                                    <span className="text-[10px] font-mono text-slate-400">UID: {cp.evseUid}</span>
                                                    {cp.floorLevel && (
                                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                                            Floor {cp.floorLevel}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <div className="flex items-center text-xs font-extrabold text-slate-800">
                                                    <MapPin size={13} className="mr-1.5 text-indigo-500 shrink-0" />
                                                    {cp.locationName}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                <Plug size={12} className="mr-1" />
                                                {cp.connectorsCount ?? cp.connectors?.length ?? 0} Plugs
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs font-extrabold text-slate-700">
                                            <div className="flex items-center">
                                                <Building2 size={13} className="mr-1.5 text-slate-400 shrink-0" />
                                                {cp.companyName}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(cp.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {cp.isApproved ? (
                                                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center text-[10px] font-black w-max">
                                                    <CheckCircle2 size={11} className="mr-1" /> Verified
                                                </span>
                                            ) : (
                                                <span className="text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full flex items-center text-[10px] font-black w-max">
                                                    <Clock size={11} className="mr-1" /> Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-1">
                                                <button onClick={() => openModal('details', cp)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" title="View Full Specs">
                                                    <Eye size={15} />
                                                </button>
                                                <button onClick={() => openModal('edit', cp)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer" title="Configure Unit">
                                                    <Edit2 size={15} />
                                                </button>
                                                <button onClick={() => openModal('delete', cp)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Decommission">
                                                    <Trash2 size={15} />
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

            {/* Modals Container */}
            {modalMode && (
                <div className="fixed inset-0 z-40 flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity" onClick={closeModal}></div>

                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 z-50">

                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                {modalMode === 'create' && 'Deploy EVSE Hardware Unit'}
                                {modalMode === 'edit' && 'Configure Hardware Properties'}
                                {modalMode === 'details' && 'EVSE Specifications & Connectors'}
                                {modalMode === 'delete' && 'Confirm Decommission Protocol'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-lg transition-colors cursor-pointer">
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Details Modal */}
                        {modalMode === 'details' && selectedCP && (
                            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

                                {/* Header */}
                                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                                    <div>
                                        <h3 className="text-base font-mono font-black text-slate-900">{selectedCP.hardwareId}</h3>
                                        <span className="text-[10px] font-mono text-slate-400">UID: {selectedCP.evseUid}</span>
                                    </div>
                                    {getStatusBadge(selectedCP.status)}
                                </div>

                                {/* Tabs Navigation */}
                                <div className="flex border-b border-slate-100 gap-4">
                                    <button
                                        onClick={() => setActiveTab('overview')}
                                        className={`pb-2 text-xs font-black uppercase tracking-wider cursor-pointer border-b-2 transition-all ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'
                                            }`}
                                    >
                                        Hardware Specs
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('connectors')}
                                        className={`pb-2 text-xs font-black uppercase tracking-wider cursor-pointer border-b-2 transition-all ${activeTab === 'connectors' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'
                                            }`}
                                    >
                                        Plugs & Tariffs ({selectedCP.connectors?.length || 0})
                                    </button>
                                </div>

                                {/* TAB 1: OVERVIEW */}
                                {activeTab === 'overview' && (
                                    <div className="space-y-4 text-xs">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="text-[9px] font-black uppercase text-slate-400">Host Site Location</span>
                                                <p className="font-bold text-slate-800 mt-0.5">{selectedCP.locationName}</p>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="text-[9px] font-black uppercase text-slate-400">Operator Company</span>
                                                <p className="font-bold text-slate-800 mt-0.5">{selectedCP.companyName}</p>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="text-[9px] font-black uppercase text-slate-400">Floor Level Placement</span>
                                                <p className="font-bold text-slate-800 mt-0.5">{selectedCP.floorLevel || 'Ground Level'}</p>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="text-[9px] font-black uppercase text-slate-400">Coordinates</span>
                                                <p className="font-mono font-bold text-slate-800 mt-0.5">
                                                    {selectedCP.evseLatitude || 'Default'}, {selectedCP.evseLongitude || 'Default'}
                                                </p>
                                            </div>
                                        </div>

                                        {selectedCP.capabilities && selectedCP.capabilities.length > 0 && (
                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">OCPI Capabilities</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {selectedCP.capabilities.map((cap, idx) => (
                                                        <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-700">
                                                            {cap}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 2: CONNECTORS */}
                                {activeTab === 'connectors' && (
                                    <div className="space-y-3">
                                        {selectedCP.connectors && selectedCP.connectors.length > 0 ? (
                                            selectedCP.connectors.map((conn) => (
                                                <div key={conn.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                                                    <div className="flex items-center justify-between text-xs font-bold">
                                                        <span className="font-mono text-indigo-900">{conn.standard} ({conn.format})</span>
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 text-indigo-800 uppercase">
                                                            {conn.maxPowerKw} kW • {conn.powerType}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                                                        <div>Voltage: <b>{conn.voltage}V</b></div>
                                                        <div>Amperage: <b>{conn.amperage}A</b></div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-center text-slate-400 text-xs py-8">No connectors attached to this hardware unit.</p>
                                        )}
                                    </div>
                                )}

                                <div className="pt-4 border-t border-slate-100 flex justify-end">
                                    <button onClick={closeModal} className="px-5 py-2 bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-slate-800 cursor-pointer">
                                        Close Specs
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Form Area (Create / Edit) */}
                        {(modalMode === 'create' || modalMode === 'edit') && (
                            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">

                                {locations.length === 0 && (
                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3 text-amber-800 text-xs font-semibold">
                                        <AlertCircle size={18} className="shrink-0 text-amber-500 mt-0.5" />
                                        <p>No Host Locations found. You must register an operational location site before deploying hardware units.</p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Hardware Serial ID</label>
                                    <input
                                        type="text" required
                                        value={formData.hardwareId}
                                        onChange={(e) => setFormData({ ...formData, hardwareId: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 focus:bg-white focus:border-slate-400 outline-none"
                                        placeholder="e.g. *Ada*EGBEV0667A1"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Host Target Location Site</label>
                                    <select
                                        required
                                        value={formData.locationId}
                                        onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white outline-none cursor-pointer"
                                    >
                                        <option value="" disabled>Select physical installation hub...</option>
                                        {locations.map(loc => (
                                            <option key={loc.id} value={loc.id}>{loc.name} ({loc.postcode || loc.postal_code})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Operational Status</label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                                        >
                                            <option value="AVAILABLE">AVAILABLE</option>
                                            <option value="OPERATIONAL">OPERATIONAL</option>
                                            <option value="CHARGING">CHARGING</option>
                                            <option value="PLANNED">PLANNED / BUILD</option>
                                            <option value="OUT_OF_SERVICE">OUT OF SERVICE</option>
                                            <option value="FAULTED">FAULTED</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Floor Level Context</label>
                                        <input
                                            type="text"
                                            value={formData.floorLevel}
                                            onChange={(e) => setFormData({ ...formData, floorLevel: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
                                            placeholder="e.g. Ground, Floor -1"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Latitude Override</label>
                                        <input
                                            type="number" step="any"
                                            value={formData.evseLatitude}
                                            onChange={(e) => setFormData({ ...formData, evseLatitude: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-semibold outline-none"
                                            placeholder="Optional override"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Longitude Override</label>
                                        <input
                                            type="number" step="any"
                                            value={formData.evseLongitude}
                                            onChange={(e) => setFormData({ ...formData, evseLongitude: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-semibold outline-none"
                                            placeholder="Optional override"
                                        />
                                    </div>
                                </div>

                                {modalMode === 'edit' && isSuperAdmin && (
                                    <div className="pt-2">
                                        <label className="flex items-center space-x-3 cursor-pointer group w-fit">
                                            <input
                                                type="checkbox"
                                                checked={formData.isApproved}
                                                onChange={(e) => setFormData({ ...formData, isApproved: e.target.checked })}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-xs font-black text-slate-700 uppercase tracking-wide select-none">Authorize broadcast vectors to live maps</span>
                                        </label>
                                    </div>
                                )}

                                <div className="flex space-x-3 pt-4 border-t border-slate-100 mt-6">
                                    <button type="button" onClick={closeModal} className="flex-1 py-2 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={submitting || locations.length === 0} className="flex-1 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-800 transition-all shadow-sm cursor-pointer">
                                        {submitting ? 'Processing...' : 'Commit Hardware State'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Delete Confirmation */}
                        {modalMode === 'delete' && selectedCP && (
                            <div className="p-6 space-y-6">
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <div className="h-14 w-14 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 shadow-inner">
                                        <AlertCircle size={26} />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-black text-slate-900">Decommission Asset?</h4>
                                        <p className="text-xs text-slate-400 mt-2 max-w-sm font-semibold leading-relaxed">
                                            Warning: Decommissioning serial entry: <span className="font-mono font-black text-slate-800">"{selectedCP.hardwareId}"</span> will purge all associated connectors.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex space-x-3 pt-4 border-t border-slate-100">
                                    <button onClick={closeModal} className="flex-1 py-2 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">Cancel</button>
                                    <button onClick={handleDelete} disabled={submitting} className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer">
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