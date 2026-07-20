'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import {
    ArrowLeft, Globe, Info, Save, ShieldAlert, CheckCircle2,
    MapPin, Building2, Coffee, HelpCircle, ToggleLeft, ToggleRight, Lock, Map, Zap, Layers, Image as ImageIcon, EyeOff, Plus, Trash2
} from 'lucide-react';

function EnrichFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const locationId = searchParams.get('id') || '';

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [statusFeedback, setStatusFeedback] = useState({ show: false, type: 'success', message: '' });

    const [formData, setFormData] = useState({
        // Read-only parameters
        name: '', address: '', postcode: '', city: '', state: '', countryISO: '', companyName: '', partyId: '',
        latitude: '', longitude: '',

        // Location Level Editable Fields
        parkingType: 'UNKNOWN',
        timeZone: 'Europe/London',
        amenities: '',
        directions: '',
        chargingWhenClosed: false,
        publish: true,
        publishAllowedTo: '',
        relatedLocations: '',

        // Managed as array pools for cleaner multi-item tracking
        locationImages: [''],

        suboperatorName: '', suboperatorWebsite: '', suboperatorLogoUrl: '',
        isGreenEnergy: false, energySupplier: '', energyProduct: '',

        // Dynamic Child EVSE hardware parameters array
        evses: []
    });

    useEffect(() => {
        if (!locationId) {
            setStatusFeedback({ show: true, type: 'error', message: 'No valid location ID context supplied.' });
            setLoading(false);
            return;
        }

        const fetchLocationDetails = async () => {
            try {
                const response = await api.get(`/open-data/feed?search=${locationId}`);
                if (response.data && response.data.data && response.data.data.length > 0) {
                    const target = response.data.data[0];

                    // Fallback to at least one empty string row if no images exist
                    const existingImages = target.images && target.images.length > 0
                        ? target.images.map(i => i.url)
                        : [''];

                    setFormData({
                        name: target.name || '',
                        address: target.address || '',
                        postcode: target.postal_code || '',
                        city: target.city || '',
                        state: target.state || '',
                        countryISO: target.country || 'GBR',
                        companyName: target.operator?.name || 'Network Operator',
                        partyId: target.party_id || '',
                        latitude: target.coordinates?.latitude || '0.000000',
                        longitude: target.coordinates?.longitude || '0.000000',

                        parkingType: target.parking_type || 'UNKNOWN',
                        timeZone: target.time_zone || 'Europe/London',
                        amenities: target.facilities ? target.facilities.join(', ') : '',
                        directions: target.directions?.length > 0 ? target.directions[0].text : '',
                        chargingWhenClosed: target.charging_when_closed || false,
                        publish: target.publish ?? true,
                        publishAllowedTo: target.publish_allowed_to ? JSON.stringify(target.publish_allowed_to) : '',
                        relatedLocations: target.related_locations ? JSON.stringify(target.related_locations) : '',
                        locationImages: existingImages,

                        suboperatorName: target.suboperator?.name || '',
                        suboperatorWebsite: target.suboperator?.website || '',
                        suboperatorLogoUrl: target.suboperator?.logo?.url || '',
                        isGreenEnergy: target.energy_mix?.is_green_energy || false,
                        energySupplier: target.energy_mix?.supplier_name || '',
                        energyProduct: target.energy_mix?.energy_product_name || '',

                        evses: (target.evses || []).map(evse => ({
                            id: evse.uid,
                            evse_id: evse.evse_id,
                            floor_level: evse.floor_level || '',
                            parking_restrictions: evse.parking_restrictions ? evse.parking_restrictions.join(', ') : '',
                            latitude: evse.coordinates?.latitude || '',
                            longitude: evse.coordinates?.longitude || '',
                            directions: evse.directions?.length > 0 ? evse.directions[0].text : '',
                            images: evse.images && evse.images.length > 0 ? evse.images.map(i => i.url) : ['']
                        }))
                    });
                } else {
                    setStatusFeedback({ show: true, type: 'error', message: `Profile "${locationId}" not found.` });
                }
            } catch (err) {
                setStatusFeedback({ show: true, type: 'error', message: 'Failed fetching records.' });
            } finally {
                setLoading(false);
            }
        };
        fetchLocationDetails();
    }, [locationId]);

    // --- Dynamic Multi-Image Handling Methods ---
    const handleLocationImageChange = (index, value) => {
        const updatedImages = [...formData.locationImages];
        updatedImages[index] = value;
        setFormData({ ...formData, locationImages: updatedImages });
    };

    const addLocationImageRow = () => {
        setFormData({ ...formData, locationImages: [...formData.locationImages, ''] });
    };

    const removeLocationImageRow = (index) => {
        const updatedImages = formData.locationImages.filter((_, i) => i !== index);
        setFormData({ ...formData, locationImages: updatedImages.length > 0 ? updatedImages : [''] });
    };

    const handleEvseImageChange = (evseIndex, imgIndex, value) => {
        const updatedEvses = [...formData.evses];
        updatedEvses[evseIndex].images[imgIndex] = value;
        setFormData({ ...formData, evses: updatedEvses });
    };

    const addEvseImageRow = (evseIndex) => {
        const updatedEvses = [...formData.evses];
        updatedEvses[evseIndex].images.push('');
        setFormData({ ...formData, evses: updatedEvses });
    };

    const removeEvseImageRow = (evseIndex, imgIndex) => {
        const updatedEvses = [...formData.evses];
        updatedEvses[evseIndex].images = updatedEvses[evseIndex].images.filter((_, i) => i !== imgIndex);
        if (updatedEvses[evseIndex].images.length === 0) updatedEvses[evseIndex].images = [''];
        setFormData({ ...formData, evses: updatedEvses });
    };

    const handleEvseChange = (index, field, value) => {
        const updatedEvses = [...formData.evses];
        updatedEvses[index][field] = value;
        setFormData({ ...formData, evses: updatedEvses });
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        let parsedPublishAllowed = [];
        let parsedRelatedLocs = [];
        try { if (formData.publishAllowedTo.trim()) parsedPublishAllowed = JSON.parse(formData.publishAllowedTo); } catch (e) { }
        try { if (formData.relatedLocations.trim()) parsedRelatedLocs = JSON.parse(formData.relatedLocations); } catch (e) { }

        const payload = {
            parkingType: formData.parkingType,
            timeZone: formData.timeZone,
            amenities: formData.amenities,
            directions: formData.directions,
            chargingWhenClosed: formData.chargingWhenClosed,
            publish: formData.publish,
            publishAllowedTo: parsedPublishAllowed,
            relatedLocations: parsedRelatedLocs,
            // Clean out empty inputs before firing off backend transactions
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
                parking_restrictions: evse.parking_restrictions,
                latitude: evse.latitude,
                longitude: evse.longitude,
                directions: evse.directions,
                images: evse.images.map(u => u.trim()).filter(Boolean)
            }))
        };

        try {
            const cleanedNumericId = locationId.replace('loc_', '');
            const response = await api.patch(`/open-data/location/${cleanedNumericId}/metadata`, payload);
            if (response.data.success) {
                setStatusFeedback({ show: true, type: 'success', message: 'All spreadsheet mapped editable dimensions saved successfully!' });
                setTimeout(() => router.push('/locations'), 1500);
            }
        } catch (err) {
            setStatusFeedback({ show: true, type: 'error', message: err.response?.data?.message || 'Update failed.' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 font-bold text-xs uppercase tracking-wider">
                <Globe className="animate-spin text-indigo-600 mb-3" size={28} />
                <span>Compiling Complete OpenData Form Matrix...</span>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 relative pb-12">
            {/* Header Navigation Link */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs">
                <button type="button" onClick={() => router.push('/locations')} className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 text-xs font-black uppercase tracking-wider cursor-pointer">
                    <ArrowLeft size={14} strokeWidth={2.5} />
                    <span>Back to Locations</span>
                </button>
                <div className="text-[10px] font-mono font-black uppercase tracking-wider bg-slate-100 border border-slate-200 rounded-md px-3 py-1 text-slate-600">
                    ID Context: {locationId}
                </div>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-6">

                {/* 1. READ ONLY SYSTEM LAYOUT INFO */}
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-3xs space-y-4">
                    <div className="flex items-center space-x-2 text-slate-400 font-black text-[11px] tracking-wider uppercase border-b border-slate-200 pb-3">
                        <Lock size={13} />
                        <span>Automated Pipeline Data (Read-Only Fields)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Descriptor</label>
                            <input type="text" disabled value={formData.name} className="w-full px-3 py-2 bg-slate-200/40 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Address</label>
                            <input type="text" disabled value={`${formData.address}, ${formData.city}`} className="w-full px-3 py-2 bg-slate-200/40 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Company Token</label>
                            <input type="text" disabled value={`${formData.companyName} (${formData.partyId})`} className="w-full px-3 py-2 bg-slate-200/40 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold cursor-not-allowed" />
                        </div>
                    </div>
                </div>

                {/* 2. CORE ENRICHMENT MODULE ZONE */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
                    <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
                        <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600"><Globe size={18} strokeWidth={2.5} /></div>
                        <div>
                            <h3 className="text-base font-black text-slate-900 tracking-tight">Location Open Data Enrichment</h3>
                            <p className="text-xs text-slate-400 font-bold">Configure core parameters mapping directly to your public endpoints.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">Parking Type Structure</label>
                            <select value={formData.parkingType} onChange={(e) => setFormData({ ...formData, parkingType: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:border-slate-400 outline-hidden transition-all cursor-pointer">
                                <option value="UNKNOWN">UNKNOWN</option>
                                <option value="ON_STREET">ON STREET</option>
                                <option value="OFF_STREET">OFF STREET</option>
                                <option value="PARKING_GARAGE">PARKING GARAGE</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">Time Zone Baseline</label>
                            <select value={formData.timeZone} onChange={(e) => setFormData({ ...formData, timeZone: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:border-slate-400 outline-hidden transition-all cursor-pointer">
                                <option value="Europe/London">Europe/London</option>
                                <option value="Europe/Paris">Europe/Paris</option>
                                <option value="UTC">UTC Standard</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">Amenities Tags</label>
                        <input type="text" value={formData.amenities} onChange={(e) => setFormData({ ...formData, amenities: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white outline-hidden" placeholder="Cafe, Restrooms, Free WiFi" />
                    </div>

                    {/* DYNAMIC MULTI-IMAGE ARRAY INTERFACE (LOCATION LEVEL) */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                            <label className="text-[11px] font-black uppercase text-slate-600 tracking-wider flex items-center">
                                <ImageIcon size={14} className="mr-1.5 text-indigo-500" /> Location Gallery Asset URLs
                            </label>
                            <button type="button" onClick={addLocationImageRow} className="inline-flex items-center space-x-1 text-[10px] font-black px-2 py-1 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer">
                                <Plus size={11} strokeWidth={3} />
                                <span>Add Image URL</span>
                            </button>
                        </div>
                        <div className="space-y-2">
                            {formData.locationImages.map((url, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        value={url}
                                        onChange={(e) => handleLocationImageChange(index, e.target.value)}
                                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-slate-400 outline-hidden"
                                        placeholder="https://your-domain.com/assets/station-front.jpg"
                                    />
                                    <button type="button" onClick={() => removeLocationImageRow(index)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5 flex items-center"><HelpCircle size={13} className="mr-1.5 text-slate-400" /> Human Readable Access Directions</label>
                        <textarea rows={2} value={formData.directions} onChange={(e) => setFormData({ ...formData, directions: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white outline-hidden resize-none" placeholder="Provide entry directions for EV drivers..." />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5 flex items-center"><EyeOff size={12} className="mr-1" /> Publish Allowed To (JSON Array Token Spec)</label>
                            <input type="text" value={formData.publishAllowedTo} onChange={(e) => setFormData({ ...formData, publishAllowedTo: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:bg-white outline-hidden" placeholder='[{"uid": "12345", "type": "AD-HOC"}]' />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5 flex items-center"><MapPin size={12} className="mr-1" /> Related Locations (JSON Geo-Array)</label>
                            <input type="text" value={formData.relatedLocations} onChange={(e) => setFormData({ ...formData, relatedLocations: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:bg-white outline-hidden" placeholder='[{"latitude": "51.5", "longitude": "-0.1"}]' />
                        </div>
                    </div>
                </div>

                {/* 3. MULTI-SPEC SUBOPERATOR & GRID CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-3xs space-y-3">
                        <div className="flex items-center space-x-2 text-indigo-600 font-black text-xs uppercase border-b pb-2"><Layers size={14} /><span>Suboperator Dimensions</span></div>
                        <input type="text" value={formData.suboperatorName} onChange={(e) => setFormData({ ...formData, suboperatorName: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" placeholder="Suboperator Label Name" />
                        <input type="text" value={formData.suboperatorWebsite} onChange={(e) => setFormData({ ...formData, suboperatorWebsite: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" placeholder="Website Domain URL" />
                        <input type="text" value={formData.suboperatorLogoUrl} onChange={(e) => setFormData({ ...formData, suboperatorLogoUrl: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" placeholder="Branding Logo Asset URL" />
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-3xs space-y-3">
                        <div className="flex items-center space-x-2 text-indigo-600 font-black text-xs uppercase border-b pb-2"><Zap size={14} /><span>Grid Supply Energy Mix</span></div>
                        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200">
                            <span className="text-xs font-extrabold text-slate-700">100% Green Certified Energy</span>
                            <button type="button" onClick={() => setFormData({ ...formData, isGreenEnergy: !formData.isGreenEnergy })} className="text-indigo-600 cursor-pointer">
                                {formData.isGreenEnergy ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-slate-300" />}
                            </button>
                        </div>
                        <input type="text" value={formData.energySupplier} onChange={(e) => setFormData({ ...formData, energySupplier: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" placeholder="Utility Provider Supplier Name" />
                        <input type="text" value={formData.energyProduct} onChange={(e) => setFormData({ ...formData, energyProduct: e.target.value })} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" placeholder="Energy Product Name / Tariff" />
                    </div>
                </div>

                {/* 4. DYNAMIC CHILD EVSE HARDWARE PARAMETERS SECTION */}
                {formData.evses.length > 0 && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                        <div className="flex items-center space-x-2 text-slate-800 font-black text-sm uppercase tracking-tight border-b pb-2">
                            <Zap size={16} className="text-amber-500" />
                            <span>Linked EVSE Charging Hardware Units Metadata ({formData.evses.length})</span>
                        </div>

                        <div className="space-y-6 divide-y divide-slate-100">
                            {formData.evses.map((evse, evseIndex) => (
                                <div key={evse.id || evseIndex} className={`pt-4 ${evseIndex === 0 ? 'pt-0' : ''} space-y-3`}>
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 font-mono bg-slate-50 p-2 rounded-lg border">
                                        <span>Hardware ID: <b className="text-slate-800 font-sans">{evse.evse_id}</b></span>
                                        <span>Hardware Unit Reference Index #{evseIndex + 1}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase">Floor Level / Layer Placement</label>
                                            <input type="text" value={evse.floor_level} onChange={(e) => handleEvseChange(evseIndex, 'floor_level', e.target.value)} className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" placeholder="e.g. -1, Ground, Floor 2" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase">Parking Lot Restrictions</label>
                                            <input type="text" value={evse.parking_restrictions} onChange={(e) => handleEvseChange(evseIndex, 'parking_restrictions', e.target.value)} className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" placeholder="EV_ONLY, DISABLED, CUSTOMER_ONLY" />
                                        </div>
                                    </div>

                                    {/* DYNAMIC MULTI-IMAGE ARRAY INTERFACE (EVSE LEVEL) */}
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center">
                                                <ImageIcon size={12} className="mr-1.5" /> Hardware Device Photo Galleries
                                            </label>
                                            <button type="button" onClick={() => addEvseImageRow(evseIndex)} className="inline-flex items-center space-x-1 text-[9px] font-black px-2 py-0.5 bg-white text-slate-700 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors cursor-pointer">
                                                <Plus size={10} strokeWidth={3} />
                                                <span>Add Device Image</span>
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {evse.images.map((url, imgIndex) => (
                                                <div key={imgIndex} className="flex items-center space-x-2">
                                                    <input
                                                        type="text"
                                                        value={url}
                                                        onChange={(e) => handleEvseImageChange(evseIndex, imgIndex, e.target.value)}
                                                        className="flex-1 px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-slate-400 outline-hidden"
                                                        placeholder="https://your-domain.com/assets/charger-bay.png"
                                                    />
                                                    <button type="button" onClick={() => removeEvseImageRow(evseIndex, imgIndex)} className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer">
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase">Specific EVSE Latitude Override</label>
                                            <input type="text" value={evse.latitude} onChange={(e) => handleEvseChange(evseIndex, 'latitude', e.target.value)} className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold" placeholder="Optional coordinate override" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase">Specific EVSE Longitude Override</label>
                                            <input type="text" value={evse.longitude} onChange={(e) => handleEvseChange(evseIndex, 'longitude', e.target.value)} className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold" placeholder="Optional coordinate override" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase">Hardware Detailed Entry Directions</label>
                                            <input type="text" value={evse.directions} onChange={(e) => handleEvseChange(evseIndex, 'directions', e.target.value)} className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" placeholder="Next to bay 4 entrance pillar..." />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 5. VISIBILITY CONTROLS AND ACTIONS */}
                {/* 5. VISIBILITY CONTROLS AND ACTIONS */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                        {/* PUBLISH STATUS TOGGLE */}
                        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">Location Publish Status</label>
                                <span className="text-[10px] text-slate-400 font-semibold">
                                    {formData.publish
                                        ? "🟢 Live: Visible on all public open data mapping feeds."
                                        : "🔴 Hidden: Access restricted strictly to whitelist tokens."}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, publish: !formData.publish })}
                                className="text-indigo-600 cursor-pointer hover:scale-105 transition-transform"
                            >
                                {formData.publish ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-slate-300" />}
                            </button>
                        </div>

                        {/* CHARGING WHEN CLOSED TOGGLE */}
                        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">Out-Of-Hours Charging Availability</label>
                                <span className="text-[10px] text-slate-400 font-semibold">
                                    {formData.chargingWhenClosed
                                        ? "⚡ Active: Power feed lines stay open when facility closes."
                                        : "🔒 Terminated: Charging offline outside standard opening hours."}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, chargingWhenClosed: !formData.chargingWhenClosed })}
                                className="text-indigo-600 cursor-pointer hover:scale-105 transition-transform"
                            >
                                {formData.chargingWhenClosed ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-slate-300" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => router.push('/locations')} className="px-5 py-2 border border-slate-200 text-slate-700 text-xs font-bold uppercase rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">Cancel</button>
                        <button type="submit" disabled={submitting} className="flex cursor-pointer items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-black uppercase transition-all disabled:opacity-50 shadow-xs active:scale-95">
                            <Save size={13} strokeWidth={2.5} />
                            <span>{submitting ? 'Saving Metrics...' : 'Commit All Parameters'}</span>
                        </button>
                    </div>
                </div>
            </form>

            {/* FEEDBACK TOAST */}
            {statusFeedback.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-3xs" onClick={() => setStatusFeedback({ ...statusFeedback, show: false })}></div>
                    <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center space-y-4 z-50 animate-in zoom-in-95 duration-150">
                        <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center">
                            {statusFeedback.type === 'success' ? <CheckCircle2 size={28} className="text-emerald-500" /> : <ShieldAlert size={28} className="text-rose-600" />}
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-xs font-black text-slate-900 uppercase">Notification Registry</h4>
                            <p className="text-xs text-slate-500 font-bold px-2 leading-relaxed">{statusFeedback.message}</p>
                        </div>
                        <button type="button" onClick={() => { setStatusFeedback({ ...statusFeedback, show: false }); if (statusFeedback.type === 'error') router.push('/locations'); }} className={`w-full py-2.5 text-xs font-black uppercase rounded-xl text-white ${statusFeedback.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>Dismiss Notifier</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function EnrichLocationPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 font-bold text-xs uppercase tracking-wider">
                <Globe className="animate-spin text-indigo-600 mb-3" size={28} />
                <span>Initializing Form Workspace...</span>
            </div>
        }>
            <EnrichFormContent />
        </Suspense>
    );
}