'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import {
    Plus, Zap, Edit2, Trash2, X, Info,
    AlertCircle, CheckCircle2, XCircle, Clock,
    Layers, DollarSign, Cpu, Settings
} from 'lucide-react';

export default function ConnectorsPage() {
    // Data State
    const [connectors, setConnectors] = useState([]);
    const [chargePoints, setChargePoints] = useState([]);
    const [tariffs, setTariffs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [modalMode, setModalMode] = useState(null);
    const [selectedConn, setSelectedConn] = useState(null);

    // Form State (Fully populated with dynamic OCPI specs matching schema)
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
        amperage: '32'
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
        if (conn && mode === 'edit') {
            setFormData({
                type: conn.type,
                maxPowerKw: conn.maxPowerKw,
                status: conn.status,
                chargePointId: conn.chargePointId,
                tariffId: conn.tariffId || '',
                standard: conn.standard || 'IEC_62196_T2',
                format: conn.format || 'SOCKET',
                powerType: conn.powerType || 'AC_3_PHASE',
                voltage: conn.voltage?.toString() || '230',
                amperage: conn.amperage?.toString() || '32'
            });
        } else {
            setFormData({
                type: '', maxPowerKw: '', status: 'AVAILABLE', chargePointId: '', tariffId: '',
                standard: 'IEC_62196_T2', format: 'SOCKET', powerType: 'AC_3_PHASE', voltage: '230', amperage: '32'
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
            defaults = { ...defaults, standard: 'IEC_62196_T2_COMBO', format: 'CABLE', powerType: 'DC', voltage: '400', maxPowerKw: '50' };
        } else if (typeVal === 'CHADEMO') {
            defaults = { ...defaults, standard: 'CHADEMO', format: 'CABLE', powerType: 'DC', voltage: '400', maxPowerKw: '50' };
        } else if (typeVal === 'TYPE_2') {
            defaults = { ...defaults, standard: 'IEC_62196_T2', format: 'SOCKET', powerType: 'AC_3_PHASE', voltage: '230', maxPowerKw: '22' };
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
            voltage: parseInt(formData.voltage),
            amperage: parseInt(formData.amperage),
            tariffId: formData.tariffId ? parseInt(formData.tariffId) : null
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
                return <span className="text-emerald-600 bg-emerald-50 px-2.5 py-0.5 border border-emerald-200 rounded-md text-xs font-bold shadow-2xs flex items-center w-max"><CheckCircle2 size={12} className="mr-1" /> Available</span>;
            case 'OCCUPIED':
                return <span className="text-blue-600 bg-blue-50 px-2.5 py-0.5 border border-blue-200 rounded-md text-xs font-bold shadow-2xs flex items-center w-max"><Zap size={12} className="mr-1" /> Charging</span>;
            case 'FAULTED':
                return <span className="text-red-600 bg-red-50 px-2.5 py-0.5 border border-red-200 rounded-md text-xs font-bold shadow-2xs flex items-center w-max"><XCircle size={12} className="mr-1" /> Faulted</span>;
            default:
                return <span className="text-slate-400 bg-slate-50 px-2.5 py-0.5 border border-slate-200 rounded-md text-xs font-bold flex items-center w-max"><Clock size={12} className="mr-1" /> Offline</span>;
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">

            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
                <div className="flex items-center space-x-4">
                    <div className="p-3.5 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl text-amber-600 ring-1 ring-amber-200/50 shadow-inner">
                        <Zap size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Connectors & Plugs</h2>
                        <p className="text-sm text-slate-500 mt-0.5 font-medium">Configure physical power nozzle interfaces, structural standards, and tariffs</p>
                    </div>
                </div>

                <button
                    onClick={() => openModal('create')}
                    className="flex items-center justify-center space-x-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-md font-semibold active:scale-95"
                >
                    <Plus size={18} strokeWidth={2.5} />
                    <span>Add Connector</span>
                </button>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Connector Plug Scope</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">OCPI Standard Properties</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Hardware Carrier</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Capacity Grid</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Live Status</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-16 text-center text-slate-400">
                                        <Zap size={32} className="animate-pulse mx-auto mb-3 text-amber-400" />
                                        <p className="text-sm font-medium">Loading hardware connectors...</p>
                                    </td>
                                </tr>
                            ) : connectors.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-16 text-center text-slate-500">
                                        <Layers size={36} className="mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
                                        <p className="text-base font-bold text-slate-900">No connectors configured</p>
                                        <p className="text-sm mt-1">Deploy an active nozzle output interface to map transaction tracks.</p>
                                    </td>
                                </tr>
                            ) : (
                                connectors.map((conn) => (
                                    <tr key={conn.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-900 uppercase tracking-wide">
                                                    {conn.type.replace('_', ' ')}
                                                </span>
                                                <span className="text-xs font-bold text-slate-400 mt-0.5 flex items-center font-mono">
                                                    Nozzle Index #{conn.id}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col text-xs font-bold text-slate-700">
                                                <span className="font-mono text-[11px] text-indigo-600">{conn.standard}</span>
                                                <span className="text-slate-400 font-medium mt-0.5">{conn.format} • {conn.powerType} ({conn.voltage}V / {conn.amperage}A)</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-slate-700 font-mono">{conn.chargePoint?.hardwareId}</span>
                                                <span className="text-xs font-medium text-slate-400 mt-0.5">{conn.chargePoint?.location?.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-extrabold text-slate-900">{conn.maxPowerKw} <span className="text-xs text-slate-400 font-medium uppercase">kW</span></span>
                                                {conn.tariff?.name ? (
                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 mt-1 flex items-center w-max"><DollarSign size={10} /> {conn.tariff.name}</span>
                                                ) : (
                                                    <span className="text-[10px] font-medium text-slate-400 italic mt-1">Unassigned Plan</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(conn.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openModal('edit', conn)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">
                                                    <Edit2 size={16} strokeWidth={2.5} />
                                                </button>
                                                <button onClick={() => openModal('delete', conn)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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

            {/* Dynamic Operations Dialog Container */}
            {modalMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={closeModal}></div>

                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">

                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-150 bg-slate-50/50">
                            <h3 className="text-lg font-black text-slate-900">
                                {modalMode === 'create' && 'Map New Output Connector'}
                                {modalMode === 'edit' && 'Configure Connector Properties'}
                                {modalMode === 'delete' && 'Drop Connector Endpoint'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 p-1.5 rounded-full transition-colors">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Form Context Inputs */}
                        {(modalMode === 'create' || modalMode === 'edit') && (
                            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {modalMode === 'create' && (
                                        <div>
                                            <label className="block text-xs font-black uppercase text-slate-500 mb-1">Parent Hardware Host</label>
                                            <select
                                                required
                                                value={formData.chargePointId}
                                                onChange={(e) => setFormData({ ...formData, chargePointId: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 shadow-2xs focus:bg-white"
                                            >
                                                <option value="" disabled>Select parent machine...</option>
                                                {chargePoints.map(cp => (
                                                    <option key={cp.id} value={cp.id}>{cp.hardwareId} ({cp.location?.name})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-black uppercase text-slate-500 mb-1">Interface Plug standard</label>
                                        <select
                                            required
                                            value={formData.type}
                                            onChange={(e) => handleInterfaceChange(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 shadow-2xs focus:bg-white"
                                        >
                                            <option value="" disabled>Select port plug type...</option>
                                            <option value="CCS">CCS (DC Combo Nozzle)</option>
                                            <option value="TYPE_2">TYPE 2 (AC Socket Nozzle)</option>
                                            <option value="CHADEMO">CHADEMO (DC Fast Nozzle)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* --- NEW MATRIX SEGMENT: DYNAMIC OCPI LAYER BLOCKS --- */}
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70 space-y-4">
                                    <p className="text-[10px] font-black tracking-widest text-indigo-600 uppercase flex items-center"><Info size={12} className="mr-1" /> OCPI Protocol Parameters</p>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Interface Standard</label>
                                            <select
                                                value={formData.standard}
                                                onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
                                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                                            >
                                                <option value="IEC_62196_T2">IEC_62196_T2</option>
                                                <option value="IEC_62196_T2_COMBO">IEC_62196_T2_COMBO</option>
                                                <option value="CHADEMO">CHADEMO</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Port Format</label>
                                            <select
                                                value={formData.format}
                                                onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                                            >
                                                <option value="SOCKET">SOCKET (Un-tethered)</option>
                                                <option value="CABLE">CABLE (Tethered Line)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Grid Phase Supply</label>
                                            <select
                                                value={formData.powerType}
                                                onChange={(e) => setFormData({ ...formData, powerType: e.target.value })}
                                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                                            >
                                                <option value="AC_1_PHASE">AC Single Phase</option>
                                                <option value="AC_3_PHASE">AC Three Phase</option>
                                                <option value="DC">DC Direct Supply</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center"><Cpu size={11} className="mr-1" /> Capacity (kW)</label>
                                            <input
                                                type="number" step="any" required
                                                value={formData.maxPowerKw}
                                                onChange={(e) => setFormData({ ...formData, maxPowerKw: e.target.value })}
                                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs font-bold"
                                                placeholder="e.g. 50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center"><Settings size={11} className="mr-1" /> Voltage (V)</label>
                                            <input
                                                type="number" required
                                                value={formData.voltage}
                                                onChange={(e) => setFormData({ ...formData, voltage: e.target.value })}
                                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                                                placeholder="400"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center"><Settings size={11} className="mr-1" /> Amperage (A)</label>
                                            <input
                                                type="number" required
                                                value={formData.amperage}
                                                onChange={(e) => setFormData({ ...formData, amperage: e.target.value })}
                                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                                                placeholder="32"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black uppercase text-slate-500 mb-1">Live Status State</label>
                                        <select
                                            required
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs"
                                        >
                                            <option value="AVAILABLE">AVAILABLE</option>
                                            <option value="OCCUPIED">OCCUPIED / CHARGING</option>
                                            <option value="FAULTED">FAULTED / TERMINATED</option>
                                            <option value="OFFLINE">OFFLINE / DISCONNECTED</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black uppercase text-slate-500 mb-1">Assigned Revenue Tariff</label>
                                        <select
                                            value={formData.tariffId}
                                            onChange={(e) => setFormData({ ...formData, tariffId: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs"
                                        >
                                            <option value="">No Billing (Free Utility Option)</option>
                                            {tariffs.map(t => (
                                                <option key={t.id} value={t.id}>{t.name} ({t.pricePerKwh} {t.currency}/kWh)</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex space-x-3 mt-8 pt-4 border-t border-slate-100">
                                    <button type="button" onClick={closeModal} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50/50 transition-colors">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all shadow-md">
                                        {submitting ? 'Synchronizing...' : 'Commit Configuration'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Delete Confirm */}
                        {modalMode === 'delete' && selectedConn && (
                            <div className="p-8">
                                <div className="flex flex-col items-center text-center space-y-4 mb-8">
                                    <div className="h-16 w-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 mb-2 ring-8 ring-rose-50/40">
                                        <AlertCircle size={32} />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black text-slate-900">Drop Connector Plug?</h4>
                                        <p className="text-xs text-slate-400 mt-2 max-w-sm font-semibold leading-relaxed">
                                            You are about to permanently drop connector index tracking node <span className="font-bold text-slate-800">#{selectedConn.id}</span>. Downstream transactional session registers cannot be broken if execution triggers.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex space-x-3">
                                    <button onClick={closeModal} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                                    <button onClick={handleDelete} disabled={submitting} className="flex-1 px-4 py-2.5 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 transition-all shadow-md">
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