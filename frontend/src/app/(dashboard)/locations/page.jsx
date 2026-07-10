'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import {
    Plus, MapPin, Edit2, Trash2, X, Globe, Eye,
    AlertCircle, CheckCircle2, Clock, Coffee, AlertTriangle,
    Building2, Navigation, Info, Upload, Image as ImageIcon, Trash
} from 'lucide-react';

export default function LocationsPage() {
    // Session State Context
    const { user } = useAuthStore();

    // Data Pool States
    const [locations, setLocations] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);

    // Operational Management Modals
    const [modalMode, setModalMode] = useState(null); // 'create', 'edit', 'delete', 'view-images'
    const [selectedLoc, setSelectedLoc] = useState(null);

    // Staged File Handling States
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [existingImages, setExistingImages] = useState([]); // Tracks active server image pointers dynamically

    // Custom Component Notification Feedback States
    const [statusModal, setStatusModal] = useState({ show: false, type: 'success', message: '' });
    const [confirmImageDelete, setConfirmImageDelete] = useState({ show: false, targetId: null });
    const [searchQuery, setSearchString] = useState('');
    const [statusFilter, setStatusFilter] = useState(''); // '', 'approved', 'pending'

    // Form Param Matrices
    const [formData, setFormData] = useState({
        name: '', address: '', postcode: '', latitude: '', longitude: '', amenities: '',
        companyId: '', isApproved: false, city: '', state: '', countryCode: 'GB',
        partyId: 'CEV', countryISO: 'GBR', parkingType: 'UNKNOWN', timeZone: 'Europe/London'
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (searchQuery) queryParams.append('search', searchQuery);
            if (statusFilter) queryParams.append('status', statusFilter);

            const [locResponse, compResponse] = await Promise.all([
                api.get(`/locations?${queryParams.toString()}`),
                api.get('/companies')
            ]);

            if (locResponse.data.success) setLocations(locResponse.data.data);
            if (compResponse.data.success) setCompanies(compResponse.data.data);
        } catch (error) {
            console.error("Failed to fetch location pools", error);
        } finally {
            setLoading(false);
        }
    };

    // Re-fire query execution automatically when filters change
    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            fetchData();
        }, 300); // 300ms Debounce threshold
        return () => clearTimeout(delayDebounce);
    }, [searchQuery, statusFilter]);

    useEffect(() => {
        fetchData();
    }, []);

    // File Input Interceptor
    const handleFileChange = (e) => {
        setSelectedFiles(Array.from(e.target.files));
    };

    // Asynchronous item execution to wipe individual images on the server instantly via Custom Dialog
    const handleRemoveServerImage = async () => {
        const mediaId = confirmImageDelete.targetId;
        setConfirmImageDelete({ show: false, targetId: null });
        try {
            const response = await api.delete(`/locations/media/${mediaId}`);
            if (response.data.success) {
                setExistingImages(prev => prev.filter(img => img.id !== mediaId));
                fetchData();
                setStatusModal({
                    show: true,
                    type: 'success',
                    message: 'Media asset successfully unlinked and purged from local disk arrays.'
                });
            }
        } catch (error) {
            setStatusModal({
                show: true,
                type: 'error',
                message: error.response?.data?.message || 'Failed to execute disk asset wipe.'
            });
        }
    };

    // Modal Handlers
    const openModal = (mode, loc = null) => {
        setModalMode(mode);
        setSelectedLoc(loc);
        setSelectedFiles([]); // Flush previous file caches

        if (loc && (mode === 'edit' || mode === 'view-images')) {
            setExistingImages(loc.media || []); // Bind current images straight into server tracking arrays
            if (mode === 'edit') {
                setFormData({
                    name: loc.name || '',
                    address: loc.address || '',
                    postcode: loc.postcode || '',
                    latitude: loc.latitude || '',
                    longitude: loc.longitude || '',
                    amenities: loc.amenities || '',
                    companyId: loc.companyId || '',
                    isApproved: loc.isApproved || false,
                    city: loc.city || '',
                    state: loc.state || '',
                    countryCode: loc.countryCode || 'GB',
                    partyId: loc.partyId || 'CEV',
                    countryISO: loc.countryISO || 'GBR',
                    parkingType: loc.parkingType || 'UNKNOWN',
                    timeZone: loc.timeZone || 'Europe/London'
                });
            }
        } else {
            setExistingImages([]);
            setFormData({
                name: '', address: '', postcode: '', latitude: '', longitude: '', amenities: '',
                // TENANCY LOCK: Pre-populate and force company id constraints if user is regular company admin
                companyId: user?.role === 'SUPER_ADMIN' ? '' : (user?.companyId || ''),
                isApproved: false, city: '', state: '', countryCode: 'GB', partyId: 'CEV',
                countryISO: 'GBR', parkingType: 'UNKNOWN', timeZone: 'Europe/London'
            });
        }
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedLoc(null);
        setSelectedFiles([]);
        setExistingImages([]);
    };

    // CRUD Operations
    const handleSave = async (e) => {
        e.preventDefault();

        // GEOSPATIAL VECTOR GUARDRAILS
        const lat = parseFloat(formData.latitude);
        const lng = parseFloat(formData.longitude);
        if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
            setStatusModal({
                show: true,
                type: 'error',
                message: 'Validation Error: Coordinates fall outside legal parameters. (Latitude: -90 to 90, Longitude: -180 to 180).'
            });
            return;
        }

        setSubmitting(true);
        const dataWrapper = new FormData();
        Object.keys(formData).forEach(key => {
            dataWrapper.append(key, formData[key]);
        });

        selectedFiles.forEach(file => {
            dataWrapper.append('images', file);
        });

        try {
            const config = { headers: { 'Content-Type': 'multipart/form-data' } };

            if (modalMode === 'create') {
                await api.post('/locations', dataWrapper, config);
            } else if (modalMode === 'edit') {
                await api.put(`/locations/${selectedLoc.id}`, dataWrapper, config);
            }
            fetchData();
            closeModal();
            setStatusModal({
                show: true,
                type: 'success',
                message: 'Location mapping properties synced with live deployment data models.'
            });
        } catch (error) {
            setStatusModal({
                show: true,
                type: 'error',
                message: error.response?.data?.message || 'Failed to save configuration metrics across runtime nodes.'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setSubmitting(true);
        try {
            await api.delete(`/locations/${selectedLoc.id}`);
            fetchData();
            closeModal();
            setStatusModal({
                show: true,
                type: 'success',
                message: 'Location container removed and associated local server disk media purged.'
            });
        } catch (error) {
            setStatusModal({
                show: true,
                type: 'error',
                message: error.response?.data?.message || 'Failed to isolate and drop target infrastructure row.'
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto relative select-none">

            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center space-x-4">
                    <div className="p-3.5 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100 shadow-3xs">
                        <MapPin size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Host Locations</h2>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">Manage physical sites, local asset images, and compliance components</p>
                    </div>
                </div>

                <button
                    onClick={() => openModal('create')}
                    className="flex cursor-pointer items-center justify-center space-x-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 text-xs font-black uppercase tracking-wider transition-all shadow-xs active:scale-95"
                >
                    <Plus size={14} strokeWidth={2.5} />
                    <span>Add Location</span>
                </button>
            </div>

            {/* Dynamic Search & Filtering Hub Section */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-full sm:flex-1">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchString(e.target.value)}
                        className="w-full pl-4 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs font-semibold focus:outline-hidden text-slate-800 focus:ring-2 focus:ring-emerald-500/10 placeholder-slate-400"
                        placeholder="Search by location name, operator, city or postcode..."
                    />
                </div>
                <div className="w-full sm:w-48">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden focus:bg-white cursor-pointer"
                    >
                        <option value="">All Live Statuses</option>
                        <option value="approved">Broadcast Live</option>
                        <option value="pending">Pending Review</option>
                    </select>
                </div>
            </div>

            {/* Main Table Layout */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50/70">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Site Name & Address</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">City & Region</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Operator</th>
                                <th scope="col" className="px-6 py-4 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Media Files</th>
                                <th scope="col" className="px-6 py-4 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Hardware Assets</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Auth Status</th>
                                <th scope="col" className="px-6 py-4 text-right text-[11px] font-black text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-16 text-center text-slate-400">
                                        <MapPin size={24} className="animate-spin mx-auto mb-3 text-emerald-500" />
                                        <p className="text-xs font-bold uppercase tracking-wider animate-pulse">Loading network locations...</p>
                                    </td>
                                </tr>
                            ) : locations.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-16 text-center text-slate-500">
                                        <Building2 size={36} className="mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
                                        <p className="text-sm font-black text-slate-900">No locations found</p>
                                        <p className="text-xs text-slate-400 font-medium mt-0.5">Register a physical site to start deploying hardware.</p>
                                    </td>
                                </tr>
                            ) : (
                                locations.map((loc) => (
                                    <tr key={loc.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-extrabold text-slate-900">{loc.name}</span>
                                                <span className="text-xs font-semibold text-slate-400 mt-0.5">{loc.address}, {loc.postcode}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-extrabold text-slate-700 capitalize">
                                                {loc.city || '—'} <span className="text-[10px] font-bold text-slate-400 font-mono uppercase ml-1">({loc.countryISO})</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-xs font-extrabold text-slate-700">
                                                <Building2 size={13} className="mr-2 text-emerald-500 shrink-0" />
                                                {loc.company?.name || '—'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {loc.media && loc.media.length > 0 ? (
                                                <button
                                                    onClick={() => openModal('view-images', loc)}
                                                    className="inline-flex cursor-pointer items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200/60 hover:bg-amber-100 transition-all shadow-3xs"
                                                >
                                                    <ImageIcon size={11} />
                                                    <span>{loc.media.length} Photos</span>
                                                </button>
                                            ) : (
                                                <span className="text-xs font-bold text-slate-400 italic">No Media</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                {loc._count?.chargePoints ?? 0} EVSEs
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {loc.isApproved ? (
                                                <span className="text-emerald-700 border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center text-[10px] font-black w-max shadow-3xs"><CheckCircle2 size={11} className="mr-1" /> Broadcast Live</span>
                                            ) : (
                                                <span className="text-slate-500 border border-slate-200 bg-slate-50 px-2.5 py-0.5 rounded-full flex items-center text-[10px] font-black w-max"><Clock size={11} className="mr-1" /> Pending</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openModal('edit', loc)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer" title="Edit Location">
                                                    <Edit2 size={14} strokeWidth={2.5} />
                                                </button>
                                                <button onClick={() => openModal('delete', loc)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Delete Location">
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

            {/* Sliding Multi-Context Dialog Layout Modal */}
            {modalMode && (
                <div className="fixed inset-0 z-40 flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity" onClick={closeModal}></div>

                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 z-50">

                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                {modalMode === 'create' && 'Register New OCPI Location'}
                                {modalMode === 'edit' && 'Modify Compliance Scope'}
                                {modalMode === 'delete' && 'Confirm Erasure Protocol'}
                                {modalMode === 'view-images' && `Media Gallery`}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-lg transition-colors cursor-pointer">
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Form Content Area */}
                        {(modalMode === 'create' || modalMode === 'edit') && (
                            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-none outline-hidden">

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* FIXED: Conditional Multi-tenant Drodown Assignment Interceptor Grid Block */}
                                    <div>
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Operator Network Domain</label>
                                        {user?.role === 'SUPER_ADMIN' ? (
                                            <select
                                                required
                                                value={formData.companyId}
                                                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:border-slate-400 outline-hidden transition-all cursor-pointer"
                                            >
                                                <option value="" disabled>Select site manager...</option>
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
                                                    value={companies.find(c => c.id === user?.companyId)?.name || 'Fetching Account Association...'}
                                                    className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed outline-hidden"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Site Placement Name</label>
                                        <input
                                            type="text" required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-slate-400 outline-hidden transition-all"
                                            placeholder="e.g. Spencer Dock Hub"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Physical Address</label>
                                        <input
                                            type="text" required
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-slate-400 outline-hidden transition-all"
                                            placeholder="Humber Quays, Wellington Street"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Postal Code</label>
                                        <input
                                            type="text" required
                                            value={formData.postcode}
                                            onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-slate-400 outline-hidden transition-all uppercase"
                                            placeholder="HU1 2BQ"
                                        />
                                    </div>
                                </div>

                                {/* Dynamic Server-Side Media Gallery Editor Area */}
                                {modalMode === 'edit' && existingImages.length > 0 && (
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center">
                                            <ImageIcon size={13} className="mr-1 text-amber-500 shrink-0" /> Synchronized File Assets
                                        </label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {existingImages.map((img) => (
                                                <div key={img.id} className="relative aspect-video rounded-xl border border-slate-200 overflow-hidden bg-slate-100 group shadow-3xs">
                                                    <img src={img.url} alt="Site asset" className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmImageDelete({ show: true, targetId: img.id })}
                                                        className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
                                                    >
                                                        <Trash2 size={16} className="text-rose-400 hover:scale-110 transition-transform" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* MULTI-FILE ATTACHMENT SELECTOR */}
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center">
                                        <Upload size={13} className="mr-1.5 text-emerald-600 shrink-0" /> {modalMode === 'edit' ? 'Append New Images (Max 5 total)' : 'Site Physical Images (Max 5 files)'}
                                    </label>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="w-full text-xs font-semibold text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer file:cursor-pointer transition-colors"
                                    />
                                    {selectedFiles.length > 0 && (
                                        <p className="text-[11px] font-bold text-emerald-600 mt-1">
                                            {selectedFiles.length} file(s) staged for filesystem synchronization.
                                        </p>
                                    )}
                                </div>

                                {/* GEOMETRIC OCPI META BLOCKS */}
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                                    <p className="text-[10px] font-black tracking-widest text-indigo-600 uppercase flex items-center"><Info size={12} className="mr-1 shrink-0" /> OCPI Geographic Vectors</p>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">City</label>
                                            <input
                                                type="text" required placeholder="Hull"
                                                value={formData.city}
                                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-hidden focus:border-slate-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">State / Region</label>
                                            <input
                                                type="text" placeholder="Optional"
                                                value={formData.state}
                                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-hidden focus:border-slate-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Parking Lot Type</label>
                                            <select
                                                value={formData.parkingType}
                                                onChange={(e) => setFormData({ ...formData, parkingType: e.target.value })}
                                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-hidden cursor-pointer"
                                            >
                                                <option value="UNKNOWN">UNKNOWN</option>
                                                <option value="ON_STREET">ON STREET</option>
                                                <option value="OFF_STREET">OFF STREET</option>
                                                <option value="PARKING_GARAGE">GARAGE</option>
                                                <option value="MALL_PARKING">MALL LOT</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 flex items-center"><Navigation size={11} className="mr-1 text-slate-400" /> Latitude</label>
                                            <input
                                                type="number" step="any" required
                                                value={formData.latitude}
                                                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-xs font-semibold text-slate-800 outline-hidden"
                                                placeholder="53.738360"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 flex items-center"><Navigation size={11} className="mr-1 text-slate-400" /> Longitude</label>
                                            <input
                                                type="number" step="any" required
                                                value={formData.longitude}
                                                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-xs font-semibold text-slate-800 outline-hidden"
                                                placeholder="-0.338320"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Country ISO</label>
                                            <input
                                                type="text" required placeholder="GBR"
                                                value={formData.countryISO}
                                                onChange={(e) => setFormData({ ...formData, countryISO: e.target.value })}
                                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800 uppercase outline-hidden"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Party CPO ID</label>
                                            <input
                                                type="text" required placeholder="CEV"
                                                value={formData.partyId}
                                                onChange={(e) => setFormData({ ...formData, partyId: e.target.value })}
                                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800 uppercase outline-hidden"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Zone Reference</label>
                                            <input
                                                type="text" required placeholder="Europe/London"
                                                value={formData.timeZone}
                                                onChange={(e) => setFormData({ ...formData, timeZone: e.target.value })}
                                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-hidden"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 flex items-center"><Coffee size={13} className="mr-1 text-slate-400 shrink-0" /> Amenities Context Tags</label>
                                    <input
                                        type="text"
                                        value={formData.amenities}
                                        onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-slate-400 outline-hidden transition-all"
                                        placeholder="e.g. Restrooms, Cafe, 24/7 Access"
                                    />
                                </div>

                                {modalMode === 'edit' && user?.role === 'SUPER_ADMIN' && (
                                    <div className="pt-2">
                                        <label className="flex items-center space-x-3 cursor-pointer group w-fit">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.isApproved ? 'bg-emerald-600 border-emerald-600' : 'bg-slate-50 border-slate-300'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.isApproved}
                                                    onChange={(e) => setFormData({ ...formData, isApproved: e.target.checked })}
                                                    className="hidden"
                                                />
                                                {formData.isApproved && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
                                            </div>
                                            <span className="text-xs font-black text-slate-700 uppercase tracking-wide select-none">Publish configuration straight to public Open Data map networks</span>
                                        </label>
                                    </div>
                                )}

                                <div className="flex space-x-3 pt-4 border-t border-slate-100 mt-6">
                                    <button type="button" onClick={closeModal} className="flex-1 py-2 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={submitting} className="flex-1 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-800 transition-all shadow-sm cursor-pointer">
                                        {submitting ? 'Synchronizing...' : 'Commit Site Changes'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Image Viewer Layout Panel */}
                        {modalMode === 'view-images' && selectedLoc && (
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1 scrollbar-none">
                                    {selectedLoc.media?.map((m) => (
                                        <div key={m.id} className="relative aspect-video rounded-xl border border-slate-200 overflow-hidden bg-slate-100 group shadow-3xs">
                                            <img
                                                src={m.url}
                                                alt="Location deployment"
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1563720223185-11003d516935?w=500&auto=format&fit=crop&q=60"; }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-4 border-t border-slate-100 text-right">
                                    <button onClick={closeModal} className="px-5 py-2 bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-slate-800 transition-all shadow-md cursor-pointer">
                                        Close Gallery
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Delete Confirm Container Section */}
                        {modalMode === 'delete' && selectedLoc && (
                            <div className="p-6 space-y-6">
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <div className="h-14 w-14 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 shadow-inner">
                                        <AlertCircle size={26} />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-black text-slate-900">Erase Location Node?</h4>
                                        <p className="text-xs text-slate-400 mt-2 max-w-sm font-semibold leading-relaxed">
                                            You are requesting erasure execution on: <span className="text-slate-800 font-black">"{selectedLoc.name}"</span>. Hard relational constraints prevent drop execution if hardware charge points remain tied.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex space-x-3 pt-4 border-t border-slate-100">
                                    <button onClick={closeModal} className="flex-1 py-2 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">Cancel</button>
                                    <button onClick={handleDelete} disabled={submitting} className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer">
                                        {submitting ? 'Dropping...' : 'Confirm Erasure'}
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}

            {/* INTERSTITIAL COMPONENT IMAGE DELETE CONFIRM OVERLAY */}
            {confirmImageDelete.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="fixed inset-0 bg-slate-950/40" onClick={() => setConfirmImageDelete({ show: false, targetId: null })}></div>
                    <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
                        <div className="flex items-start space-x-4">
                            <div className="p-3 bg-amber-50 rounded-xl text-amber-600 shrink-0">
                                <AlertTriangle size={20} />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-base font-extrabold text-slate-900">Purge Server Disk Image?</h4>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    This execution will drop the selected relational reference block from Prisma and erase its binary trace from filesystem memory permanently.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button
                                type="button"
                                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                                onClick={() => setConfirmImageDelete({ show: false, targetId: null })}
                            >
                                Retain Asset
                            </button>
                            <button
                                type="button"
                                onClick={handleRemoveServerImage}
                                className="flex-1 px-4 py-2.5 bg-rose-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-rose-700 transition-colors shadow-sm cursor-pointer"
                            >
                                Confirm Purge
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* HIGH VISIBILITY APP-WIDE TRANSACTION NOTIFIER */}
            {statusModal.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-3xs" onClick={() => setStatusModal({ ...statusModal, show: false })}></div>
                    <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center relative">
                            {statusModal.type === 'success' ? (
                                <>
                                    <div className="absolute inset-0 bg-emerald-50 rounded-full animate-pulse" />
                                    <CheckCircle2 size={32} className="text-emerald-500 relative z-10" />
                                </>
                            ) : (
                                <>
                                    <div className="absolute inset-0 bg-rose-50 rounded-full animate-pulse" />
                                    <AlertCircle size={32} className="text-rose-600 relative z-10" />
                                </>
                            )}
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-black text-slate-900 tracking-tight uppercase tracking-wider">
                                {statusModal.type === 'success' ? 'Database Mutated' : 'Validation Halt'}
                            </h4>
                            <p className="text-xs text-slate-500 font-semibold leading-relaxed px-2">
                                {statusModal.message}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setStatusModal({ ...statusModal, show: false })}
                            className={`w-full py-2 text-xs font-black uppercase tracking-wider rounded-xl text-white shadow-xs transition-colors cursor-pointer ${statusModal.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                        >
                            Dismiss Notifier
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}