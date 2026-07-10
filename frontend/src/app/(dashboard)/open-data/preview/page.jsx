'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import {
    Globe, Server, ShieldCheck, MapPin, DollarSign,
    Layers, Terminal, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';

export default function DatasetPreviewPage() {
    const [feedData, setFeedData] = useState([]);
    const [tariffData, setTariffData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [schemaValid, setSchemaValid] = useState(null);
    const [activeTab, setActiveTab] = useState('summary');

    const fetchPublicFeeds = async () => {
        setLoading(true);
        setSchemaValid(null);
        try {
            // FIXED: Shift targets from open global routes directly over your isolated tenant workspace gateways
            const [locResponse, tariffResponse] = await Promise.allSettled([
                api.get('/open-data/preview/feed'),
                api.get('/open-data/preview/tariffs')
            ]);

            if (locResponse.status === 'fulfilled' && locResponse.value.data?.data) {
                setFeedData(locResponse.value.data.data);
                validateFeedSchema(locResponse.value.data.data);
            }
            if (tariffResponse.status === 'fulfilled' && tariffResponse.value.data?.data) {
                setTariffData(tariffResponse.value.data.data);
            }
        } catch (error) {
            console.error("Failed to sync live data streams:", error);
            setSchemaValid(false);
        } finally {
            setLoading(false);
        }
    };

    const validateFeedSchema = (data) => {
        if (!Array.isArray(data) || data.length === 0) return setSchemaValid(false);
        const elementsValid = data.every(loc =>
            loc.id && loc.name && loc.coordinates?.latitude && Array.isArray(loc.evses)
        );
        setSchemaValid(elementsValid);
    };

    useEffect(() => {
        fetchPublicFeeds();
    }, []);

    return (
        <div className="max-w-6xl mx-auto space-y-8 px-2 select-none">

            {/* Header Banner */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center space-x-4">
                    <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                        <Globe size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Dataset Broadcast Preview</h2>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">Inspect open compliance data and billing matrix feeds live</p>
                    </div>
                </div>

                <button
                    onClick={fetchPublicFeeds} disabled={loading}
                    className="flex cursor-pointer items-center space-x-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl hover:bg-slate-800 font-black text-xs uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    <span>Sync Tenant Feeds</span>
                </button>
            </div>

            {/* Metrics Matrix Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-slate-50 text-slate-600 rounded-xl"><Server size={18} /></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Your Active Sites</p>
                            <p className="text-sm font-black text-slate-800 mt-0.5">{feedData.length} Live Locations</p>
                        </div>
                    </div>
                    <span className="h-2.5 w-2.5 bg-emerald-500 rounded-full animate-pulse" />
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-slate-50 text-slate-600 rounded-xl"><DollarSign size={18} /></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Your Billing Tariffs</p>
                            <p className="text-sm font-black text-slate-800 mt-0.5">{tariffData.length} OCPI Base Schemes</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-slate-50 text-slate-600 rounded-xl"><ShieldCheck size={18} /></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Schema Conformance</p>
                            <p className="text-sm font-black text-slate-800 mt-0.5">
                                {schemaValid ? 'OCPI Compliant' : 'Evaluating Maps...'}
                            </p>
                        </div>
                    </div>
                    {schemaValid ? <CheckCircle2 size={18} className="text-emerald-500" /> : <AlertCircle size={18} className="text-amber-500" />}
                </div>
            </div>

            {/* Workspace View Navigation Switcher */}
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xs overflow-hidden">
                <div className="flex border-b border-slate-100 bg-slate-50/50 px-4">
                    {['summary', 'tariffs', 'raw_locations', 'raw_tariffs'].map((tab) => (
                        <button
                            key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeTab === tab ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            {tab.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="p-16 text-center text-slate-400 font-bold text-xs uppercase tracking-wider animate-pulse flex flex-col items-center justify-center space-y-3">
                        <RefreshCw size={20} className="animate-spin text-indigo-600" />
                        <span>Compiling real-time isolated payload manifests...</span>
                    </div>
                ) : (
                    <div className="p-6">

                        {/* 1. NODE MATRIX SUMMARY MAP */}
                        {activeTab === 'summary' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {feedData.map(node => (
                                    <div key={node.id} className="p-5 bg-slate-50 border border-slate-200/60 rounded-2xl flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors">
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-sm font-black text-slate-900">{node.name}</h4>
                                                <span className="text-[10px] font-mono font-bold bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded-md shadow-2xs">{node.id}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 font-medium mt-1">{node.address}, {node.city}</p>
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-600 bg-white border border-slate-100 p-3 rounded-xl">
                                            <div className="flex items-center"><MapPin size={13} className="mr-1 text-slate-400" /> {parseFloat(node.coordinates.latitude).toFixed(3)}, {parseFloat(node.coordinates.longitude).toFixed(3)}</div>
                                            <div className="text-indigo-600 font-black">{node.evses?.length || 0} Connected EVSEs</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 2. DYNAMIC OCPI TARIFF COMPLIANCE VIEW */}
                        {activeTab === 'tariffs' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {tariffData.map(tariff => (
                                    <div key={tariff.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-3 bg-slate-200/60 text-slate-700 border-bl border-slate-200 text-[10px] font-black tracking-wider rounded-bl-xl">{tariff.currency}</div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Tariff Reference ID</p>
                                        <p className="text-xs font-mono font-bold text-slate-900 mt-1 truncate pr-14">#{tariff.id}</p>

                                        <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-500">Rate Cost Element:</span>
                                            <span className="text-base font-black text-slate-900">
                                                {tariff.elements[0]?.price_components[0]?.price.toFixed(4)} <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">/kWh</span>
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 3. RAW PAYLOAD VIEWS */}
                        {activeTab === 'raw_locations' && (
                            <div className="bg-slate-950 rounded-2xl p-4 text-slate-200 font-mono text-xs overflow-x-auto"><pre>{JSON.stringify(feedData, null, 2)}</pre></div>
                        )}
                        {activeTab === 'raw_tariffs' && (
                            <div className="bg-slate-950 rounded-2xl p-4 text-slate-200 font-mono text-xs overflow-x-auto"><pre>{JSON.stringify(tariffData, null, 2)}</pre></div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
}