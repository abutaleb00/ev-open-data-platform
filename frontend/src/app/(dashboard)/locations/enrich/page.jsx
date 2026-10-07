'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import BrandLoader from '@/components/BrandLoader';
import {
    ArrowLeft, Globe, Save, ShieldAlert, CheckCircle2,
    MapPin, Building2, HelpCircle, ToggleLeft, ToggleRight, Zap, Layers,
    Image as ImageIcon, EyeOff, Plus, Trash2, Tag, X, ChevronDown, Compass, Users,
    Navigation, Radio, Info, PencilLine, Upload, ShieldCheck, Lock
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Small local presentational primitives (no shared UI kit exists in this repo -
// these stay file-local since only this page uses them).
// ---------------------------------------------------------------------------

const TABS = [
    { key: 'basic', label: 'Basic Info', icon: PencilLine },
    { key: 'overview', label: 'Overview & Access', icon: Globe },
    { key: 'details', label: 'Location Details', icon: MapPin },
    { key: 'media', label: 'Media Gallery', icon: ImageIcon },
    { key: 'energy', label: 'Energy & Operator', icon: Zap },
    { key: 'evses', label: 'Charging Units', icon: Layers }
];

function FieldLabel({ icon: Icon, children, hint, trailing }) {
    return (
        <div className="flex items-center justify-between gap-2 mb-1.5">
            <label className="flex items-center text-xs font-semibold text-slate-600">
                {Icon && <Icon size={13} className="mr-1.5 text-slate-400" />}
                {children}
                {hint && <span className="ml-1.5 font-normal text-slate-400 normal-case">{hint}</span>}
            </label>
            {trailing}
        </div>
    );
}

function EditableBadge() {
    return (
        <span className="inline-flex shrink-0 items-center text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            Editable
        </span>
    );
}

function TagInput({ values, onAdd, onRemove, placeholder, draft, onDraftChange }) {
    const commit = () => {
        const v = draft.trim();
        if (v) onAdd(v);
        onDraftChange('');
    };

    return (
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex flex-wrap gap-1.5 min-h-[1.75rem]">
                {values.length === 0 && (
                    <span className="text-xs text-slate-400 italic">No entries yet</span>
                )}
                {values.map((v, i) => (
                    <span key={`${v}-${i}`} className="inline-flex items-center gap-1 bg-white border border-slate-200 text-slate-700 text-xs font-medium pl-2.5 pr-1.5 py-1 rounded-lg">
                        {v}
                        <button type="button" onClick={() => onRemove(i)} className="p-0.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer">
                            <X size={11} strokeWidth={2.5} />
                        </button>
                    </span>
                ))}
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={draft}
                    onChange={(e) => onDraftChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            commit();
                        }
                    }}
                    placeholder={placeholder}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:border-slate-400 outline-none transition-colors"
                />
                <button type="button" onClick={commit} className="inline-flex items-center space-x-1 text-[11px] font-semibold px-2.5 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
                    <Plus size={12} strokeWidth={2.5} />
                    <span>Add</span>
                </button>
            </div>
        </div>
    );
}

function LockedBadge({ className = '' }) {
    return (
        <span className={`inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 bg-slate-100 border border-slate-200 rounded-full px-2 py-1 ${className}`}>
            <Lock size={10} strokeWidth={2.5} /> Locked
        </span>
    );
}

function ToggleRow({ icon: Icon, label, description, checked, onChange, tone = 'emerald', disabled = false }) {
    const toneClasses = checked
        ? (tone === 'emerald' ? 'text-emerald-600' : 'text-indigo-600')
        : 'text-slate-300';

    return (
        <div className={`flex items-center justify-between p-4 rounded-2xl border ${disabled ? 'bg-slate-50/60 border-dashed border-slate-300' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-start space-x-3 min-w-0 pr-4">
                {Icon && <Icon size={16} className={`mt-0.5 shrink-0 ${disabled ? 'text-slate-300' : 'text-slate-400'}`} />}
                <div className="min-w-0">
                    <span className={`text-sm font-semibold block ${disabled ? 'text-slate-400' : 'text-slate-800'}`}>{label}</span>
                    <span className="text-xs text-slate-400 font-medium">{description}</span>
                </div>
            </div>
            {disabled ? (
                <LockedBadge />
            ) : (
                <button type="button" onClick={onChange} className={`shrink-0 cursor-pointer hover:scale-105 transition-transform ${toneClasses}`}>
                    {checked ? <ToggleRight size={30} /> : <ToggleLeft size={30} />}
                </button>
            )}
        </div>
    );
}

// Deliberately styled to look nothing like an editable input (dashed border,
// washed-out fill, muted text, lock icon) - an earlier flat-grey treatment was
// too close to the real input style and hosts couldn't tell edit vs. locked apart.
function ReadOnlyField({ children, value, placeholder = 'Not set' }) {
    return (
        <div>
            <FieldLabel icon={Lock} hint="Locked">{children}</FieldLabel>
            <div className="w-full px-3 py-2.5 bg-slate-50/60 border border-dashed border-slate-300 rounded-xl text-sm font-medium text-slate-400 cursor-not-allowed truncate">
                {value || <span className="italic text-slate-300">{placeholder}</span>}
            </div>
        </div>
    );
}

function SectionCard({ icon: Icon, title, description, children, tone = 'indigo', locked = false }) {
    const toneClasses = locked
        ? 'bg-slate-100 text-slate-400 border-slate-200'
        : tone === 'amber'
            ? 'bg-amber-50 text-amber-600 border-amber-100'
            : tone === 'emerald'
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                : 'bg-indigo-50 text-indigo-600 border-indigo-100';

    return (
        <div className="bg-white p-6 md:p-7 rounded-3xl border border-slate-200/70 shadow-xs space-y-5">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3 min-w-0">
                    <div className={`p-2.5 rounded-xl border shrink-0 ${toneClasses}`}><Icon size={17} strokeWidth={2.25} /></div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                        {description && <p className="text-xs text-slate-400 font-medium">{description}</p>}
                    </div>
                </div>
                {locked && <LockedBadge />}
            </div>
            {children}
        </div>
    );
}

const inputClass = "w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-slate-400 outline-none transition-all";
const selectClass = `${inputClass} cursor-pointer`;

function EnrichFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const rawLocationId = searchParams.get('id') || '';
    const { user } = useAuthStore();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingPhotos, setUploadingPhotos] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');
    const [expandedEvses, setExpandedEvses] = useState(new Set([0]));
    const [facilityDraft, setFacilityDraft] = useState('');
    const [evseTagDraft, setEvseTagDraft] = useState({});
    const [statusFeedback, setStatusFeedback] = useState({ show: false, type: 'success', message: '' });
    const [companies, setCompanies] = useState([]);

    const [formData, setFormData] = useState({
        name: '', address: '', postcode: '', city: '', state: '', countryCode: 'GB', countryISO: '', companyName: '', partyId: '',
        companyId: '', isApproved: false,
        latitude: '', longitude: '',

        parkingType: 'UNKNOWN',
        timeZone: 'Europe/London',
        facilities: [],
        directions: '',
        chargingWhenClosed: false,
        publish: true,
        publishAllowedTo: [],
        relatedLocations: [],

        locationImages: [],

        suboperatorName: '', suboperatorWebsite: '', suboperatorLogoUrl: '',
        isGreenEnergy: false, energySupplier: '', energyProduct: '',

        evses: []
    });

    useEffect(() => {
        if (isSuperAdmin) {
            api.get('/companies').then((res) => {
                if (res.data?.success) setCompanies(res.data.data);
            }).catch(() => {});
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        if (!rawLocationId) return;

        const fetchLocationDetails = async () => {
            try {
                const response = await api.get('/locations');
                let target = null;
                let usedPrimarySource = false;

                if (response.data && response.data.success && Array.isArray(response.data.data)) {
                    const cleanSearchId = rawLocationId.replace('loc_', '').trim();
                    target = response.data.data.find(loc =>
                        String(loc.id) === cleanSearchId ||
                        loc.locationUid === rawLocationId ||
                        loc.locationUid === `loc_${cleanSearchId}`
                    );
                    if (target) usedPrimarySource = true;
                }

                if (!target) {
                    const feedRes = await api.get(`/open-data/feed?search=${rawLocationId}`);
                    if (feedRes.data && feedRes.data.data && feedRes.data.data.length > 0) {
                        target = feedRes.data.data[0];
                    }
                }

                if (target) {
                    const existingImages = Array.isArray(target.images) && target.images.length > 0
                        ? target.images.map(i => typeof i === 'string' ? i : i.url)
                        : (Array.isArray(target.media) && target.media.length > 0
                            ? target.media.map(m => m.url)
                            : []);

                    const toTagArray = (arr, str) => {
                        if (Array.isArray(arr)) return arr.filter(Boolean);
                        if (typeof str === 'string' && str.trim()) return str.split(',').map(s => s.trim()).filter(Boolean);
                        return [];
                    };

                    // The /locations list endpoint returns a thin nested chargePoints shape
                    // (no floorLevel/parkingRestrictions/directions/evseImages) - fetch the
                    // rich per-EVSE record set from /charge-points instead, so the form shows
                    // (and round-trips) what's actually stored rather than silently blanking it.
                    let evsesSource = target.chargePoints || target.evses || [];
                    if (usedPrimarySource) {
                        try {
                            const cpRes = await api.get('/charge-points');
                            if (cpRes.data?.success && Array.isArray(cpRes.data.data)) {
                                evsesSource = cpRes.data.data.filter(cp => cp.locationId === target.id);
                            }
                        } catch (_) {
                            // Fall back to the thin list rather than blocking the whole page load.
                        }
                    }

                    setFormData({
                        name: target.name || '',
                        address: target.address || '',
                        postcode: target.postcode || target.postal_code || '',
                        city: target.city || '',
                        state: target.state || '',
                        countryCode: target.countryCode || target.country_code || 'GB',
                        countryISO: target.countryISO || target.country || 'GBR',
                        companyName: target.companyName || target.operator?.name || 'Network Operator',
                        companyId: target.companyId || '',
                        isApproved: Boolean(target.isApproved),
                        partyId: target.partyId || target.party_id || '',
                        latitude: target.latitude || target.coordinates?.latitude || '0.000000',
                        longitude: target.longitude || target.coordinates?.longitude || '0.000000',

                        parkingType: target.parkingType || target.parking_type || 'UNKNOWN',
                        timeZone: target.timeZone || target.time_zone || 'Europe/London',
                        facilities: toTagArray(target.facilities || target.amenities, typeof target.amenities === 'string' ? target.amenities : null),
                        directions: Array.isArray(target.directions) && target.directions.length > 0
                            ? target.directions[0].text || target.directions[0]
                            : (typeof target.directions === 'string' ? target.directions : ''),
                        chargingWhenClosed: Boolean(target.chargingWhenClosed || target.charging_when_closed),
                        publish: target.publish ?? true,
                        publishAllowedTo: Array.isArray(target.publishAllowedTo || target.publish_allowed_to)
                            ? (target.publishAllowedTo || target.publish_allowed_to).map(p => ({ uid: p?.uid || '', type: p?.type || 'RFID' }))
                            : [],
                        relatedLocations: Array.isArray(target.relatedLocations || target.related_locations)
                            ? (target.relatedLocations || target.related_locations).map(r => ({
                                latitude: r?.latitude !== undefined && r?.latitude !== null ? String(r.latitude) : '',
                                longitude: r?.longitude !== undefined && r?.longitude !== null ? String(r.longitude) : '',
                                name: (r?.name && (r.name.text || r.name)) || (typeof r === 'string' ? r : '')
                            }))
                            : [],
                        locationImages: existingImages,

                        suboperatorName: target.suboperatorName || target.suboperator?.name || '',
                        suboperatorWebsite: target.suboperatorWebsite || target.suboperator?.website || '',
                        suboperatorLogoUrl: target.suboperatorLogoUrl || target.suboperator?.logo?.url || '',
                        isGreenEnergy: Boolean(target.energyMix?.is_green_energy || target.energy_mix?.is_green_energy),
                        energySupplier: target.energyMix?.supplier_name || target.energy_mix?.supplier_name || '',
                        energyProduct: target.energyMix?.energy_product_name || target.energy_mix?.energy_product_name || '',

                        evses: evsesSource.map(evse => ({
                            id: evse.id || evse.uid,
                            evse_id: evse.hardwareId || evse.evse_id || '',
                            floor_level: evse.floorLevel || evse.floor_level || '',
                            parking_restrictions: toTagArray(evse.parkingRestrictions || evse.parking_restrictions, null),
                            latitude: evse.evseLatitude || evse.coordinates?.latitude || '',
                            longitude: evse.evseLongitude || evse.coordinates?.longitude || '',
                            directions: Array.isArray(evse.directions) && evse.directions.length > 0
                                ? evse.directions[0].text || evse.directions[0]
                                : (typeof evse.directions === 'string' ? evse.directions : ''),
                            images: Array.isArray(evse.images) && evse.images.length > 0
                                ? evse.images.map(i => typeof i === 'string' ? i : i.url)
                                : []
                        }))
                    });

                    setExpandedEvses(new Set(evsesSource.length === 1 ? [0] : []));
                } else {
                    setStatusFeedback({ show: true, type: 'error', message: `Location record #${rawLocationId} not found.` });
                }
            } catch (err) {
                console.error("Enrichment details load error:", err);
                setStatusFeedback({ show: true, type: 'error', message: 'Failed to fetch location records.' });
            } finally {
                setLoading(false);
            }
        };

        fetchLocationDetails();
    }, [rawLocationId]);

    // --- Facilities (tag chips) -------------------------------------------------
    const addFacility = (value) => {
        if (formData.facilities.some(f => f.toLowerCase() === value.toLowerCase())) return;
        setFormData({ ...formData, facilities: [...formData.facilities, value] });
    };
    const removeFacility = (index) => {
        setFormData({ ...formData, facilities: formData.facilities.filter((_, i) => i !== index) });
    };

    // --- Related locations (structured rows) ------------------------------------
    const addRelatedLocationRow = () => {
        setFormData({ ...formData, relatedLocations: [...formData.relatedLocations, { latitude: '', longitude: '', name: '' }] });
    };
    const updateRelatedLocationRow = (index, field, value) => {
        const rows = [...formData.relatedLocations];
        rows[index] = { ...rows[index], [field]: value };
        setFormData({ ...formData, relatedLocations: rows });
    };
    const removeRelatedLocationRow = (index) => {
        setFormData({ ...formData, relatedLocations: formData.relatedLocations.filter((_, i) => i !== index) });
    };

    // --- Publish-allowed tokens (structured rows) -------------------------------
    const addPublishAllowedRow = () => {
        setFormData({ ...formData, publishAllowedTo: [...formData.publishAllowedTo, { uid: '', type: 'RFID' }] });
    };
    const updatePublishAllowedRow = (index, field, value) => {
        const rows = [...formData.publishAllowedTo];
        rows[index] = { ...rows[index], [field]: value };
        setFormData({ ...formData, publishAllowedTo: rows });
    };
    const removePublishAllowedRow = (index) => {
        setFormData({ ...formData, publishAllowedTo: formData.publishAllowedTo.filter((_, i) => i !== index) });
    };

    // --- Location gallery images -------------------------------------------------
    const addLocationImageRow = () => {
        setFormData({ ...formData, locationImages: [...formData.locationImages, ''] });
    };
    const handleLocationImageChange = (index, value) => {
        const updated = [...formData.locationImages];
        updated[index] = value;
        setFormData({ ...formData, locationImages: updated });
    };
    const removeLocationImageRow = (index) => {
        setFormData({ ...formData, locationImages: formData.locationImages.filter((_, i) => i !== index) });
    };

    // Real file uploads go straight to the server (separate from the URL-based
    // gallery rows above, which only ever reference externally-hosted images) -
    // uploads immediately rather than waiting for "Save Changes" below.
    const handlePhotoUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        e.target.value = '';

        setUploadingPhotos(true);
        try {
            const cleanedNumericId = rawLocationId.replace('loc_', '').trim();
            const body = new FormData();
            files.forEach((file) => body.append('images', file));
            await api.put(`/locations/${cleanedNumericId}`, body, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const response = await api.get('/locations');
            const refreshed = response.data?.data?.find((loc) => String(loc.id) === cleanedNumericId);
            const refreshedImages = Array.isArray(refreshed?.images)
                ? refreshed.images.map((i) => (typeof i === 'string' ? i : i.url))
                : [];
            setFormData((prev) => ({ ...prev, locationImages: refreshedImages }));
            setStatusFeedback({ show: true, type: 'success', message: 'Photo(s) uploaded successfully.' });
        } catch (err) {
            setStatusFeedback({ show: true, type: 'error', message: err.response?.data?.message || 'Photo upload failed.' });
        } finally {
            setUploadingPhotos(false);
        }
    };

    // --- EVSE field handlers ------------------------------------------------------
    const toggleEvseExpanded = (index) => {
        setExpandedEvses(prev => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index); else next.add(index);
            return next;
        });
    };

    const handleEvseChange = (index, field, value) => {
        const updated = [...formData.evses];
        updated[index] = { ...updated[index], [field]: value };
        setFormData({ ...formData, evses: updated });
    };

    const addEvseParkingRestriction = (index, value) => {
        const updated = [...formData.evses];
        const current = updated[index].parking_restrictions || [];
        if (current.some(v => v.toLowerCase() === value.toLowerCase())) return;
        updated[index] = { ...updated[index], parking_restrictions: [...current, value] };
        setFormData({ ...formData, evses: updated });
    };
    const removeEvseParkingRestriction = (index, tagIndex) => {
        const updated = [...formData.evses];
        updated[index] = { ...updated[index], parking_restrictions: updated[index].parking_restrictions.filter((_, i) => i !== tagIndex) };
        setFormData({ ...formData, evses: updated });
    };

    const addEvseImageRow = (evseIndex) => {
        const updated = [...formData.evses];
        updated[evseIndex] = { ...updated[evseIndex], images: [...updated[evseIndex].images, ''] };
        setFormData({ ...formData, evses: updated });
    };
    const handleEvseImageChange = (evseIndex, imgIndex, value) => {
        const updated = [...formData.evses];
        const images = [...updated[evseIndex].images];
        images[imgIndex] = value;
        updated[evseIndex] = { ...updated[evseIndex], images };
        setFormData({ ...formData, evses: updated });
    };
    const removeEvseImageRow = (evseIndex, imgIndex) => {
        const updated = [...formData.evses];
        updated[evseIndex] = { ...updated[evseIndex], images: updated[evseIndex].images.filter((_, i) => i !== imgIndex) };
        setFormData({ ...formData, evses: updated });
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        const lat = parseFloat(formData.latitude);
        const lng = parseFloat(formData.longitude);
        if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
            setStatusFeedback({ show: true, type: 'error', message: 'Latitude (-90 to 90) or Longitude (-180 to 180) is invalid - check Basic Info.' });
            setActiveTab('basic');
            return;
        }

        setSubmitting(true);

        const cleanRelatedLocations = formData.relatedLocations
            .filter(r => r.latitude.toString().trim() && r.longitude.toString().trim())
            .map(r => ({
                latitude: r.latitude.toString().trim(),
                longitude: r.longitude.toString().trim(),
                ...(r.name.trim() && { name: { text: r.name.trim(), language: 'en' } })
            }));

        const cleanPublishAllowedTo = formData.publishAllowedTo
            .filter(p => p.uid.trim())
            .map(p => ({ uid: p.uid.trim(), type: p.type }));

        const payload = {
            name: formData.name,
            address: formData.address,
            postcode: formData.postcode,
            city: formData.city,
            state: formData.state,
            countryCode: formData.countryCode,
            countryISO: formData.countryISO,
            partyId: formData.partyId,
            latitude: lat,
            longitude: lng,
            ...(isSuperAdmin && { companyId: formData.companyId, isApproved: formData.isApproved }),

            parkingType: formData.parkingType,
            timeZone: formData.timeZone,
            amenities: formData.facilities.join(', '),
            directions: formData.directions,
            chargingWhenClosed: formData.chargingWhenClosed,
            publish: formData.publish,
            publishAllowedTo: cleanPublishAllowedTo,
            relatedLocations: cleanRelatedLocations,
            images: formData.locationImages.map(url => url.trim()).filter(Boolean),
            suboperatorName: formData.suboperatorName,
            suboperatorWebsite: formData.suboperatorWebsite,
            suboperatorLogoUrl: formData.suboperatorLogoUrl,
            energyMix: {
                is_green_energy: formData.isGreenEnergy,
                supplier_name: formData.energySupplier,
                energy_product_name: formData.energyProduct
            },
            evses: formData.evses.map(evse => ({
                evse_id: evse.evse_id,
                floor_level: evse.floor_level,
                parking_restrictions: (evse.parking_restrictions || []).join(', '),
                latitude: evse.latitude,
                longitude: evse.longitude,
                directions: evse.directions,
                images: evse.images.map(u => u.trim()).filter(Boolean)
            }))
        };

        try {
            const cleanedNumericId = rawLocationId.replace('loc_', '').trim();
            const response = await api.patch(`/open-data/location/${cleanedNumericId}/metadata`, payload);
            if (response.data.success) {
                setStatusFeedback({ show: true, type: 'success', message: 'All open data parameters updated successfully!' });
                setTimeout(() => router.push('/locations'), 1200);
            }
        } catch (err) {
            setStatusFeedback({ show: true, type: 'error', message: err.response?.data?.message || 'Update failed.' });
        } finally {
            setSubmitting(false);
        }
    };

    if (!rawLocationId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
                <ShieldAlert size={28} className="text-rose-500" />
                <p className="text-sm text-slate-500 font-medium">No valid location ID context supplied.</p>
                <button type="button" onClick={() => router.push('/locations')} className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer">
                    Back to Locations
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <BrandLoader label="Compiling Location Metadata Matrix" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-5 relative pb-16">

            {/* Back link */}
            <button type="button" onClick={() => router.push('/locations')} className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer transition-colors">
                <ArrowLeft size={14} strokeWidth={2.5} />
                <span>Back to Locations</span>
            </button>

            <form onSubmit={handleFormSubmit} className="space-y-5">

                {/* Hero header */}
                <div className="bg-white p-6 md:p-7 rounded-3xl border border-slate-200/70 shadow-xs">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="min-w-0 space-y-1.5">
                            <div className="flex items-center flex-wrap gap-2 text-xs font-medium text-slate-400">
                                <Building2 size={13} />
                                <span>{formData.companyName}</span>
                                {formData.partyId && (
                                    <span className="px-1.5 py-0.5 bg-slate-100 rounded-md text-[10px] font-bold text-slate-500 tracking-wide">{formData.partyId}</span>
                                )}
                                <span className="px-1.5 py-0.5 bg-slate-100 rounded-md text-[10px] font-mono text-slate-500">#{rawLocationId}</span>
                            </div>
                            <h1 className="text-xl md:text-2xl font-bold text-slate-900 truncate">{formData.name}</h1>
                            <p className="text-sm text-slate-500 font-medium truncate">{formData.address}, {formData.city}{formData.postcode ? `, ${formData.postcode}` : ''}</p>
                        </div>

                        <span className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${formData.publish ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${formData.publish ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            {formData.publish ? 'Live on public feed' : 'Hidden from public feed'}
                        </span>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                        {/* Quick shortcuts - just jump to the relevant tab */}
                        <button
                            type="button"
                            onClick={() => setActiveTab('basic')}
                            className="flex items-center gap-2 bg-white border border-slate-200 hover:border-amber-200 hover:bg-amber-50/50 rounded-xl px-3.5 py-2.5 text-left transition-colors cursor-pointer"
                        >
                            <PencilLine size={13} className="text-amber-500 shrink-0" />
                            <div className="min-w-0">
                                <div className="font-mono text-slate-700 text-xs font-semibold truncate">{formData.latitude}, {formData.longitude}</div>
                                <div className="text-[10px] text-slate-400">Basic info &amp; coordinates</div>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('evses')}
                            className="flex items-center gap-2 bg-white border border-slate-200 hover:border-amber-200 hover:bg-amber-50/50 rounded-xl px-3.5 py-2.5 text-left transition-colors cursor-pointer"
                        >
                            <Layers size={13} className="text-amber-500 shrink-0" />
                            <div className="min-w-0">
                                <div className="font-semibold text-slate-700 text-xs truncate">{formData.evses.length} unit{formData.evses.length === 1 ? '' : 's'}</div>
                                <div className="text-[10px] text-slate-400">Charging units</div>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('media')}
                            className="flex items-center gap-2 bg-white border border-slate-200 hover:border-amber-200 hover:bg-amber-50/50 rounded-xl px-3.5 py-2.5 text-left transition-colors cursor-pointer"
                        >
                            <ImageIcon size={13} className="text-amber-500 shrink-0" />
                            <div className="min-w-0">
                                <div className="font-semibold text-slate-700 text-xs truncate">{formData.locationImages.length} photo{formData.locationImages.length === 1 ? '' : 's'}</div>
                                <div className="text-[10px] text-slate-400">Gallery</div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Tab bar */}
                <div className="bg-slate-100 p-1.5 rounded-2xl flex overflow-x-auto gap-1">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex shrink-0 items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                    isActive ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Icon size={14} strokeWidth={2.25} />
                                <span>{tab.label}</span>
                                {tab.key === 'evses' && formData.evses.length > 0 && (
                                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                        {formData.evses.length}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* --- Basic Info (core registration details) --- */}
                {activeTab === 'basic' && (
                    <div className="space-y-5">
                        <SectionCard icon={PencilLine} title="Site Identity" description="Name and address shown across the portal and public feed" tone="amber" locked={!isSuperAdmin}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {isSuperAdmin ? (
                                    <>
                                        <div className="sm:col-span-2">
                                            <FieldLabel>Site Name</FieldLabel>
                                            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} placeholder="e.g. Spencer Dock Hub" />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <FieldLabel>Address</FieldLabel>
                                            <input type="text" required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className={inputClass} placeholder="Street address" />
                                        </div>
                                        <div>
                                            <FieldLabel>City</FieldLabel>
                                            <input type="text" required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className={inputClass} />
                                        </div>
                                        <div>
                                            <FieldLabel>Postcode</FieldLabel>
                                            <input type="text" required value={formData.postcode} onChange={(e) => setFormData({ ...formData, postcode: e.target.value })} className={`${inputClass} font-mono uppercase`} />
                                        </div>
                                        <div>
                                            <FieldLabel>State / Region</FieldLabel>
                                            <input type="text" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className={inputClass} placeholder="Optional" />
                                        </div>
                                        <div>
                                            <FieldLabel>Party ID</FieldLabel>
                                            <input type="text" value={formData.partyId} onChange={(e) => setFormData({ ...formData, partyId: e.target.value })} className={`${inputClass} font-mono uppercase`} placeholder="CEV" />
                                        </div>
                                        <div>
                                            <FieldLabel>Country Code</FieldLabel>
                                            <input type="text" value={formData.countryCode} onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })} className={`${inputClass} font-mono uppercase`} placeholder="GB" />
                                        </div>
                                        <div>
                                            <FieldLabel>Country (ISO-3)</FieldLabel>
                                            <input type="text" value={formData.countryISO} onChange={(e) => setFormData({ ...formData, countryISO: e.target.value })} className={`${inputClass} font-mono uppercase`} placeholder="GBR" />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="sm:col-span-2"><ReadOnlyField value={formData.name}>Site Name</ReadOnlyField></div>
                                        <div className="sm:col-span-2"><ReadOnlyField value={formData.address}>Address</ReadOnlyField></div>
                                        <ReadOnlyField value={formData.city}>City</ReadOnlyField>
                                        <ReadOnlyField value={formData.postcode}>Postcode</ReadOnlyField>
                                        <ReadOnlyField value={formData.state}>State / Region</ReadOnlyField>
                                        <ReadOnlyField value={formData.partyId}>Party ID</ReadOnlyField>
                                        <ReadOnlyField value={formData.countryCode}>Country Code</ReadOnlyField>
                                        <ReadOnlyField value={formData.countryISO}>Country (ISO-3)</ReadOnlyField>
                                    </>
                                )}
                            </div>
                        </SectionCard>

                        <SectionCard icon={MapPin} title="Coordinates" description="Precise map position for this site" locked={!isSuperAdmin}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {isSuperAdmin ? (
                                    <>
                                        <div>
                                            <FieldLabel>Latitude</FieldLabel>
                                            <input type="number" step="any" required value={formData.latitude} onChange={(e) => setFormData({ ...formData, latitude: e.target.value })} className={`${inputClass} font-mono`} placeholder="51.507400" />
                                        </div>
                                        <div>
                                            <FieldLabel>Longitude</FieldLabel>
                                            <input type="number" step="any" required value={formData.longitude} onChange={(e) => setFormData({ ...formData, longitude: e.target.value })} className={`${inputClass} font-mono`} placeholder="-0.127800" />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <ReadOnlyField value={formData.latitude}>Latitude</ReadOnlyField>
                                        <ReadOnlyField value={formData.longitude}>Longitude</ReadOnlyField>
                                    </>
                                )}
                            </div>
                        </SectionCard>

                        <SectionCard icon={ShieldCheck} title="Operator & Moderation" description="Who owns this site and whether it's approved for the public feed" locked={!isSuperAdmin}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {isSuperAdmin ? (
                                    <div>
                                        <FieldLabel icon={Building2}>Operator</FieldLabel>
                                        <select value={formData.companyId} onChange={(e) => setFormData({ ...formData, companyId: e.target.value })} className={selectClass}>
                                            {companies.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <ReadOnlyField value={formData.companyName}>Operator</ReadOnlyField>
                                )}
                            </div>
                            {isSuperAdmin && (
                                <ToggleRow
                                    icon={ShieldCheck}
                                    label="Approved for public feed"
                                    description={formData.isApproved ? 'Live and visible to open data consumers' : 'Pending moderation - hidden from the feed'}
                                    checked={formData.isApproved}
                                    onChange={() => setFormData({ ...formData, isApproved: !formData.isApproved })}
                                    tone="emerald"
                                />
                            )}
                        </SectionCard>
                    </div>
                )}

                {/* --- Overview & Access --- */}
                {activeTab === 'overview' && (
                    <div className="space-y-5">
                        <SectionCard icon={Globe} title="Public Feed Visibility" description="Controls whether this location appears on the open data feed" tone="emerald" locked={!isSuperAdmin}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <ToggleRow
                                    icon={formData.publish ? Globe : EyeOff}
                                    label="Publish to open data feed"
                                    description={formData.publish ? 'Visible to all public API consumers' : 'Restricted to whitelisted tokens only'}
                                    checked={formData.publish}
                                    onChange={() => setFormData({ ...formData, publish: !formData.publish })}
                                    tone="emerald"
                                    disabled={!isSuperAdmin}
                                />
                                <ToggleRow
                                    icon={Zap}
                                    label="Out-of-hours charging"
                                    description={formData.chargingWhenClosed ? 'Power stays live when site is closed' : 'Charging pauses outside opening hours'}
                                    checked={formData.chargingWhenClosed}
                                    onChange={() => setFormData({ ...formData, chargingWhenClosed: !formData.chargingWhenClosed })}
                                    tone="indigo"
                                    disabled={!isSuperAdmin}
                                />
                            </div>
                        </SectionCard>

                        <SectionCard icon={Users} title="Publish Allowlist" description="Restrict visibility to specific tokens (leave empty to allow everyone)" locked={!isSuperAdmin}>
                            <div className="space-y-2.5">
                                {formData.publishAllowedTo.length === 0 && (
                                    <p className="text-xs text-slate-400 italic">No restrictions - visible to everyone.</p>
                                )}
                                {formData.publishAllowedTo.map((row, i) => (
                                    isSuperAdmin ? (
                                        <div key={i} className="flex flex-wrap items-center gap-2">
                                            <input
                                                type="text"
                                                value={row.uid}
                                                onChange={(e) => updatePublishAllowedRow(i, 'uid', e.target.value)}
                                                placeholder="Token UID"
                                                className={`${inputClass} flex-1 min-w-[140px] font-mono text-xs`}
                                            />
                                            <select
                                                value={row.type}
                                                onChange={(e) => updatePublishAllowedRow(i, 'type', e.target.value)}
                                                className={`${selectClass} w-full sm:w-40 shrink-0`}
                                            >
                                                <option value="RFID">RFID</option>
                                                <option value="AD_HOC_USER">AD HOC USER</option>
                                                <option value="APP_USER">APP USER</option>
                                                <option value="OTHER">OTHER</option>
                                            </select>
                                            <button type="button" onClick={() => removePublishAllowedRow(i)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div key={i} className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-xl px-3 py-2">
                                            <span className="font-mono">{row.uid}</span>
                                            <span className="text-slate-400">·</span>
                                            <span>{row.type}</span>
                                        </div>
                                    )
                                ))}
                                {isSuperAdmin && (
                                    <button type="button" onClick={addPublishAllowedRow} className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer">
                                        <Plus size={12} strokeWidth={2.5} />
                                        <span>Add allowed token</span>
                                    </button>
                                )}
                            </div>
                        </SectionCard>
                    </div>
                )}

                {/* --- Location Details --- */}
                {activeTab === 'details' && (
                    <div className="space-y-5">
                        <SectionCard icon={MapPin} title="Site Configuration" description="Core parameters mapping directly to the public feed">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {isSuperAdmin ? (
                                    <>
                                        <div>
                                            <FieldLabel>Parking Structure Type</FieldLabel>
                                            <select value={formData.parkingType} onChange={(e) => setFormData({ ...formData, parkingType: e.target.value })} className={selectClass}>
                                                <option value="UNKNOWN">Unknown</option>
                                                <option value="ON_STREET">On Street</option>
                                                <option value="OFF_STREET">Off Street</option>
                                                <option value="PARKING_GARAGE">Parking Garage</option>
                                                <option value="MALL_PARKING">Mall Lot</option>
                                            </select>
                                        </div>
                                        <div>
                                            <FieldLabel>Time Zone</FieldLabel>
                                            <select value={formData.timeZone} onChange={(e) => setFormData({ ...formData, timeZone: e.target.value })} className={selectClass}>
                                                <option value="Europe/London">Europe/London</option>
                                                <option value="Europe/Paris">Europe/Paris</option>
                                                <option value="UTC">UTC Standard</option>
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <ReadOnlyField value={formData.parkingType}>Parking Structure Type</ReadOnlyField>
                                        <ReadOnlyField value={formData.timeZone}>Time Zone</ReadOnlyField>
                                    </>
                                )}
                            </div>

                            <div>
                                <FieldLabel icon={Tag} trailing={!isSuperAdmin && <EditableBadge />}>Facilities & Amenities</FieldLabel>
                                <TagInput
                                    values={formData.facilities}
                                    onAdd={addFacility}
                                    onRemove={removeFacility}
                                    draft={facilityDraft}
                                    onDraftChange={setFacilityDraft}
                                    placeholder="e.g. Cafe, Restrooms, Free WiFi — press Enter to add"
                                />
                            </div>

                            <div>
                                <FieldLabel icon={HelpCircle} trailing={!isSuperAdmin && <EditableBadge />}>Site Entry Directions</FieldLabel>
                                <textarea rows={3} value={formData.directions} onChange={(e) => setFormData({ ...formData, directions: e.target.value })} className={`${inputClass} resize-none`} placeholder="Provide entry directions for EV drivers..." />
                            </div>
                        </SectionCard>

                        <SectionCard icon={Compass} title="Related Locations" description="Nearby sister sites, as geo-coordinates" tone="amber">
                            <div className="space-y-2.5">
                                {formData.relatedLocations.map((row, i) => (
                                    <div key={i} className="flex flex-wrap items-center gap-2">
                                        <input type="text" value={row.latitude} onChange={(e) => updateRelatedLocationRow(i, 'latitude', e.target.value)} placeholder="Latitude" className={`${inputClass} font-mono text-xs flex-1 min-w-[100px]`} />
                                        <input type="text" value={row.longitude} onChange={(e) => updateRelatedLocationRow(i, 'longitude', e.target.value)} placeholder="Longitude" className={`${inputClass} font-mono text-xs flex-1 min-w-[100px]`} />
                                        <input type="text" value={row.name} onChange={(e) => updateRelatedLocationRow(i, 'name', e.target.value)} placeholder="Label (optional)" className={`${inputClass} flex-[2] min-w-[140px]`} />
                                        <button type="button" onClick={() => removeRelatedLocationRow(i)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={addRelatedLocationRow} className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer">
                                    <Plus size={12} strokeWidth={2.5} />
                                    <span>Add related location</span>
                                </button>
                            </div>
                        </SectionCard>
                    </div>
                )}

                {/* --- Media Gallery --- */}
                {activeTab === 'media' && (
                    <div className="space-y-5">
                        <SectionCard icon={Upload} title="Upload Photos" description="Uploads straight to the server - saves immediately, no need to hit Save Changes" tone="amber">
                            <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-2xl px-4 py-6 cursor-pointer transition-colors ${uploadingPhotos ? 'border-slate-200 bg-slate-50 cursor-wait' : 'border-amber-200 bg-amber-50/40 hover:bg-amber-50'}`}>
                                <Upload size={16} className="text-amber-600 shrink-0" />
                                <span className="text-sm font-semibold text-amber-800">{uploadingPhotos ? 'Uploading...' : 'Click to choose photos from your device'}</span>
                                <input type="file" multiple accept="image/*" disabled={uploadingPhotos} onChange={handlePhotoUpload} className="hidden" />
                            </label>
                        </SectionCard>

                    <SectionCard icon={ImageIcon} title="Location Gallery" description="Asset URLs shown on the public listing" tone="indigo">
                        <div className="space-y-2.5">
                            {formData.locationImages.length === 0 && (
                                <p className="text-xs text-slate-400 italic">No gallery images yet — add one below.</p>
                            )}
                            {formData.locationImages.map((url, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        value={url}
                                        onChange={(e) => handleLocationImageChange(index, e.target.value)}
                                        className={`${inputClass} flex-1`}
                                        placeholder="https://your-domain.com/assets/station-front.jpg"
                                    />
                                    <button type="button" onClick={() => removeLocationImageRow(index)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={addLocationImageRow} className="inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer">
                                <Plus size={12} strokeWidth={2.5} />
                                <span>Add image URL</span>
                            </button>
                        </div>
                    </SectionCard>
                    </div>
                )}

                {/* --- Energy & Operator --- */}
                {activeTab === 'energy' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <SectionCard icon={Layers} title="Suboperator" description="Third party operating this site, if any" locked={!isSuperAdmin}>
                            <div className="space-y-3">
                                {isSuperAdmin ? (
                                    <>
                                        <div>
                                            <FieldLabel>Name</FieldLabel>
                                            <input type="text" value={formData.suboperatorName} onChange={(e) => setFormData({ ...formData, suboperatorName: e.target.value })} className={inputClass} placeholder="Suboperator Name" />
                                        </div>
                                        <div>
                                            <FieldLabel>Website</FieldLabel>
                                            <input type="text" value={formData.suboperatorWebsite} onChange={(e) => setFormData({ ...formData, suboperatorWebsite: e.target.value })} className={inputClass} placeholder="https://..." />
                                        </div>
                                        <div>
                                            <FieldLabel>Logo URL</FieldLabel>
                                            <input type="text" value={formData.suboperatorLogoUrl} onChange={(e) => setFormData({ ...formData, suboperatorLogoUrl: e.target.value })} className={inputClass} placeholder="https://..." />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <ReadOnlyField value={formData.suboperatorName}>Name</ReadOnlyField>
                                        <ReadOnlyField value={formData.suboperatorWebsite}>Website</ReadOnlyField>
                                        <ReadOnlyField value={formData.suboperatorLogoUrl}>Logo URL</ReadOnlyField>
                                    </>
                                )}
                            </div>
                        </SectionCard>

                        <SectionCard icon={Zap} title="Energy Mix" description="Power supply characteristics for this site" tone="amber">
                            <div className="space-y-3">
                                <ToggleRow
                                    icon={Zap}
                                    label="100% Green Energy"
                                    description={formData.isGreenEnergy ? 'Certified renewable supply' : 'Standard grid mix'}
                                    checked={formData.isGreenEnergy}
                                    onChange={() => setFormData({ ...formData, isGreenEnergy: !formData.isGreenEnergy })}
                                    tone="emerald"
                                />
                                <div>
                                    <FieldLabel>Supplier Name</FieldLabel>
                                    <input type="text" value={formData.energySupplier} onChange={(e) => setFormData({ ...formData, energySupplier: e.target.value })} className={inputClass} placeholder="Supplier Provider Name" />
                                </div>
                                <div>
                                    <FieldLabel>Energy Product</FieldLabel>
                                    <input type="text" value={formData.energyProduct} onChange={(e) => setFormData({ ...formData, energyProduct: e.target.value })} className={inputClass} placeholder="Energy Product Name" />
                                </div>
                            </div>
                        </SectionCard>
                    </div>
                )}

                {/* --- Charging Units (EVSEs) --- */}
                {activeTab === 'evses' && (
                    <div className="space-y-3">
                        {formData.evses.length === 0 && (
                            <div className="bg-white p-8 rounded-3xl border border-slate-200/70 shadow-xs text-center">
                                <Radio size={22} className="mx-auto text-slate-300 mb-2" />
                                <p className="text-sm text-slate-400 font-medium">No charging units linked to this location.</p>
                            </div>
                        )}
                        {formData.evses.map((evse, evseIndex) => {
                            const isOpen = expandedEvses.has(evseIndex);
                            return (
                                <div key={evse.id || evseIndex} className="bg-white rounded-3xl border border-slate-200/70 shadow-xs overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => toggleEvseExpanded(evseIndex)}
                                        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
                                    >
                                        <div className="flex items-center space-x-3 min-w-0">
                                            <div className="p-2 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl shrink-0">
                                                <Zap size={15} strokeWidth={2.25} />
                                            </div>
                                            <div className="min-w-0 text-left">
                                                <div className="text-sm font-bold text-slate-900 font-mono truncate">{evse.evse_id}</div>
                                                <div className="text-xs text-slate-400 font-medium">
                                                    {evse.floor_level ? `${evse.floor_level} · ` : ''}Unit #{evseIndex + 1}
                                                    {evse.images.length > 0 && ` · ${evse.images.length} photo${evse.images.length === 1 ? '' : 's'}`}
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isOpen && (
                                        <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-100">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                                <div>
                                                    <FieldLabel trailing={!isSuperAdmin && <EditableBadge />}>Floor Level Placement</FieldLabel>
                                                    <input type="text" value={evse.floor_level} onChange={(e) => handleEvseChange(evseIndex, 'floor_level', e.target.value)} className={inputClass} placeholder="Ground, Floor -1" />
                                                </div>
                                                <div>
                                                    <FieldLabel icon={Navigation} trailing={!isSuperAdmin && <EditableBadge />}>Bay Directions</FieldLabel>
                                                    <input type="text" value={evse.directions} onChange={(e) => handleEvseChange(evseIndex, 'directions', e.target.value)} className={inputClass} placeholder="Next to pillar 4..." />
                                                </div>
                                            </div>

                                            <div>
                                                <FieldLabel icon={Tag} trailing={!isSuperAdmin && <EditableBadge />}>Parking Restrictions</FieldLabel>
                                                <TagInput
                                                    values={evse.parking_restrictions || []}
                                                    onAdd={(v) => addEvseParkingRestriction(evseIndex, v)}
                                                    onRemove={(i) => removeEvseParkingRestriction(evseIndex, i)}
                                                    draft={evseTagDraft[evseIndex] || ''}
                                                    onDraftChange={(v) => setEvseTagDraft({ ...evseTagDraft, [evseIndex]: v })}
                                                    placeholder="e.g. EV_ONLY, CUSTOMER_ONLY — press Enter to add"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {isSuperAdmin ? (
                                                    <>
                                                        <div>
                                                            <FieldLabel>Latitude Override</FieldLabel>
                                                            <input type="text" value={evse.latitude} onChange={(e) => handleEvseChange(evseIndex, 'latitude', e.target.value)} className={`${inputClass} font-mono`} placeholder="Optional override" />
                                                        </div>
                                                        <div>
                                                            <FieldLabel>Longitude Override</FieldLabel>
                                                            <input type="text" value={evse.longitude} onChange={(e) => handleEvseChange(evseIndex, 'longitude', e.target.value)} className={`${inputClass} font-mono`} placeholder="Optional override" />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ReadOnlyField value={evse.latitude} placeholder="No override">Latitude Override</ReadOnlyField>
                                                        <ReadOnlyField value={evse.longitude} placeholder="No override">Longitude Override</ReadOnlyField>
                                                    </>
                                                )}
                                            </div>

                                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                                                <div className="flex items-center justify-between">
                                                    <FieldLabel icon={ImageIcon} trailing={!isSuperAdmin && <EditableBadge />}>Charger Bay Photos</FieldLabel>
                                                    <button type="button" onClick={() => addEvseImageRow(evseIndex)} className="inline-flex items-center space-x-1 text-[11px] font-semibold px-2 py-1 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                                                        <Plus size={11} strokeWidth={2.5} />
                                                        <span>Add Image</span>
                                                    </button>
                                                </div>
                                                {evse.images.map((url, imgIndex) => (
                                                    <div key={imgIndex} className="flex items-center space-x-2">
                                                        <input
                                                            type="text"
                                                            value={url}
                                                            onChange={(e) => handleEvseImageChange(evseIndex, imgIndex, e.target.value)}
                                                            className={`${inputClass} flex-1 bg-white`}
                                                            placeholder="https://your-domain.com/assets/charger-bay.png"
                                                        />
                                                        <button type="button" onClick={() => removeEvseImageRow(evseIndex, imgIndex)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer">
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Save bar */}
                <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/70 shadow-xs flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
                    <button type="button" onClick={() => router.push('/locations')} className="px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                        Cancel
                    </button>
                    <button type="submit" disabled={submitting} className="flex cursor-pointer items-center justify-center space-x-2 bg-[#F5A524] hover:bg-[#e4971a] text-slate-950 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-xs active:scale-95">
                        <Save size={14} strokeWidth={2.5} />
                        <span>{submitting ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                </div>
            </form>

            {/* Notification Toast */}
            {statusFeedback.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs" onClick={() => setStatusFeedback({ ...statusFeedback, show: false })}></div>
                    <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center space-y-4 z-50 animate-in zoom-in-95 duration-150">
                        <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center">
                            {statusFeedback.type === 'success' ? <CheckCircle2 size={28} className="text-emerald-500" /> : <ShieldAlert size={28} className="text-rose-600" />}
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-slate-900">{statusFeedback.type === 'success' ? 'Saved' : 'Something went wrong'}</h4>
                            <p className="text-xs text-slate-500 font-medium px-2 leading-relaxed">{statusFeedback.message}</p>
                        </div>
                        <button type="button" onClick={() => { setStatusFeedback({ ...statusFeedback, show: false }); if (statusFeedback.type === 'error') router.push('/locations'); }} className={`w-full py-2.5 text-sm font-semibold rounded-xl text-white cursor-pointer ${statusFeedback.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                            Dismiss
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function EnrichLocationPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <BrandLoader label="Initializing Form Workspace" />
            </div>
        }>
            <EnrichFormContent />
        </Suspense>
    );
}
