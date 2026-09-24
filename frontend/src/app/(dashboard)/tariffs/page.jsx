'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import BrandLoader from '@/components/BrandLoader';
import {
    Plus, Edit2, Trash2, X, AlertCircle, Eye,
    DollarSign, Layers, Building2,
    ChevronDown, ChevronUp, Zap, Globe, Link as LinkIcon, Plug,
    Copy, Check, Clock, Percent, MapPin
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
    const [copiedUid, setCopiedUid] = useState(false);

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
                                    <td colSpan="7" className="px-6 py-16 text-center">
                                        <BrandLoader label="Loading commercial rates" />
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
                                            <div className="flex items-center justify-end space-x-1">
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
                                <button type="submit" disabled={submitting} className="flex-1 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-800 transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2">
                                    {submitting ? (<><BrandLoader size="xs" /> Processing...</>) : 'Save Plan'}
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
                                <button onClick={handleDelete} disabled={submitting} className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2">
                                    {submitting ? (<><BrandLoader size="xs" /> Purging...</>) : 'Confirm Decommission'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Details Modal */}
            {modalMode === 'view' && selectedTariff && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity" onClick={closeModal}></div>
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all border border-slate-100 animate-in zoom-in-95 duration-200">

                        {viewLoading || !viewDetail ? (
                            <div className="p-20">
                                <BrandLoader label="Loading tariff detail" />
                            </div>
                        ) : (
                            <>
                                {/* Hero header */}
                                <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-[#0F172A] via-slate-900 to-slate-800 px-7 pt-6 pb-12">
                                    <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-gradient-to-br from-[#FFAF00] to-[#73CB44] opacity-20 blur-2xl pointer-events-none" />
                                    <div className="absolute -bottom-16 -left-10 w-40 h-40 rounded-full bg-gradient-to-br from-[#73CB44] to-[#FFAF00] opacity-10 blur-2xl pointer-events-none" />
                                    <svg className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none" aria-hidden="true">
                                        <pattern id="tariffDotGrid" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
                                            <circle cx="1.5" cy="1.5" r="1.5" fill="white" />
                                        </pattern>
                                        <rect width="100%" height="100%" fill="url(#tariffDotGrid)" />
                                    </svg>

                                    {/* Top row: badges on the left, close button on the right - normal flow so
                                        nothing can ever render underneath it, regardless of content width. */}
                                    <div className="relative flex items-start justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white/10 text-[#FFAF00] border border-white/10">
                                                {viewDetail.type || 'FLAT RATE'}
                                            </span>
                                            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                                                <Building2 size={11} /> {viewDetail.companyName}
                                            </span>
                                        </div>
                                        <button
                                            onClick={closeModal}
                                            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                                        >
                                            <X size={15} strokeWidth={2.5} />
                                        </button>
                                    </div>

                                    <div className="relative">
                                        <h3 className="text-2xl font-black text-white tracking-tight pr-4">{viewDetail.name}</h3>
                                        <button
                                            onClick={() => {
                                                if (viewDetail.tariffUid) {
                                                    navigator.clipboard?.writeText(viewDetail.tariffUid);
                                                    setCopiedUid(true);
                                                    setTimeout(() => setCopiedUid(false), 1500);
                                                }
                                            }}
                                            className="mt-1.5 flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                                            title="Copy tariff UID"
                                        >
                                            {copiedUid ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                            #{viewDetail.id} · {viewDetail.tariffUid || 'no OCPI uid'}
                                        </button>
                                    </div>
                                </div>

                                {/* Price card - floats over the header/body seam for a layered, modern feel */}
                                <div className="relative px-7 -mt-8">
                                    <div className="flex items-center justify-between gap-4 bg-white rounded-2xl shadow-lg border border-slate-100 px-5 py-4">
                                        <div>
                                            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Unit Rate</div>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-2xl font-black text-slate-900">{Number(viewDetail.pricePerKwh).toFixed(2)}</span>
                                                <span className="text-xs font-black text-slate-400">{viewDetail.currency} / kWh</span>
                                            </div>
                                        </div>
                                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FFAF00] to-[#73CB44] flex items-center justify-center shadow-md shrink-0">
                                            <Zap size={20} className="text-white" fill="white" strokeWidth={1.5} />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-7 pt-5 space-y-7">
                                    {/* Stat tiles */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <StatTile icon={Globe} color="blue" label="Country / Party" value={`${viewDetail.countryCode || '—'} / ${viewDetail.partyId || '—'}`} />
                                        <StatTile icon={DollarSign} color="emerald" label="Price Range" value={`${viewDetail.minPrice ?? '—'} – ${viewDetail.maxPrice ?? '—'}`} />
                                        <StatTile icon={Zap} color="amber" label="Pricing Rules" value={viewDetail.elements?.length || 0} />
                                        <StatTile icon={Plug} color="indigo" label="Linked Plugs" value={viewDetail.connectors?.length || 0} />
                                    </div>

                                    {viewDetail.tariffAltUrl && (
                                        <a
                                            href={viewDetail.tariffAltUrl} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-2 w-max max-w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors"
                                        >
                                            <LinkIcon size={12} className="shrink-0" /> <span className="truncate">{viewDetail.tariffAltUrl}</span>
                                        </a>
                                    )}

                                    {/* Pricing elements as rule cards */}
                                    <div className="pt-6 border-t border-slate-100">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
                                                <Zap size={12} className="text-amber-500" />
                                            </div>
                                            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500">Pricing Elements & Restrictions</h4>
                                        </div>
                                        {viewDetail.elements?.length ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {viewDetail.elements.map((el, i) => {
                                                    const pc = el.price_components?.find(c => c.type === 'ENERGY') || el.price_components?.[0] || {};
                                                    const r = el.restrictions || {};
                                                    const dayStyle = DAY_COLORS[r.day_of_week] || 'bg-slate-100 text-slate-600 border-slate-200';
                                                    return (
                                                        <div key={i} className="relative bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${dayStyle}`}>
                                                                    {r.day_of_week || 'Any day'}
                                                                </span>
                                                                <span className="text-lg font-black text-slate-900">
                                                                    {pc.price ?? '—'} <span className="text-[10px] font-bold text-slate-400">{viewDetail.currency}</span>
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
                                                                <span className="flex items-center gap-1">
                                                                    <Clock size={11} className="text-slate-400" /> {r.start_time || '00:00'}–{r.end_time || '23:59'}
                                                                </span>
                                                                {pc.vat !== undefined && pc.vat !== null && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Percent size={11} className="text-slate-400" /> {pc.vat}% VAT
                                                                    </span>
                                                                )}
                                                                {pc.step_size !== undefined && pc.step_size !== null && (
                                                                    <span className="text-slate-400">step {pc.step_size}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 font-semibold">No structured pricing elements stored for this tariff.</p>
                                        )}
                                    </div>

                                    {/* Linked connectors */}
                                    <div className="pt-6 border-t border-slate-100">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                                                <Plug size={12} className="text-blue-500" />
                                            </div>
                                            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500">Linked Connectors ({viewDetail.connectors?.length || 0})</h4>
                                        </div>
                                        {viewDetail.connectors?.length ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {viewDetail.connectors.map(c => (
                                                    <div key={c.id} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 hover:border-blue-200 hover:bg-blue-50/40 transition-colors">
                                                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                                            <Plug size={13} className="text-blue-500" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-[11px] font-bold text-slate-700 truncate">{c.hardwareId || `Connector #${c.id}`} <span className="text-slate-400 font-medium">({c.standard})</span></div>
                                                            <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 truncate">
                                                                <MapPin size={9} /> {c.locationName || '—'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 font-semibold">No connectors currently reference this tariff.</p>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const DAY_COLORS = {
    MONDAY: 'bg-rose-50 text-rose-700 border-rose-200',
    TUESDAY: 'bg-orange-50 text-orange-700 border-orange-200',
    WEDNESDAY: 'bg-amber-50 text-amber-700 border-amber-200',
    THURSDAY: 'bg-lime-50 text-lime-700 border-lime-200',
    FRIDAY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    SATURDAY: 'bg-sky-50 text-sky-700 border-sky-200',
    SUNDAY: 'bg-violet-50 text-violet-700 border-violet-200'
};

const STAT_COLORS = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200'
};

function StatTile({ icon: Icon, color, label, value }) {
    return (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center border mb-2 ${STAT_COLORS[color]}`}>
                <Icon size={13} strokeWidth={2.5} />
            </div>
            <div className="text-xs font-black text-slate-900 truncate">{value}</div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{label}</div>
        </div>
    );
}
