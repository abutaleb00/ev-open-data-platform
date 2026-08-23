'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import {
    Plus, Zap, Edit2, Trash2, X, Info,
    AlertCircle, CheckCircle2, XCircle, Clock,
    Layers, DollarSign, Cpu, MapPin, Plug, Server, Eye, Building2
} from 'lucide-react';

export default function ConnectorsPage() {
    // Data States
    const [connectors, setConnectors] = useState([]);
    const [chargePoints, setChargePoints] = useState([]);
    const [tariffs, setTariffs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [modalMode, setModalMode] = useState(null); // 'create', 'edit', 'delete', 'details'
    const [selectedConn, setSelectedConn] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        type: '',
        maxPowerKw: '',
        status: 'AVAILABLE',
        chargePointId: '',
        tariffId: '',
        standard: 'IEC_62196_T2',
        format: 'SOCKET',
        powerType: 'AC_3_PHASE',
        voltage: '230',
        amperage: '32',
        connectorUid: '',
        termsAndConditions: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // Fetch Initial Data Matrices
    const fetchData = async () => {
        setLoading(true);
        try {
            const [connResponse, cpResponse, tariffResponse] = await Promise.allSettled([
                api.get('/connectors'),
                api.get('/charge-points'),
                api.get('/tariffs')
            ]);

            if (connResponse.status === 'fulfilled' && connResponse.value.data.success) {
                setConnectors(connResponse.value.data.data);
            }
            if (cpResponse.status === 'fulfilled' && cpResponse.value.data.success) {
                setChargePoints(cpResponse.value.data.data);
            }
            if (tariffResponse.status === 'fulfilled' && tariffResponse.value.data.success) {
                setTariffs(tariffResponse.value.data.data);
            }
        } catch (error) {
            console.error("Failed to sync connectors configuration profiles:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Modal Handlers
    const openModal = (mode, conn = null) => {
        setModalMode(mode);
        setSelectedConn(conn);
        if (conn && (mode === 'edit' || mode === 'details')) {
            setFormData({
                type: conn.type || '',
                maxPowerKw: conn.maxPowerKw || '',
                status: conn.status || 'AVAILABLE',
                chargePointId: conn.chargePointId || '',
                tariffId: conn.tariffId || '',
                standard: conn.standard || 'IEC_62196_T2',
                format: conn.format || 'SOCKET',
                powerType: conn.powerType || 'AC_3_PHASE',
                voltage: conn.voltage?.toString() || '230',
                amperage: conn.amperage?.toString() || '32',
                connectorUid: conn.connectorUid || '',
                termsAndConditions: conn.termsAndConditions || ''
            });
        } else {
            setFormData({
                type: '', maxPowerKw: '', status: 'AVAILABLE', chargePointId: '', tariffId: '',
                standard: 'IEC_62196_T2', format: 'SOCKET', powerType: 'AC_3_PHASE', voltage: '230', amperage: '32',
                connectorUid: '', termsAndConditions: ''
            });
        }
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedConn(null);
    };

    // Auto-Configure Smart Defaults based on Interface Selection
    const handleInterfaceChange = (typeVal) => {
        let defaults = { type: typeVal };
        if (typeVal === 'CCS') {
            defaults = { ...defaults, standard: 'IEC_62196_T2_COMBO', format: 'CABLE', powerType: 'DC', voltage: '400', amperage: '125', maxPowerKw: '50' };
        } else if (typeVal === 'CHADEMO') {
            defaults = { ...defaults, standard: 'CHADEMO', format: 'CABLE', powerType: 'DC', voltage: '400', amperage: '125', maxPowerKw: '50' };
        } else if (typeVal === 'TYPE_2') {
            defaults = { ...defaults, standard: 'IEC_62196_T2', format: 'SOCKET', powerType: 'AC_3_PHASE', voltage: '230', amperage: '32', maxPowerKw: '22' };
        }
        setFormData(prev => ({ ...prev, ...defaults }));
    };

    // CRUD Operations
    const handleSave = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const payload = {
            ...formData,
            maxPowerKw: parseFloat(formData.maxPowerKw),
            voltage: parseInt(formData.voltage, 10),
            amperage: parseInt(formData.amperage, 10),
            tariffId: formData.tariffId ? parseInt(formData.tariffId, 10) : null,
            chargePointId: formData.chargePointId ? parseInt(formData.chargePointId, 10) : undefined
        };

        try {
            if (modalMode === 'create') {
                await api.post('/connectors', payload);
            } else if (modalMode === 'edit') {
                await api.put(`/connectors/${selectedConn.id}`, payload);
            }
            fetchData();
            closeModal();
        } catch (error) {
            alert(`Failed to ${modalMode} connector configuration: ` + (error.response?.data?.message || 'Unknown error'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setSubmitting(true);
        try {
            await api.delete(`/connectors/${selectedConn.id}`);
            fetchData();
            closeModal();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to drop hardware connector entry.");
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'AVAILABLE':
            case 'OPERATIONAL':
                return <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 border border-emerald-200 rounded-full text-[10px] font-black flex items-center w-max"><CheckCircle2 size={11} className="mr-1" /> Available</span>;
            case 'OCCUPIED':
            case 'CHARGING':
                return <span className="text-blue-700 bg-blue-50 px-2.5 py-0.5 border border-blue-200 rounded-full text-[10px] font-black flex items-center w-max"><Zap size={11} className="mr-1" /> Charging</span>;
            case 'FAULTED':
            case 'UNAVAILABLE':
                return <span className="text-rose-700 bg-rose-50 px-2.5 py-0.5 border border-rose-200 rounded-full text-[10px] font-black flex items-center w-max"><XCircle size={11} className="mr-1" /> Faulted</span>;
            default:
                return <span className="text-slate-500 bg-slate-50 px-2.5 py-0.5 border border-slate-200 rounded-full text-[10px] font-black flex items-center w-max"><Clock size={11} className="mr-1" /> Offline</span>;
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 select-none">

            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center space-x-4">
                    <div className="p-3.5 bg-amber-50 rounded-xl text-amber-600 border border-amber-100 shadow-2xs">
                        <Plug size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Connectors & Plugs</h2>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">Configure physical power nozzle interfaces, structural standards, and tariffs</p>
                    </div>
                </div>

                <button
                    onClick={() => openModal('create')}
                    className="flex cursor-pointer items-center justify-center space-x-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 text-xs font-black uppercase tracking-wider transition-all shadow-2xs active:scale-95"
                >
                    <Plus size={14} strokeWidth={2.5} />
                    <span>Add Connector</span>
                </button>
            </div>

            {/* Main Table Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Connector Plug Scope</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">OCPI Standard Properties</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Hardware Carrier</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Capacity Grid</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Live Status</th>
                                <th scope="col" className="px-6 py-4 text-right text-[11px] font-black text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-16 text-center text-slate-400">
                                        <Zap size={24} className="animate-spin mx-auto mb-3 text-amber-500" />
                                        <p className="text-xs font-bold uppercase tracking-wider animate-pulse">Loading hardware connectors...</p>
                                    </td>
                                </tr>
                            ) : connectors.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-16 text-center text-slate-500">
                                        <Layers size={36} className="mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
                                        <p className="text-sm font-black text-slate-900">No connectors configured</p>
                                    </td>
                                </tr>
                            ) : (
                                connectors.map((conn) => (
                                    <tr key={conn.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-900 uppercase tracking-wide">
                                                    {conn.type ? conn.type.replace('_', ' ') : 'STANDARD PLUG'}
                                                </span>
                                                <span className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">
                                                    UID: #{conn.connectorUid || conn.id}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col text-xs font-extrabold text-slate-700">
                                                <span className="font-mono text-[11px] text-indigo-600">{conn.standard}</span>
                                                <span className="text-slate-400 font-medium mt-0.5">{conn.format} • {conn.powerType} ({conn.voltage}V / {conn.amperage}A)</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <div className="flex items-center text-xs font-bold text-slate-800 font-mono">
                                                    <Server size={13} className="mr-1.5 text-slate-400 shrink-0" />
                                                    {conn.hardwareId}
                                                </div>
                                                <div className="flex items-center text-[10px] text-slate-400 font-semibold mt-0.5">
                                                    <MapPin size={11} className="mr-1 text-slate-400 shrink-0" />
                                                    {conn.locationName}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-extrabold text-slate-900">{conn.maxPowerKw} <span className="text-xs text-slate-400 font-medium uppercase">kW</span></span>
                                                {conn.tariff?.name ? (
                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 mt-1 flex items-center w-max">
                                                        <DollarSign size={10} /> {conn.tariff.name} ({conn.tariff.pricePerKwh} {conn.tariff.currency})
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-medium text-slate-400 italic mt-1">Unassigned Tariff</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(conn.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-1">
                                                <button onClick={() => openModal('details', conn)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" title="View Full Specs">
                                                    <Eye size={15} />
                                                </button>
                                                <button onClick={() => openModal('edit', conn)} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" title="Configure Plug">
                                                    <Edit2 size={15} />
                                                </button>
                                                <button onClick={() => openModal('delete', conn)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Drop Plug">
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
                                {modalMode === 'create' && 'Map New Output Connector'}
                                {modalMode === 'edit' && 'Configure Connector Properties'}
                                {modalMode === 'details' && 'Connector Output Specifications'}
                                {modalMode === 'delete' && 'Drop Connector Endpoint'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-lg transition-colors cursor-pointer">
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Details Modal */}
                        {modalMode === 'details' && selectedConn && (
                            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                                    <div>
                                        <h3 className="text-base font-black text-slate-900 uppercase">{selectedConn.type} Interface Plug</h3>
                                        <span className="text-[10px] font-mono text-slate-400">UID: #{selectedConn.connectorUid || selectedConn.id}</span>
                                    </div>
                                    {getStatusBadge(selectedConn.status)}
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="text-[9px] font-black uppercase text-slate-400">OCPI Standard</span>
                                        <p className="font-mono font-bold text-indigo-900 mt-0.5">{selectedConn.standard}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="text-[9px] font-black uppercase text-slate-400">Plug Format</span>
                                        <p className="font-bold text-slate-800 mt-0.5">{selectedConn.format}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="text-[9px] font-black uppercase text-slate-400">Max Capacity</span>
                                        <p className="font-bold text-slate-800 mt-0.5">{selectedConn.maxPowerKw} kW ({selectedConn.powerType})</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="text-[9px] font-black uppercase text-slate-400">Voltage / Current</span>
                                        <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedConn.voltage}V / {selectedConn.amperage}A</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 sm:col-span-2">
                                        <span className="text-[9px] font-black uppercase text-slate-400">Parent Hardware Machine</span>
                                        <p className="font-bold text-slate-800 mt-0.5">{selectedConn.hardwareId} — {selectedConn.locationName}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 sm:col-span-2">
                                        <span className="text-[9px] font-black uppercase text-slate-400">Assigned Revenue Tariff</span>
                                        <p className="font-bold text-slate-800 mt-0.5">
                                            {selectedConn.tariff?.name ? `${selectedConn.tariff.name} (${selectedConn.tariff.pricePerKwh} ${selectedConn.tariff.currency}/kWh)` : 'No Tariff Assigned (Free Option)'}
                                        </p>
                                    </div>
                                </div>

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

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {modalMode === 'create' && (
                                        <div>
                                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Parent Hardware Machine</label>
                                            <select
                                                required
                                                value={formData.chargePointId}
                                                onChange={(e) => setFormData({ ...formData, chargePointId: e.target.value })}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                                            >
                                                <option value="" disabled>Select parent EVSE...</option>
                                                {chargePoints.map(cp => (
                                                    <option key={cp.id} value={cp.id}>{cp.hardwareId} ({cp.locationName || 'Site'})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Interface Plug Standard</label>
                                        <select
                                            required
                                            value={formData.type}
                                            onChange={(e) => handleInterfaceChange(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                                        >
                                            <option value="" disabled>Select port plug type...</option>
                                            <option value="CCS">CCS (DC Combo Nozzle)</option>
                                            <option value="TYPE_2">TYPE 2 (AC Socket Nozzle)</option>
                                            <option value="CHADEMO">CHADEMO (DC Fast Nozzle)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* OCPI Parameters Block */}
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                                    <p className="text-[10px] font-black tracking-widest text-indigo-600 uppercase flex items-center"><Info size={12} className="mr-1" /> OCPI Protocol Parameters</p>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Standard</label>
                                            <select
                                                value={formData.standard}
                                                onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
                                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                                            >
                                                <option value="IEC_62196_T2">IEC_62196_T2</option>
                                                <option value="IEC_62196_T2_COMBO">IEC_62196_T2_COMBO</option>
                                                <option value="CHADEMO">CHADEMO</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Format</label>
                                            <select
                                                value={formData.format}
                                                onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                                            >
                                                <option value="SOCKET">SOCKET (Un-tethered)</option>
                                                <option value="CABLE">CABLE (Tethered Line)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Power Phase</label>
                                            <select
                                                value={formData.powerType}
                                                onChange={(e) => setFormData({ ...formData, powerType: e.target.value })}
                                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                                            >
                                                <option value="AC_1_PHASE">AC Single Phase</option>
                                                <option value="AC_3_PHASE">AC Three Phase</option>
                                                <option value="DC">DC Direct</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Max Power (kW)</label>
                                            <input
                                                type="number" step="any" required
                                                value={formData.maxPowerKw}
                                                onChange={(e) => setFormData({ ...formData, maxPowerKw: e.target.value })}
                                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800 outline-none"
                                                placeholder="22"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Voltage (V)</label>
                                            <input
                                                type="number" required
                                                value={formData.voltage}
                                                onChange={(e) => setFormData({ ...formData, voltage: e.target.value })}
                                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-800 outline-none"
                                                placeholder="230"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Amperage (A)</label>
                                            <input
                                                type="number" required
                                                value={formData.amperage}
                                                onChange={(e) => setFormData({ ...formData, amperage: e.target.value })}
                                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-800 outline-none"
                                                placeholder="32"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Live Status State</label>
                                        <select
                                            required
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                                        >
                                            <option value="AVAILABLE">AVAILABLE</option>
                                            <option value="OCCUPIED">OCCUPIED / CHARGING</option>
                                            <option value="FAULTED">FAULTED</option>
                                            <option value="OFFLINE">OFFLINE</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Assigned Revenue Tariff</label>
                                        <select
                                            value={formData.tariffId}
                                            onChange={(e) => setFormData({ ...formData, tariffId: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                                        >
                                            <option value="">No Billing (Free Option)</option>
                                            {tariffs.map(t => (
                                                <option key={t.id} value={t.id}>{t.name} ({t.pricePerKwh} {t.currency}/kWh)</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex space-x-3 pt-4 border-t border-slate-100 mt-6">
                                    <button type="button" onClick={closeModal} className="flex-1 py-2 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={submitting} className="flex-1 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-800 transition-all shadow-sm cursor-pointer">
                                        {submitting ? 'Synchronizing...' : 'Commit Configuration'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Delete Confirmation */}
                        {modalMode === 'delete' && selectedConn && (
                            <div className="p-6 space-y-6">
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <div className="h-14 w-14 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 shadow-inner">
                                        <AlertCircle size={26} />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-black text-slate-900">Drop Connector Plug?</h4>
                                        <p className="text-xs text-slate-400 mt-2 max-w-sm font-semibold leading-relaxed">
                                            Warning: You are about to permanently drop connector plug <span className="font-bold text-slate-800">#{selectedConn.id}</span>.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex space-x-3 pt-4 border-t border-slate-100">
                                    <button onClick={closeModal} className="flex-1 py-2 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">Cancel</button>
                                    <button onClick={handleDelete} disabled={submitting} className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer">
                                        {submitting ? 'Dropping...' : 'Confirm Drop'}
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