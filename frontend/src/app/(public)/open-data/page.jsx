'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import api from '@/lib/axios';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import {
    MapPin, Zap, Layers, Server, Search, Compass,
    ChevronLeft, ChevronRight, RefreshCw, X, Eye,
    ExternalLink, Building2, Clock, Filter, ImageIcon
} from 'lucide-react';

// Dynamic import prevents server-side rendering errors with Leaflet
const LiveLeafletMapInstance = dynamic(
    () => import('@/components/maps/LiveLeafletMapInstance'),
    { ssr: false, loading: () => <div className="w-full h-full bg-slate-100 animate-pulse" /> }
);

export default function PublicOpenDataExplorer() {
    const [locations, setLocations] = useState([]);
    const [meta, setMeta] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(9); // Clean 3x3 layout

    const [selectedPowerType, setSelectedPowerType] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');

    const [selectedLoc, setSelectedLoc] = useState(null);
    const [lightboxImage, setLightboxImage] = useState(null);

    const fetchPublicFeed = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/open-data/feed?page=${page}&limit=${limit}&search=${search}`);
            if (response.data?.data) {
                setLocations(response.data.data);
                setMeta(response.data.meta || {});
            }
        } catch (error) {
            console.error("Failed to fetch public feed:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPublicFeed();
    }, [page, search]);

    const filteredLocations = locations.filter(loc => {
        let matchPower = true;
        let matchStatus = true;

        if (selectedPowerType) {
            matchPower = loc.evses?.some(evse =>
                evse.connectors?.some(conn => conn.power_type?.includes(selectedPowerType))
            );
        }
        if (selectedStatus) {
            matchStatus = loc.evses?.some(evse => evse.status === selectedStatus);
        }

        return matchPower && matchStatus;
    });

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans antialiased text-slate-900 select-none">
            {Header && <Header />}

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

                {/* Search & Filter Header */}
                <div className="bg-white rounded-3xl border border-slate-200 p-5 flex flex-col md:flex-row items-center gap-4 justify-between shadow-xs">
                    <div className="relative w-full md:w-80 group">
                        <Search size={14} className="absolute left-3.5 top-3.5 text-slate-400 group-focus-within:text-slate-800 transition-colors" />
                        <input
                            type="text"
                            placeholder="Filter by title, postcode, city..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-slate-400 outline-hidden transition-all"
                        />
                    </div>

                    <div className="flex w-full md:w-auto items-center gap-2 text-xs font-black uppercase tracking-wider">
                        <div className="flex items-center text-slate-400 mr-2 gap-1"><Filter size={14} /> <span>Filters:</span></div>
                        <select
                            value={selectedPowerType}
                            onChange={(e) => setSelectedPowerType(e.target.value)}
                            className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-700 text-[11px] font-bold cursor-pointer"
                        >
                            <option value="">All Power Types</option>
                            <option value="AC">AC Charging</option>
                            <option value="DC">DC Rapid Charging</option>
                        </select>

                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-700 text-[11px] font-bold cursor-pointer"
                        >
                            <option value="">All Statuses</option>
                            <option value="AVAILABLE">AVAILABLE NOW</option>
                            <option value="OPERATIONAL">OPERATIONAL</option>
                        </select>
                    </div>
                </div>

                {/* Grid View */}
                {loading ? (
                    <div className="py-24 text-center text-slate-400 font-bold text-xs uppercase tracking-widest flex flex-col items-center justify-center space-y-3">
                        <RefreshCw size={24} className="animate-spin text-slate-900" />
                        <span>Compiling network view...</span>
                    </div>
                ) : filteredLocations.length === 0 ? (
                    <div className="py-24 bg-white border border-slate-200 rounded-3xl text-center max-w-md mx-auto p-6">
                        <Server size={28} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider">No charging nodes found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredLocations.map((loc) => {
                            const lat = parseFloat(loc.coordinates?.latitude);
                            const lng = parseFloat(loc.coordinates?.longitude);
                            return (
                                <div key={loc.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col justify-between p-4 shadow-2xs hover:border-slate-300 transition-all">
                                    <div className="space-y-4">
                                        {/* Grid Card Map Placement instead of static photos */}
                                        <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 relative z-0 shadow-inner">
                                            {!isNaN(lat) && !isNaN(lng) && (
                                                <LiveLeafletMapInstance
                                                    locations={[loc]}
                                                    centerCoords={[lat, lng]}
                                                    interactive={false}
                                                />
                                            )}
                                            <span className="absolute top-3 right-3 text-[9px] font-black font-mono bg-slate-900/90 border border-white/5 text-white px-2 py-0.5 rounded-md z-10 shadow-xs">
                                                {loc.party_id}
                                            </span>
                                        </div>

                                        <div className="space-y-1">
                                            <h3 className="text-sm font-black text-slate-900 truncate uppercase tracking-wide">{loc.name}</h3>
                                            <p className="text-xs font-semibold text-slate-400 truncate flex items-center">
                                                <MapPin size={12} className="mr-1 text-slate-300 shrink-0" /> {loc.address}, {loc.city}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-lg">
                                            {loc.evses?.length || 0} Plugs Deployed
                                        </span>
                                        <button
                                            onClick={() => setSelectedLoc(loc)}
                                            className="inline-flex cursor-pointer items-center space-x-1 px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white transition-colors"
                                        >
                                            <span>Inspect Site</span>
                                            <ExternalLink size={10} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination deck */}
                {!loading && meta.total_pages > 1 && (
                    <div className="pt-4 flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-400 max-w-xs mx-auto w-full">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-800 disabled:opacity-40 cursor-pointer transition-colors"
                        >
                            <ChevronLeft size={12} strokeWidth={2.5} />
                        </button>
                        <span className="text-slate-700">Page {page} / {meta.total_pages}</span>
                        <button
                            disabled={page === meta.total_pages}
                            onClick={() => setPage(p => Math.min(meta.total_pages, p + 1))}
                            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
                        >
                            <ChevronRight size={12} strokeWidth={2.5} />
                        </button>
                    </div>
                )}
            </main>

            {/* --- IMMERSIVE COMPLIANT DETAIL DRAWER INTERACTIVE MODAL OVERLAY --- */}
            {selectedLoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
                    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity" onClick={() => setSelectedLoc(null)}></div>

                    <div className="relative bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden z-50 animate-in zoom-in-95 duration-200">
                        {/* Modal Header Panel */}
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
                            <div className="space-y-0.5">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">OCPI Station Profile</h3>
                                <p className="text-sm font-black text-slate-800 font-mono">#{selectedLoc.id.toUpperCase()}</p>
                            </div>
                            <button onClick={() => setSelectedLoc(null)} className="text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 p-1.5 rounded-full transition-colors cursor-pointer">
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Modal Scrollable Body */}
                        <div className="flex-1 overflow-y-auto scrollbar-none space-y-6">

                            {/* LARGE MAP HIGH-VISIBILITY TOP BANNER SECTION */}
                            <div className="h-64 sm:h-80 border-b border-slate-200 relative w-full bg-slate-50 z-0">
                                <LiveLeafletMapInstance
                                    locations={[selectedLoc]}
                                    centerCoords={[parseFloat(selectedLoc.coordinates.latitude), parseFloat(selectedLoc.coordinates.longitude)]}
                                    interactive={true}
                                />
                            </div>

                            <div className="px-6 pb-6 space-y-6">
                                {/* Base Profile Specifications Grid */}
                                <div className="bg-white border border-slate-200 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-6 items-center shadow-2xs">
                                    <div className="md:col-span-2 space-y-1.5">
                                        <h2 className="text-xl font-black text-slate-900 tracking-tight">{selectedLoc.name}</h2>
                                        <p className="text-xs font-semibold text-slate-400 flex items-center">
                                            <MapPin size={13} className="mr-1 text-slate-300 shrink-0" /> {selectedLoc.address}, {selectedLoc.city}, {selectedLoc.postal_code}
                                        </p>
                                    </div>
                                    <div className="bg-slate-900 border border-slate-800 text-slate-100 p-4 rounded-xl flex justify-between items-baseline shadow-md">
                                        <div className="space-y-0.5">
                                            <span className="text-[9px] font-black uppercase text-blue-400 block tracking-wider">Unit Delivery Rate:</span>
                                            <span className="text-lg font-black text-white">£0.65<span className="text-xs font-bold text-slate-400">/kWh</span></span>
                                        </div>
                                        <span className="font-mono text-[9px] text-slate-500 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded">#T-{selectedLoc.id.split('_')[1]}</span>
                                    </div>
                                </div>

                                {/* GALLERY STYLE IMAGE GRID WITH MAX 5 IMAGES ROWS */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center"><ImageIcon size={13} className="mr-1.5 text-slate-400" /> Uploaded Site Media Gallery ({selectedLoc.images?.length || 0})</h4>
                                    {selectedLoc.images && selectedLoc.images.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                            {selectedLoc.images.map((img, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => setLightboxImage(img.url)}
                                                    className="relative aspect-video rounded-xl border border-slate-200 overflow-hidden bg-slate-100 group shadow-3xs cursor-pointer"
                                                >
                                                    <img src={img.url} alt="Gallery context node" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                                        <Eye size={16} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 font-bold italic bg-slate-50 border border-slate-200/60 p-4 rounded-xl text-center">No visual images uploaded for this station coordinate loop.</p>
                                    )}
                                </div>

                                {/* Dynamic Details Spec Sheets Row */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold bg-slate-50 border border-slate-200/60 p-4 rounded-xl">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Network Operator</span>
                                        <span className="text-slate-800 flex items-center font-extrabold"><Building2 size={13} className="mr-1 text-slate-400 shrink-0" /> {selectedLoc.operator?.name || 'Independent Operator'}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Parking Layout</span>
                                        <span className="text-slate-800 font-extrabold capitalize">{selectedLoc.parking_type?.replace(/_/g, ' ').toLowerCase() || 'Unspecified'}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Access Schedule</span>
                                        <span className="text-emerald-700 font-extrabold flex items-center"><Clock size={13} className="mr-1 text-emerald-500 shrink-0" /> 24/7 Unrestricted</span>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Vector Bounds</span>
                                        <span className="text-slate-800 font-mono font-bold flex items-center"><Compass size={13} className="mr-1 text-slate-400 shrink-0" /> {parseFloat(selectedLoc.coordinates.latitude).toFixed(4)}°, {parseFloat(selectedLoc.coordinates.longitude).toFixed(4)}°</span>
                                    </div>
                                </div>

                                {/* EVSE Plugs Deployments Sheet Tree */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Operational Plug Nodes ({selectedLoc.evses?.length || 0})</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {selectedLoc.evses?.map((evse, eIdx) => (
                                            <div key={eIdx} className="bg-white border border-slate-200 shadow-3xs rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center space-x-2">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${evse.status === 'AVAILABLE' || evse.status === 'OPERATIONAL' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                                                        <span className="text-xs font-mono font-black text-slate-800">{evse.evse_id}</span>
                                                    </div>
                                                    <div className="text-[10px] font-bold text-slate-400">Ref ID Identifier: {evse.physical_reference}</div>
                                                </div>

                                                <div className="w-full md:w-auto space-y-1.5 shrink-0">
                                                    {evse.connectors?.map((conn, cIdx) => (
                                                        <div key={cIdx} className="bg-slate-50 border border-slate-100 p-2.5 flex items-center justify-between gap-8 min-w-[280px] rounded-xl">
                                                            <div className="flex items-center space-x-2">
                                                                <div className="p-1 bg-white border border-slate-200 rounded-lg text-slate-700 shadow-3xs"><Zap size={12} /></div>
                                                                <div>
                                                                    <p className="text-[11px] font-black text-slate-800 leading-none">{conn.standard.replace(/_/g, ' ')}</p>
                                                                    <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{conn.format} • {conn.power_type?.split('_')[0]} Phase</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xs font-black text-slate-900">{conn.max_electric_power || '—'} kW</p>
                                                                <p className="text-[9px] font-mono font-bold text-slate-400 mt-0.5">{conn.max_voltage}V / {conn.max_amperage}A</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            )}

            {lightboxImage && (
                <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <button onClick={() => setLightboxImage(null)} className="absolute top-6 right-6 p-2 bg-white/10 text-white hover:bg-white/20 border border-white/10 rounded-full cursor-pointer">
                        <X size={20} strokeWidth={2.5} />
                    </button>
                    <div className="max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl animate-in zoom-in-95 duration-150">
                        <img src={lightboxImage} alt="Expanded Lightbox View" className="w-full h-full object-contain" />
                    </div>
                </div>
            )}

            {Footer && <Footer />}
        </div>
    );
}