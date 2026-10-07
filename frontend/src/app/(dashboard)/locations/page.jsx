'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import BrandLoader from '@/components/BrandLoader';
import {
    MapPin, Edit2, Trash2, X, Globe, Eye,
    AlertCircle, CheckCircle2, Clock, Coffee,
    Building2, Navigation, Info, Upload, Image as ImageIcon,
    Zap, ExternalLink, Calendar, Hash, ShieldCheck, Copy, Check
} from 'lucide-react';

export default function LocationsPage() {
    const { user } = useAuthStore();

    // Data States
    const [locations, setLocations] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal Control States
    const [modalMode, setModalMode] = useState(null); // 'create', 'edit', 'delete', 'details'
    const [selectedLoc, setSelectedLoc] = useState(null);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'media', 'infrastructure'

    // File Handling (used by the "Add location" create form only)
    const [selectedFiles, setSelectedFiles] = useState([]);

    // Feedback Modals
    const [statusModal, setStatusModal] = useState({ show: false, type: 'success', message: '' });
    const [searchQuery, setSearchString] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [copiedRefId, setCopiedRefId] = useState(null);

    // Form State
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

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            fetchData();
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [searchQuery, statusFilter]);

    useEffect(() => {
        fetchData();
    }, []);

    const handleCopyRefId = async (refId) => {
        try {
            await navigator.clipboard.writeText(refId);
            setCopiedRefId(refId);
            setTimeout(() => setCopiedRefId((current) => (current === refId ? null : current)), 1500);
        } catch (error) {
            console.error("Failed to copy host reference ID", error);
        }
    };

    const handleFileChange = (e) => {
        setSelectedFiles(Array.from(e.target.files));
    };

    const openModal = (mode, loc = null) => {
        setModalMode(mode);
        setSelectedLoc(loc);
        setSelectedFiles([]);
        setActiveTab('overview');

        if (!loc) {
            setFormData({
                name: '', address: '', postcode: '', latitude: '', longitude: '', amenities: '',
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

    const handleSave = async (e) => {
        e.preventDefault();

        const lat = parseFloat(formData.latitude);
        const lng = parseFloat(formData.longitude);
        if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
            setStatusModal({
                show: true,
                type: 'error',
                message: 'Validation Error: Latitude (-90 to 90) or Longitude (-180 to 180) is invalid.'
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
            }
            fetchData();
            closeModal();
            setStatusModal({
                show: true,
                type: 'success',
                message: 'Location data synchronized successfully.'
            });
        } catch (error) {
            setStatusModal({
                show: true,
                type: 'error',
                message: error.response?.data?.message || 'Failed to save location parameters.'
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
                message: 'Location container and media assets purged.'
            });
        } catch (error) {
            setStatusModal({
                show: true,
                type: 'error',
                message: error.response?.data?.message || 'Failed to delete location.'
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto relative select-none pb-12">

            {/* Top Banner */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center space-x-4">
                    <div className="p-3.5 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100 shadow-2xs">
                        <MapPin size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold text-slate-950 tracking-tight">Locations</h2>
                        <p className="text-sm text-slate-500 mt-1">Places where your chargers are installed.</p>
                    </div>
                </div>

                {/* Location creation from the portal is paused for now - intentionally hidden. */}
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative w-full sm:flex-1">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchString(e.target.value)}
                        className="w-full pl-4 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs font-semibold focus:outline-none text-slate-800 focus:ring-2 focus:ring-emerald-500/10 placeholder-slate-400"
                        placeholder="Search by name, city, or postcode"
                    />
                </div>
                <div className="w-full sm:w-48">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:bg-white cursor-pointer"
                    >
                        <option value="">All Statuses</option>
                        <option value="approved">Live on the feed</option>
                        <option value="pending">Waiting for approval</option>
                    </select>
                </div>
            </div>

            {/* Loading / empty states (shared by both layouts below) */}
            {loading ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 py-16">
                    <BrandLoader label="Loading locations" />
                </div>
            ) : locations.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 py-16 text-center text-slate-500">
                    <Building2 size={36} className="mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-slate-900">No locations yet</p>
                </div>
            ) : (
                <>
                    {/* Mobile card list (below md) */}
                    <div className="md:hidden space-y-3">
                        {locations.map((loc) => (
                            <div key={loc.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-extrabold text-slate-900 truncate">{loc.name}</p>
                                        <p className="text-xs font-semibold text-slate-400 truncate">{loc.address}{loc.city ? `, ${loc.city}` : ''}</p>
                                        <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">#{loc.locationUid || loc.id}</p>
                                    </div>
                                    {loc.isApproved ? (
                                        <span className="shrink-0 text-emerald-700 border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center text-[10px] font-black">
                                            <CheckCircle2 size={11} className="mr-1" /> Live
                                        </span>
                                    ) : (
                                        <span className="shrink-0 text-amber-700 border border-amber-200 bg-amber-50 px-2.5 py-0.5 rounded-full flex items-center text-[10px] font-black">
                                            <Clock size={11} className="mr-1" /> Waiting
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 border-t border-slate-100 pt-2.5">
                                    <span className="flex items-center gap-1.5 min-w-0">
                                        <Building2 size={12} className="text-emerald-600 shrink-0" />
                                        <span className="truncate">{loc.operator?.name || loc.companyName || '—'}</span>
                                    </span>
                                    <span className="shrink-0 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600">
                                        {loc.chargePointsCount ?? loc.chargePoints?.length ?? 0} EVSEs
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <button onClick={() => openModal('details', loc)} className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200 text-slate-600 cursor-pointer">
                                        <Eye size={13} /> View
                                    </button>
                                    <a href={`/locations/enrich?id=${loc.id}`} className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 border border-emerald-100 text-emerald-700 cursor-pointer">
                                        <Edit2 size={13} /> Edit
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop table (md and up) */}
                    <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50/70">
                                    <tr>
                                        <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Site & UID</th>
                                        <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Location / City</th>
                                        <th scope="col" className="hidden xl:table-cell px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Operator / Host ID</th>
                                        <th scope="col" className="hidden xl:table-cell px-6 py-4 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Media</th>
                                        <th scope="col" className="hidden lg:table-cell px-6 py-4 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">EVSEs</th>
                                        <th scope="col" className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Status</th>
                                        <th scope="col" className="px-6 py-4 text-right text-[11px] font-black text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {locations.map((loc) => (
                                        <tr key={loc.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-extrabold text-slate-900">{loc.name}</span>
                                                    <div className="flex items-center space-x-2 mt-0.5">
                                                        <span className="text-[10px] font-mono font-bold text-slate-400">#{loc.locationUid || loc.id}</span>
                                                        <span className="text-xs font-semibold text-slate-400">{loc.address}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-xs font-extrabold text-slate-700 capitalize">
                                                    {loc.city || '—'} <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">({loc.countryISO})</span>
                                                    <div className="text-[10px] font-mono text-slate-400 font-semibold">{loc.postcode}</div>
                                                </div>
                                            </td>
                                            <td className="hidden xl:table-cell px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center text-xs font-extrabold text-slate-800">
                                                        <Building2 size={13} className="mr-2 text-emerald-600 shrink-0" />
                                                        {loc.operator?.name || loc.companyName || '—'}
                                                    </div>
                                                    {loc.operatorReferenceId ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyRefId(loc.operatorReferenceId)}
                                                            title="Copy host reference ID"
                                                            className="mt-1 inline-flex items-center gap-1.5 w-fit px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer group/copy"
                                                        >
                                                            <span className="text-[10px] font-mono font-bold text-slate-500">{loc.operatorReferenceId}</span>
                                                            {copiedRefId === loc.operatorReferenceId ? (
                                                                <Check size={10} className="text-emerald-600 shrink-0" />
                                                            ) : (
                                                                <Copy size={10} className="text-slate-400 group-hover/copy:text-slate-600 shrink-0" />
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <span className="mt-1 text-[10px] font-semibold text-slate-300 italic">No host ID assigned</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="hidden xl:table-cell px-6 py-4 whitespace-nowrap text-center">
                                                {loc.images && loc.images.length > 0 ? (
                                                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                                                        <ImageIcon size={11} />
                                                        <span>{loc.images.length} Photos</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-bold text-slate-400 italic">No Media</span>
                                                )}
                                            </td>
                                            <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-center">
                                                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                    {loc.chargePointsCount ?? loc.chargePoints?.length ?? 0} EVSEs
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {loc.isApproved ? (
                                                    <span className="text-emerald-700 border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center text-[10px] font-black w-max">
                                                        <CheckCircle2 size={11} className="mr-1" /> Live
                                                    </span>
                                                ) : (
                                                    <span className="text-amber-700 border border-amber-200 bg-amber-50 px-2.5 py-0.5 rounded-full flex items-center text-[10px] font-black w-max">
                                                        <Clock size={11} className="mr-1" /> Waiting
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end space-x-1">
                                                    <button onClick={() => openModal('details', loc)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" title="View details">
                                                        <Eye size={15} />
                                                    </button>
                                                    <a href={`/locations/enrich?id=${loc.id}`} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer" title="Edit">
                                                        <Edit2 size={15} />
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Modals Container */}
            {modalMode && (
                <div className="fixed inset-0 z-40 flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity" onClick={closeModal}></div>

                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 z-50">

                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                {modalMode === 'create' && 'Add new location'}
                                {modalMode === 'details' && 'View details'}
                                {modalMode === 'delete' && 'Delete location'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-lg transition-colors cursor-pointer">
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Details Modal (Tabbed Drawer) */}
                        {modalMode === 'details' && selectedLoc && (
                            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

                                {/* Header */}
                                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900">{selectedLoc.name}</h3>
                                        <p className="text-xs text-slate-500 font-medium mt-0.5">{selectedLoc.address}, {selectedLoc.postcode}</p>
                                        <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md mt-2 inline-block">
                                            UID: {selectedLoc.locationUid}
                                        </span>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${selectedLoc.isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }`}>
                                        {selectedLoc.isApproved ? 'Broadcast Live' : 'Pending Approval'}
                                    </span>
                                </div>

                                {/* Tabs Navigation */}
                                <div className="flex border-b border-slate-100 gap-4">
                                    <button
                                        onClick={() => setActiveTab('overview')}
                                        className={`pb-2 text-xs font-black uppercase tracking-wider cursor-pointer border-b-2 transition-all ${activeTab === 'overview' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400'
                                            }`}
                                    >
                                        Overview & Metadata
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('media')}
                                        className={`pb-2 text-xs font-black uppercase tracking-wider cursor-pointer border-b-2 transition-all ${activeTab === 'media' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400'
                                            }`}
                                    >
                                        Media Assets ({selectedLoc.images?.length || 0})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('infrastructure')}
                                        className={`pb-2 text-xs font-black uppercase tracking-wider cursor-pointer border-b-2 transition-all ${activeTab === 'infrastructure' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400'
                                            }`}
                                    >
                                        Hardware EVSEs ({selectedLoc.chargePoints?.length || 0})
                                    </button>
                                </div>

                                {/* TAB 1: OVERVIEW */}
                                {activeTab === 'overview' && (
                                    <div className="space-y-4 text-xs">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="text-[9px] font-black uppercase text-slate-400">City / Region</span>
                                                <p className="font-bold text-slate-800 mt-0.5">{selectedLoc.city || 'N/A'}, {selectedLoc.state || ''} ({selectedLoc.countryISO})</p>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="text-[9px] font-black uppercase text-slate-400">Operator Entity</span>
                                                <p className="font-bold text-slate-800 mt-0.5">{selectedLoc.operator?.name || selectedLoc.companyName}</p>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="text-[9px] font-black uppercase text-slate-400">Coordinates</span>
                                                <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedLoc.latitude}, {selectedLoc.longitude}</p>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="text-[9px] font-black uppercase text-slate-400">Parking Lot Type</span>
                                                <p className="font-bold text-slate-800 mt-0.5">{selectedLoc.parkingType}</p>
                                            </div>
                                        </div>

                                        {selectedLoc.amenities && selectedLoc.amenities.length > 0 && (
                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Amenities Tags</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {selectedLoc.amenities.map((item, idx) => (
                                                        <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-700">
                                                            {item}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 2: MEDIA ASSETS */}
                                {activeTab === 'media' && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {selectedLoc.images && selectedLoc.images.length > 0 ? (
                                            selectedLoc.images.map((img) => (
                                                <div key={img.id} className="relative aspect-video rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
                                                    <img src={img.url} alt="Site asset" className="w-full h-full object-cover" />
                                                </div>
                                            ))
                                        ) : (
                                            <p className="col-span-full text-center text-slate-400 text-xs py-8">No image files uploaded for this location.</p>
                                        )}
                                    </div>
                                )}

                                {/* TAB 3: INFRASTRUCTURE EVSEs */}
                                {activeTab === 'infrastructure' && (
                                    <div className="space-y-3">
                                        {selectedLoc.chargePoints && selectedLoc.chargePoints.length > 0 ? (
                                            selectedLoc.chargePoints.map((cp) => (
                                                <div key={cp.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                                    <div className="flex items-center justify-between text-xs font-bold">
                                                        <span className="font-mono text-slate-900">{cp.hardwareId}</span>
                                                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-black bg-emerald-100 text-emerald-800">
                                                            {cp.status}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-500">
                                                        Connectors: {cp.connectors?.map(c => `${c.standard} (${c.maxPowerKw}kW)`).join(', ')}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-center text-slate-400 text-xs py-8">No EVSE charge points registered to this site.</p>
                                        )}
                                    </div>
                                )}

                                <div className="pt-4 border-t border-slate-100 space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <a href={`/locations/enrich?id=${selectedLoc.id}`} className="text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer inline-flex items-center gap-1.5">
                                            <Edit2 size={13} /> Edit this location →
                                        </a>
                                        <button onClick={closeModal} className="px-5 py-2 bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-slate-800 cursor-pointer">
                                            Close
                                        </button>
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => openModal('delete', selectedLoc)}
                                            className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                                        >
                                            Delete this location
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Form Area (Create) */}
                        {modalMode === 'create' && (
                            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Operator Network Domain</label>
                                        {user?.role === 'SUPER_ADMIN' ? (
                                            <select
                                                required
                                                value={formData.companyId}
                                                onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:border-slate-400 outline-none transition-all cursor-pointer"
                                            >
                                                <option value="" disabled>Select operator...</option>
                                                {companies.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                disabled
                                                value={companies.find(c => c.id === user?.companyId)?.name || 'Account Association'}
                                                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed outline-none"
                                            />
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Site Placement Name</label>
                                        <input
                                            type="text" required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-slate-400 outline-none transition-all"
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
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-slate-400 outline-none transition-all"
                                            placeholder="Humber Quays, Wellington Street"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Postal Code</label>
                                        <input
                                            type="text" required
                                            value={formData.postcode}
                                            onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-slate-400 outline-none transition-all uppercase"
                                            placeholder="HU1 2BQ"
                                        />
                                    </div>
                                </div>

                                {/* Upload Control */}
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center">
                                        <Upload size={13} className="mr-1.5 text-emerald-600 shrink-0" /> Site Physical Images
                                    </label>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="w-full text-xs font-semibold text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer transition-colors"
                                    />
                                </div>

                                {/* OCPI Geographic Metadata */}
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                                    <p className="text-[10px] font-black tracking-widest text-indigo-600 uppercase flex items-center"><Info size={12} className="mr-1 shrink-0" /> OCPI Geographic Vectors</p>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">City</label>
                                            <input
                                                type="text" required placeholder="Hull"
                                                value={formData.city}
                                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">State / Region</label>
                                            <input
                                                type="text" placeholder="Optional"
                                                value={formData.state}
                                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Parking Type</label>
                                            <select
                                                value={formData.parkingType}
                                                onChange={(e) => setFormData({ ...formData, parkingType: e.target.value })}
                                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                                            >
                                                <option value="UNKNOWN">UNKNOWN</option>
                                                <option value="ON_STREET">ON STREET</option>
                                                <option value="OFF_STREET">OFF STREET</option>
                                                <option value="PARKING_GARAGE">GARAGE</option>
                                                <option value="MALL_PARKING">MALL LOT</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Party ID</label>
                                            <input
                                                type="text" placeholder="CEV"
                                                value={formData.partyId}
                                                onChange={(e) => setFormData({ ...formData, partyId: e.target.value.toUpperCase() })}
                                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono uppercase text-xs font-semibold text-slate-800 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Country Code</label>
                                            <input
                                                type="text" placeholder="GB"
                                                value={formData.countryCode}
                                                onChange={(e) => setFormData({ ...formData, countryCode: e.target.value.toUpperCase() })}
                                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono uppercase text-xs font-semibold text-slate-800 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Country (ISO-3)</label>
                                            <input
                                                type="text" placeholder="GBR"
                                                value={formData.countryISO}
                                                onChange={(e) => setFormData({ ...formData, countryISO: e.target.value.toUpperCase() })}
                                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono uppercase text-xs font-semibold text-slate-800 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Latitude</label>
                                            <input
                                                type="number" step="any" required
                                                value={formData.latitude}
                                                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-xs font-semibold text-slate-800 outline-none"
                                                placeholder="53.738360"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Longitude</label>
                                            <input
                                                type="number" step="any" required
                                                value={formData.longitude}
                                                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-xs font-semibold text-slate-800 outline-none"
                                                placeholder="-0.338320"
                                            />
                                        </div>
                                    </div>
                                </div>

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

                        {/* Delete Confirmation */}
                        {modalMode === 'delete' && selectedLoc && (
                            <div className="p-6 space-y-6">
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <div className="h-14 w-14 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 shadow-inner">
                                        <AlertCircle size={26} />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-black text-slate-900">Erase Location Node?</h4>
                                        <p className="text-xs text-slate-400 mt-2 max-w-sm font-semibold leading-relaxed">
                                            Warning: You are requesting erasure execution on: <span className="text-slate-800 font-black">"{selectedLoc.name}"</span>.
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


            {/* Notification Toast */}
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
                            className={`w-full py-2 text-xs font-black uppercase tracking-wider rounded-xl text-white shadow-2xs transition-colors cursor-pointer ${statusModal.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                        >
                            Acknowledge
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}