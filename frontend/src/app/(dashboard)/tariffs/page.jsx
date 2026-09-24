'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import {
    Plus, Edit2, Trash2, X, AlertCircle, Eye,
    CheckCircle2, DollarSign, Layers, Building2,
    ChevronDown, ChevronUp, Zap, Globe, Link as LinkIcon, Plug
} from 'lucide-react';

const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const TARIFF_TYPES = ['REGULAR', 'AD_HOC_PAYMENT', 'PROFILE_GREEN', 'PROFILE_FAST', 'PROFILE_CHEAP'];

let rowKeySeq = 0;
const nextRowKey = () => `row_${++rowKeySeq}`;

// Turns one stored OCPI "element" back into a flat, editable row.
const elementToRow = (el) => {
    const pc = (Array.isArray(el?.price_components) ? el.price_components.find(c => c.type === 'ENERGY') : null)
        || el?.price_components?.[0] || {};
    const r = el?.restrictions || {};
    return {
        key: nextRowKey(),
        dayOfWeek: r.day_of_week || '',
        startTime: r.start_time || '',
        endTime: r.end_time || '',
        startDate: r.start_date || '',
        endDate: r.end_date || '',
        price: pc.price ?? '',
        vat: pc.vat ?? '',
        stepSize: pc.step_size ?? 1
    };
};

const blankRow = (price = '') => ({
    key: nextRowKey(), dayOfWeek: '', startTime: '', endTime: '', startDate: '', endDate: '', price, vat: '', stepSize: 1
});

// Turns an editable row back into an OCPI "element" object for the API.
const rowToElement = (row) => {
    const priceComponent = {
        type: 'ENERGY',
        price: parseFloat(row.price) || 0,
        step_size: row.stepSize ? parseInt(row.stepSize, 10) : 1
    };
    if (row.vat !== '' && row.vat !== null && row.vat !== undefined) {
        priceComponent.vat = parseFloat(row.vat);
    }

    const element = { price_components: [priceComponent] };
    const hasRestriction = row.dayOfWeek || row.startTime || row.endTime || row.startDate || row.endDate;
    if (hasRestriction) {
        element.restrictions = {
            start_time: row.startTime || null,
            end_time: row.endTime || null,
            start_date: row.startDate || null,
            end_date: row.endDate || null,
            day_of_week: row.dayOfWeek || null,
            reservation: null
        };
    }
    return element;
};

const emptyForm = (companyId = '') => ({
    name: '', pricePerKwh: '', currency: 'GBP', companyId,
    type: '', countryCode: '', partyId: '', tariffAltUrl: '', minPrice: '', maxPrice: '',
    elementRows: [blankRow()]
});

export default function TariffsPage() {
    const { user } = useAuthStore();

    const [tariffs, setTariffs] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);

    const [modalMode, setModalMode] = useState(null);
    const [selectedTariff, setSelectedTariff] = useState(null);
    const [viewDetail, setViewDetail] = useState(null);
    const [viewLoading, setViewLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [formData, setFormData] = useState(emptyForm());
    const [submitting, setSubmitting] = useState(false);

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

    const openModal = (mode, tariff = null) => {
        setModalMode(mode);
        setSelectedTariff(tariff);

        if (tariff && mode === 'edit') {
            setFormData({
                name: tariff.name,
                pricePerKwh: tariff.pricePerKwh,
                currency: tariff.currency,
                companyId: tariff.companyId,
                type: tariff.type || '',
                countryCode: tariff.countryCode || '',
                partyId: tariff.partyId || '',
                tariffAltUrl: tariff.tariffAltUrl || '',
                minPrice: tariff.minPrice ?? '',
                maxPrice: tariff.maxPrice ?? '',
                elementRows: tariff.elements?.length ? tariff.elements.map(elementToRow) : [blankRow(tariff.pricePerKwh)]
            });
            setShowAdvanced(!!tariff.hasFullOcpiData);
        } else if (mode === 'create') {
            setFormData(emptyForm(user?.role === 'SUPER_ADMIN' ? '' : (user?.companyId || '')));
            setShowAdvanced(false);
        } else if (mode === 'view') {
            setViewDetail(null);
            setViewLoading(true);
            api.get(`/tariffs/${tariff.id}`)
                .then(res => { if (res.data.success) setViewDetail(res.data.data); })
                .catch(() => setViewDetail({ ...tariff, connectors: [] }))
                .finally(() => setViewLoading(false));
        }
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedTariff(null);
        setViewDetail(null);
    };

    const updateRow = (key, field, value) => {
        setFormData(fd => ({
            ...fd,
            elementRows: fd.elementRows.map(r => r.key === key ? { ...r, [field]: value } : r)
        }));
    };

    const addRow = () => setFormData(fd => ({ ...fd, elementRows: [...fd.elementRows, blankRow(fd.pricePerKwh)] }));
    const removeRow = (key) => setFormData(fd => ({
        ...fd,
        elementRows: fd.elementRows.length > 1 ? fd.elementRows.filter(r => r.key !== key) : fd.elementRows
    }));

    const buildPayload = () => {
        const payload = {
            name: formData.name,
            pricePerKwh: formData.pricePerKwh,
            currency: formData.currency,
            ...(modalMode === 'create' && { companyId: formData.companyId })
        };

        if (showAdvanced) {
            if (formData.type) payload.type = formData.type;
            if (formData.countryCode) payload.country_code = formData.countryCode;
            if (formData.partyId) payload.party_id = formData.partyId;
            if (formData.tariffAltUrl) payload.tariff_alt_url = formData.tariffAltUrl;
            if (formData.minPrice !== '') payload.min_price = parseFloat(formData.minPrice);
            if (formData.maxPrice !== '') payload.max_price = parseFloat(formData.maxPrice);
            payload.elements = formData.elementRows
                .filter(r => r.price !== '')
                .map(rowToElement);
        }

        return payload;
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = buildPayload();
            if (modalMode === 'create') {
                await api.post('/tariffs', payload);
            } else if (modalMode === 'edit') {
                await api.put(`/tariffs/${selectedTariff.id}`, payload);
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
        <div className="space-y-6 w-full select-none">

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
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Type / Party</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Unit Rate</th>
                                <th scope="col" className="px-6 py-4 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Elements</th>
                                <th scope="col" className="px-6 py-4 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Linked plugs</th>
                                <th scope="col" className="px-6 py-4 text-right text-[11px] font-black text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-16 text-center text-slate-400">
                                        <DollarSign size={24} className="animate-spin mx-auto mb-3 text-blue-500" />
                                        <p className="text-xs font-bold uppercase tracking-wider animate-pulse">Loading commercial rates...</p>
                                    </td>
                                </tr>
                            ) : tariffs.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-16 text-center text-slate-500">
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
                                                <span className="text-xs font-bold font-mono text-slate-400 mt-0.5">
                                                    #{t.id}{t.tariffUid ? ` · ${t.tariffUid}` : ''}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <div className="flex items-center text-xs font-extrabold text-slate-700">
                                                    <Building2 size={13} className="mr-2 text-blue-500 shrink-0" />
                                                    {t.companyName || '—'}
                                                </div>
                                                {t.operatorReferenceId && (
                                                    <span className="text-[10px] font-bold font-mono text-slate-400 mt-0.5 ml-[19px]">{t.operatorReferenceId}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="inline-flex w-max items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                    {t.type || 'FLAT'}
                                                </span>
                                                {(t.countryCode || t.partyId) && (
                                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                        <Globe size={10} /> {t.countryCode || '—'} / {t.partyId || '—'}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-black text-slate-900">
                                                {Number(t.pricePerKwh).toFixed(2)} {t.currency}/kWh
                                            </span>
                                            {(t.minPrice != null || t.maxPrice != null) && (
                                                <div className="text-[10px] font-bold text-slate-400">
                                                    range {t.minPrice ?? '—'}–{t.maxPrice ?? '—'}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                {t.elements?.length || 0} rule{(t.elements?.length || 0) === 1 ? '' : 's'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                {t.connectorsCount || 0} Interfaces
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openModal('view', t)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer" title="View Tariff Details">
                                                    <Eye size={14} strokeWidth={2.5} />
                                                </button>
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

            {/* Create / Edit Modal */}
            {(modalMode === 'create' || modalMode === 'edit') && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity" onClick={closeModal}></div>

                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden transform transition-all border border-slate-100 animate-in zoom-in-95 duration-200">

                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                {modalMode === 'create' ? 'Create Pricing Plan' : 'Modify Pricing Details'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-lg transition-colors cursor-pointer">
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4 outline-hidden">

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

                            {/* Advanced OCPI Fields */}
                            <div className="pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowAdvanced(v => !v)}
                                    className="flex items-center justify-between w-full py-2 text-left cursor-pointer"
                                >
                                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                        <Zap size={12} className="text-amber-500" /> OCPI Details (type, restrictions, elements)
                                    </span>
                                    {showAdvanced ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                </button>

                                {showAdvanced && (
                                    <div className="space-y-4 mt-2 bg-slate-50/60 border border-slate-200 rounded-xl p-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Tariff Type</label>
                                                <select
                                                    value={formData.type}
                                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-hidden cursor-pointer"
                                                >
                                                    <option value="">— unset —</option>
                                                    {TARIFF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Country</label>
                                                    <input
                                                        type="text" maxLength={2}
                                                        value={formData.countryCode}
                                                        onChange={(e) => setFormData({ ...formData, countryCode: e.target.value.toUpperCase() })}
                                                        placeholder="GB"
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 outline-hidden"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Party ID</label>
                                                    <input
                                                        type="text" maxLength={3}
                                                        value={formData.partyId}
                                                        onChange={(e) => setFormData({ ...formData, partyId: e.target.value.toUpperCase() })}
                                                        placeholder="API"
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 outline-hidden"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Min Price</label>
                                                <input
                                                    type="number" step="any"
                                                    value={formData.minPrice}
                                                    onChange={(e) => setFormData({ ...formData, minPrice: e.target.value })}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 outline-hidden"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Max Price</label>
                                                <input
                                                    type="number" step="any"
                                                    value={formData.maxPrice}
                                                    onChange={(e) => setFormData({ ...formData, maxPrice: e.target.value })}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 outline-hidden"
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Alt URL</label>
                                                <input
                                                    type="text"
                                                    value={formData.tariffAltUrl}
                                                    onChange={(e) => setFormData({ ...formData, tariffAltUrl: e.target.value })}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-hidden"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Pricing Elements & Restrictions</label>
                                                <button type="button" onClick={addRow} className="flex items-center gap-1 text-[10px] font-black uppercase text-blue-600 hover:text-blue-800 cursor-pointer">
                                                    <Plus size={12} /> Add rule
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {formData.elementRows.map((row) => (
                                                    <div key={row.key} className="bg-white border border-slate-200 rounded-xl p-3 grid grid-cols-12 gap-2 items-end">
                                                        <div className="col-span-3">
                                                            <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Day</label>
                                                            <select
                                                                value={row.dayOfWeek}
                                                                onChange={(e) => updateRow(row.key, 'dayOfWeek', e.target.value)}
                                                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 outline-hidden cursor-pointer"
                                                            >
                                                                <option value="">Any day</option>
                                                                {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d.slice(0, 3)}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Start</label>
                                                            <input type="time" value={row.startTime} onChange={(e) => updateRow(row.key, 'startTime', e.target.value)}
                                                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono font-bold text-slate-700 outline-hidden" />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">End</label>
                                                            <input type="time" value={row.endTime} onChange={(e) => updateRow(row.key, 'endTime', e.target.value)}
                                                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono font-bold text-slate-700 outline-hidden" />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Price</label>
                                                            <input type="number" step="any" value={row.price} onChange={(e) => updateRow(row.key, 'price', e.target.value)}
                                                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono font-bold text-slate-700 outline-hidden" />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">VAT %</label>
                                                            <input type="number" step="any" value={row.vat} onChange={(e) => updateRow(row.key, 'vat', e.target.value)}
                                                                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono font-bold text-slate-700 outline-hidden" />
                                                        </div>
                                                        <div className="col-span-1 flex justify-end pb-1">
                                                            <button type="button" onClick={() => removeRow(row.key)} className="text-slate-300 hover:text-rose-600 cursor-pointer" title="Remove rule">
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {modalMode === 'delete' && selectedTariff && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity" onClick={closeModal}></div>
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-slate-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Decommission Tariff</h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-lg transition-colors cursor-pointer">
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>
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
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {modalMode === 'view' && selectedTariff && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity" onClick={closeModal}></div>
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all border border-slate-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Tariff Detail — {selectedTariff.name}</h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-lg transition-colors cursor-pointer">
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        {viewLoading || !viewDetail ? (
                            <div className="p-16 text-center text-slate-400">
                                <DollarSign size={24} className="animate-spin mx-auto mb-3 text-blue-500" />
                                <p className="text-xs font-bold uppercase tracking-wider animate-pulse">Loading tariff detail...</p>
                            </div>
                        ) : (
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <DetailField label="Internal ID" value={`#${viewDetail.id}`} mono />
                                    <DetailField label="Tariff UID (OCPI id)" value={viewDetail.tariffUid || '—'} mono />
                                    <DetailField label="Operator" value={viewDetail.companyName} />
                                    <DetailField label="Operator Reference ID" value={viewDetail.operatorReferenceId || '—'} mono />
                                    <DetailField label="Unit Rate" value={`${Number(viewDetail.pricePerKwh).toFixed(4)} ${viewDetail.currency}/kWh`} />
                                    <DetailField label="Type" value={viewDetail.type || '—'} />
                                    <DetailField label="Country / Party" value={`${viewDetail.countryCode || '—'} / ${viewDetail.partyId || '—'}`} />
                                    <DetailField label="Min / Max Price" value={`${viewDetail.minPrice ?? '—'} / ${viewDetail.maxPrice ?? '—'}`} />
                                    {viewDetail.tariffAltUrl && (
                                        <div className="col-span-2">
                                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Alt URL</div>
                                            <a href={viewDetail.tariffAltUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 font-semibold break-all">
                                                <LinkIcon size={11} /> {viewDetail.tariffAltUrl}
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                                        <Zap size={12} className="text-amber-500" /> Pricing Elements & Restrictions
                                    </h4>
                                    {viewDetail.elements?.length ? (
                                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                            <table className="min-w-full text-[11px]">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left font-black text-slate-500 uppercase">Day</th>
                                                        <th className="px-3 py-2 text-left font-black text-slate-500 uppercase">Time</th>
                                                        <th className="px-3 py-2 text-left font-black text-slate-500 uppercase">Price</th>
                                                        <th className="px-3 py-2 text-left font-black text-slate-500 uppercase">VAT</th>
                                                        <th className="px-3 py-2 text-left font-black text-slate-500 uppercase">Step</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {viewDetail.elements.map((el, i) => {
                                                        const pc = el.price_components?.find(c => c.type === 'ENERGY') || el.price_components?.[0] || {};
                                                        const r = el.restrictions || {};
                                                        return (
                                                            <tr key={i}>
                                                                <td className="px-3 py-2 font-bold text-slate-700">{r.day_of_week || 'Any'}</td>
                                                                <td className="px-3 py-2 font-mono text-slate-600">{r.start_time || '—'}–{r.end_time || '—'}</td>
                                                                <td className="px-3 py-2 font-mono font-bold text-slate-900">{pc.price ?? '—'}</td>
                                                                <td className="px-3 py-2 font-mono text-slate-600">{pc.vat ?? '—'}</td>
                                                                <td className="px-3 py-2 font-mono text-slate-600">{pc.step_size ?? '—'}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 font-semibold">No structured pricing elements stored for this tariff.</p>
                                    )}
                                </div>

                                <div>
                                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                                        <Plug size={12} className="text-blue-500" /> Linked Connectors ({viewDetail.connectors?.length || 0})
                                    </h4>
                                    {viewDetail.connectors?.length ? (
                                        <div className="space-y-1.5">
                                            {viewDetail.connectors.map(c => (
                                                <div key={c.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[11px]">
                                                    <span className="font-bold text-slate-700">{c.hardwareId || `Connector #${c.id}`} <span className="text-slate-400 font-medium">({c.standard})</span></span>
                                                    <span className="text-slate-500 font-semibold">{c.locationName || '—'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 font-semibold">No connectors currently reference this tariff.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailField({ label, value, mono }) {
    return (
        <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">{label}</div>
            <div className={`font-bold text-slate-800 ${mono ? 'font-mono' : ''}`}>{value}</div>
        </div>
    );
}
