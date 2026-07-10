'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import {
    Plus, Edit2, Trash2, X, AlertCircle,
    CheckCircle2, DollarSign, Layers, Building2
} from 'lucide-react';

export default function TariffsPage() {
    // Session State Context
    const { user } = useAuthStore();

    // Data State
    const [tariffs, setTariffs] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [modalMode, setModalMode] = useState(null);
    const [selectedTariff, setSelectedTariff] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        pricePerKwh: '',
        currency: 'GBP',
        companyId: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // Fetch Initial Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [tariffResponse, compResponse] = await Promise.all([
                api.get('/tariffs'),
                api.get('/companies')
            ]);

            if (tariffResponse.data.success) setTariffs(tariffResponse.data.data);
            if (compResponse.data.success) setCompanies(compResponse.data.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Modal Handlers
    const openModal = (mode, tariff = null) => {
        setModalMode(mode);
        setSelectedTariff(tariff);
        if (tariff && mode === 'edit') {
            setFormData({
                name: tariff.name,
                pricePerKwh: tariff.pricePerKwh,
                currency: tariff.currency,
                companyId: tariff.companyId
            });
        } else {
            setFormData({
                name: '',
                pricePerKwh: '',
                currency: 'GBP',
                // TENANCY LOCK: Automatically bind the field to the tenant admin context on creation
                companyId: user?.role === 'SUPER_ADMIN' ? '' : (user?.companyId || '')
            });
        }
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedTariff(null);
    };

    // CRUD Operations
    const handleSave = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (modalMode === 'create') {
                await api.post('/tariffs', formData);
            } else if (modalMode === 'edit') {
                await api.put(`/tariffs/${selectedTariff.id}`, formData);
            }
            fetchData();
            closeModal();
        } catch (error) {
            alert(`Failed to ${modalMode} tariff plan: ` + (error.response?.data?.message || 'Unknown error'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setSubmitting(true);
        try {
            await api.delete(`/tariffs/${selectedTariff.id}`);
            fetchData();
            closeModal();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to delete tariff plan");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto select-none">

            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center space-x-4">
                    <div className="p-3.5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl text-blue-600 ring-1 ring-blue-200/50 shadow-inner">
                        <DollarSign size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tariff pricing plans</h2>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">Configure dynamic monetary pricing bands per energy unit consumption</p>
                    </div>
                </div>

                <button
                    onClick={() => openModal('create')}
                    className="flex cursor-pointer items-center justify-center space-x-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-xs font-black text-xs uppercase tracking-wider active:scale-95"
                >
                    <Plus size={14} strokeWidth={2.5} />
                    <span>Create tariff</span>
                </button>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50/70">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Plan Name</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Operator Company</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Unit Rate</th>
                                <th scope="col" className="px-6 py-4 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Linked plugs</th>
                                <th scope="col" className="px-6 py-4 text-right text-[11px] font-black text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-16 text-center text-slate-400">
                                        <DollarSign size={24} className="animate-spin mx-auto mb-3 text-blue-500" />
                                        <p className="text-xs font-bold uppercase tracking-wider animate-pulse">Loading commercial rates...</p>
                                    </td>
                                </tr>
                            ) : tariffs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-16 text-center text-slate-500">
                                        <Layers size={36} className="mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
                                        <p className="text-sm font-black text-slate-900">No tariffs found</p>
                                        <p className="text-xs text-slate-400 font-medium mt-0.5">Structure your billing profiles to monetize infrastructure assets.</p>
                                    </td>
                                </tr>
                            ) : (
                                tariffs.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-extrabold text-slate-900">{t.name}</span>
                                                <span className="text-xs font-bold font-mono text-slate-400 mt-0.5">ID: #{t.id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-xs font-extrabold text-slate-700">
                                                <Building2 size={13} className="mr-2 text-blue-500 shrink-0" />
                                                {t.company?.name || '—'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-black text-slate-900">
                                                {t.pricePerKwh.toFixed(2)} {t.currency}/kWh
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                {t._count?.connectors || 0} Interfaces
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openModal('edit', t)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" title="Edit Tariff">
                                                    <Edit2 size={14} strokeWidth={2.5} />
                                                </button>
                                                <button onClick={() => openModal('delete', t)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Delete Tariff">
                                                    <Trash2 size={14} strokeWidth={2.5} />
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

            {/* Glassmorphism Modal */}
            {modalMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity" onClick={closeModal}></div>

                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-slate-100 animate-in zoom-in-95 duration-200">

                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                {modalMode === 'create' && 'Create Pricing Plan'}
                                {modalMode === 'edit' && 'Modify Pricing Details'}
                                {modalMode === 'delete' && 'Decommission Tariff'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-lg transition-colors cursor-pointer">
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Form Content */}
                        {(modalMode === 'create' || modalMode === 'edit') && (
                            <form onSubmit={handleSave} className="p-6 space-y-4 outline-hidden">

                                {/* Enforces single-tenancy boundaries based on account privilege flags */}
                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Target Operator Fleet</label>
                                    {user?.role === 'SUPER_ADMIN' ? (
                                        <select
                                            required
                                            value={formData.companyId}
                                            onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:border-slate-400 outline-hidden transition-all cursor-pointer"
                                        >
                                            <option value="" disabled>Select parent corporate scope...</option>
                                            {companies.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="relative group">
                                            <Building2 size={13} className="absolute left-3.5 top-3.5 text-slate-400" />
                                            <input
                                                type="text"
                                                disabled
                                                value={companies.find(c => c.id === user?.companyId)?.name || 'Resolving Corporate Profile...'}
                                                className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed outline-hidden"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Tariff Profile Designation</label>
                                    <input
                                        type="text" required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-slate-400 outline-hidden transition-all"
                                        placeholder="e.g. Peak Ultra-Fast Charging Plan"
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Price Unit Rate</label>
                                        <input
                                            type="number" step="any" required
                                            value={formData.pricePerKwh}
                                            onChange={(e) => setFormData({ ...formData, pricePerKwh: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-slate-400 outline-hidden transition-all"
                                            placeholder="e.g. 0.65"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">ISO Currency</label>
                                        <select
                                            required
                                            value={formData.currency}
                                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 outline-hidden cursor-pointer"
                                        >
                                            <option value="GBP">GBP (£)</option>
                                            <option value="EUR">EUR (€)</option>
                                            <option value="USD">USD ($)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex space-x-3 pt-4 border-t border-slate-100 mt-6">
                                    <button type="button" onClick={closeModal} className="flex-1 py-2 text-xs font-bold uppercase tracking-wider border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={submitting} className="flex-1 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-800 transition-all shadow-sm cursor-pointer">
                                        {submitting ? 'Processing...' : 'Save Plan'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Delete Confirm */}
                        {modalMode === 'delete' && selectedTariff && (
                            <div className="p-6 space-y-6">
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <div className="h-14 w-14 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 shadow-inner">
                                        <AlertCircle size={26} />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-black text-slate-900">Purge Tariff Plan?</h4>
                                        <p className="text-xs text-slate-400 mt-2 max-w-sm font-semibold leading-relaxed">
                                            This will permanently scrap <span className="font-extrabold text-slate-800">"{selectedTariff.name}"</span>. Relational validation constraints prevent purging if hardware plug interfaces remain actively tied.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex space-x-3 pt-4 border-t border-slate-100">
                                    <button onClick={closeModal} className="flex-1 py-2 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">Cancel</button>
                                    <button onClick={handleDelete} disabled={submitting} className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer">
                                        {submitting ? 'Purging...' : 'Confirm Decommission'}
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