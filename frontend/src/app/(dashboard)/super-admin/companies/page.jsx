'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import {
    Plus, Building2, Search, Edit2, Trash2, Eye,
    X, Mail, Calendar, AlertCircle, Hash, Zap, Users,
    ShieldCheck, ShieldAlert, RefreshCw, Loader2
} from 'lucide-react';

export default function CompaniesPage() {
    // Data State
    const [companies, setCompanies] = useState([]);
    const [filteredCompanies, setFilteredCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State (null = closed, 'create' | 'edit' | 'details' | 'delete')
    const [modalMode, setModalMode] = useState(null);
    const [selectedCompany, setSelectedCompany] = useState(null);

    // Form State
    const [formData, setFormData] = useState({ name: '', contactEmail: '' });
    const [submitting, setSubmitting] = useState(false);

    // Fetch companies on load
    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const response = await api.get('/companies');
            if (response.data.success) {
                setCompanies(response.data.data);
                setFilteredCompanies(response.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch companies", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    // Handle Search Filter Matrix
    useEffect(() => {
        const query = searchQuery.toLowerCase().trim();
        const filtered = companies.filter(company =>
            company.name.toLowerCase().includes(query) ||
            company.contactEmail.toLowerCase().includes(query) ||
            (company.status && company.status.toLowerCase().includes(query))
        );
        setFilteredCompanies(filtered);
    }, [searchQuery, companies]);

    // Modal Handlers
    const openModal = (mode, company = null) => {
        setModalMode(mode);
        setSelectedCompany(company);
        if (company && (mode === 'edit' || mode === 'details')) {
            setFormData({ name: company.name, contactEmail: company.contactEmail });
        } else {
            setFormData({ name: '', contactEmail: '' });
        }
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedCompany(null);
        setFormData({ name: '', contactEmail: '' });
    };

    // CRUD Operations
    const handleSave = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (modalMode === 'create') {
                await api.post('/companies', formData);
            } else if (modalMode === 'edit') {
                await api.put(`/companies/${selectedCompany.id}`, formData);
            }
            fetchCompanies();
            closeModal();
        } catch (error) {
            alert(`Failed to ${modalMode} company: ` + (error.response?.data?.message || 'Unknown error'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setSubmitting(true);
        try {
            await api.delete(`/companies/${selectedCompany.id}`);
            fetchCompanies();
            closeModal();
        } catch (error) {
            alert(error.response?.data?.message || "Failed to delete company");
        } finally {
            setSubmitting(false);
        }
    };

    // --- Dynamic Operational Lifecycle Status Control Toggle ---
    const handleToggleStatus = async (id, currentStatus) => {
        setSubmitting(true);
        // If current state is anything but ACTIVE (e.g., PENDING or SUSPENDED), target state becomes ACTIVE
        const targetStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        try {
            const response = await api.put(`/admin/companies/${id}/status`, { status: targetStatus });
            if (response.data.success) {
                // Instantly sync the localized row collection array matrix maps
                setCompanies(prev => prev.map(c => c.id === id ? { ...c, status: targetStatus } : c));
                if (selectedCompany && selectedCompany.id === id) {
                    setSelectedCompany(prev => ({ ...prev, status: targetStatus }));
                }
            }
        } catch (error) {
            alert(error.response?.data?.message || "Failed to change operational lifecycle boundary.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-2">

            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Operators</h2>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">Manage EV charging networks, approval workflows, and tenancy partitions</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
                    {/* Search Bar Input Deck */}
                    <div className="relative w-full sm:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={16} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search operators or status..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 transition-all bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400"
                        />
                    </div>

                    {/* Fresh Mutation Add Operator Trigger Button */}
                    <button
                        onClick={() => openModal('create')}
                        className="flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-98 cursor-pointer"
                    >
                        <Plus size={14} strokeWidth={2.5} />
                        <span>Add Operator</span>
                    </button>
                </div>
            </div>

            {/* Main Operational Table Layout Data Matrix Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/70">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black uppercase text-slate-500 tracking-wider">Company</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black uppercase text-slate-500 tracking-wider">Contact</th>
                                <th scope="col" className="px-6 py-4 text-center text-[11px] font-black uppercase text-slate-500 tracking-wider">Metrics</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-black uppercase text-slate-500 tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-4 text-right text-[11px] font-black uppercase text-slate-500 tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3 text-slate-400">
                                            <RefreshCw size={24} className="animate-spin text-indigo-600" />
                                            <p className="text-xs font-bold tracking-wide animate-pulse">Loading operators registration schemas...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredCompanies.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                                            <AlertCircle size={32} className="text-slate-300" />
                                            <p className="text-sm font-black text-slate-700">No network operator containers found</p>
                                            <p className="text-xs text-slate-400 font-medium">Try adjusting your search filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                companies.map((company) => (
                                    <tr key={company.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-black border border-slate-200 uppercase text-xs">
                                                    {company.name.charAt(0)}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-extrabold text-slate-900">{company.name}</div>
                                                    <div className="text-xs font-mono font-bold text-slate-400">ID: #{company.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-xs font-semibold text-slate-600">
                                                <Mail size={13} className="mr-2 text-slate-400 shrink-0" />
                                                {company.contactEmail}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center space-x-4">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xs font-extrabold text-slate-900">{company._count?.users ?? 0}</span>
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Users</span>
                                                </div>
                                                <div className="h-6 w-px bg-slate-100"></div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xs font-extrabold text-slate-900">{company._count?.chargePoints ?? 0}</span>
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">EVSE Nodes</span>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Color Mapped Status Badge Display */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-0.5 inline-flex text-[10px] font-black rounded-full border ${company.status === 'SUSPENDED'
                                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                    : company.status === 'PENDING'
                                                        ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                }`}>
                                                {company.status || 'ACTIVE'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openModal('details', company)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer" title="View Details">
                                                    <Eye size={16} />
                                                </button>
                                                <button onClick={() => openModal('edit', company)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer" title="Edit Properties">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => openModal('delete', company)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Delete Operator Container">
                                                    <Trash2 size={16} />
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

            {/* Premium Overlay Modal Container View */}
            {modalMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity" onClick={closeModal}></div>

                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-slate-100 animate-in zoom-in-95 duration-200">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                                {modalMode === 'create' && 'Provision Operator Network'}
                                {modalMode === 'edit' && 'Modify Operator Scope'}
                                {modalMode === 'details' && 'Operator Audit Specs'}
                                {modalMode === 'delete' && 'Confirm Destructive Wipe'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-lg transition-colors cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Content - CREATE & EDIT FORM FIELDS */}
                        {(modalMode === 'create' || modalMode === 'edit') && (
                            <form onSubmit={handleSave} className="p-6 space-y-4">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">Company Registered Legal Name</label>
                                        <input
                                            type="text" required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-slate-400 transition-all outline-hidden"
                                            placeholder="e.g. EcoCharge Grid Infrastructure"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">Corporate Core contactEmail</label>
                                        <input
                                            type="email" required
                                            value={formData.contactEmail}
                                            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-slate-400 transition-all outline-hidden"
                                            placeholder="contact@company.com"
                                        />
                                    </div>
                                </div>
                                <div className="flex space-x-3 pt-4 border-t border-slate-100 mt-6">
                                    <button type="button" onClick={closeModal} className="flex-1 py-2 text-xs font-bold uppercase tracking-wider border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={submitting} className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer">
                                        {submitting ? 'Committing...' : (modalMode === 'create' ? 'Deploy Container' : 'Save Alignment')}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Modal Content - SPECIFIC DETAILS CARD INCORPORATING LIVE STATUS OVERRIDE BUTTON */}
                        {modalMode === 'details' && selectedCompany && (
                            <div className="p-6 space-y-5">
                                <div className="flex items-center space-x-4 pb-4 border-b border-slate-100">
                                    <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm uppercase">
                                        {selectedCompany.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="text-base font-extrabold text-slate-900 leading-tight">{selectedCompany.name}</h4>
                                        <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${selectedCompany.status === 'SUSPENDED'
                                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                : selectedCompany.status === 'PENDING'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            }`}>
                                            {selectedCompany.status || 'ACTIVE'} STATE
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="flex items-center text-slate-400 mb-0.5"><Hash size={12} className="mr-1" /> <span className="text-[9px] uppercase tracking-wider font-bold">Tenancy ID</span></div>
                                        <p className="font-bold text-slate-800">#{selectedCompany.id}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="flex items-center text-slate-400 mb-0.5"><Users size={12} className="mr-1" /> <span className="text-[9px] uppercase tracking-wider font-bold">Admin Identites</span></div>
                                        <p className="font-bold text-slate-800">{selectedCompany._count?.users ?? 0} Nodes</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 sm:col-span-2">
                                        <div className="flex items-center text-slate-400 mb-0.5"><Mail size={12} className="mr-1" /> <span className="text-[9px] uppercase tracking-wider font-bold">Communications Endpoint</span></div>
                                        <p className="font-bold text-slate-800 break-all">{selectedCompany.contactEmail}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 sm:col-span-2">
                                        <div className="flex items-center text-slate-400 mb-0.5"><Calendar size={12} className="mr-1" /> <span className="text-[9px] uppercase tracking-wider font-bold">Initialization Timestamp</span></div>
                                        <p className="font-bold text-slate-800">{new Date(selectedCompany.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>

                                {/* Interactive Onboarding Sync Management Override Button */}
                                <div className="flex gap-3 pt-3 border-t border-slate-100 mt-4">
                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => handleToggleStatus(selectedCompany.id, selectedCompany.status || 'ACTIVE')}
                                        className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-xs transition-all active:scale-97 disabled:opacity-50 cursor-pointer ${selectedCompany.status === 'SUSPENDED' || selectedCompany.status === 'PENDING'
                                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                                            }`}
                                    >
                                        {submitting ? (
                                            <Loader2 size={13} className="animate-spin" />
                                        ) : selectedCompany.status === 'SUSPENDED' || selectedCompany.status === 'PENDING' ? (
                                            <> <ShieldCheck size={13} /> <span>Approve & Activate</span> </>
                                        ) : (
                                            <> <ShieldAlert size={13} /> <span>Suspend Tenancy</span> </>
                                        )}
                                    </button>
                                    <button onClick={closeModal} className="px-5 py-2 bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-200 transition-colors cursor-pointer">
                                        Close
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Modal Content - CRITICAL DESTRUCTIVE PURGE WARN */}
                        {modalMode === 'delete' && selectedCompany && (
                            <div className="p-6 space-y-6">
                                <div className="flex flex-col items-center text-center space-y-3">
                                    <div className="h-14 w-14 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 shadow-inner">
                                        <AlertCircle size={26} />
                                    </div>
                                    <div>
                                        <h4 className="text-base font-black text-slate-900">Purge Operator network?</h4>
                                        <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1 max-w-xs mx-auto">
                                            Warning: This execution is absolute. Deleting <span className="font-extrabold text-slate-800">"{selectedCompany.name}"</span> cascaded-drops all associated operators, tracking keys, locations, and charge point hardware connections instantly.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex space-x-3 pt-4 border-t border-slate-100">
                                    <button type="button" onClick={closeModal} className="flex-1 py-2 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                                        Cancel
                                    </button>
                                    <button type="button" onClick={handleDelete} disabled={submitting} className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-97 disabled:opacity-70 cursor-pointer">
                                        {submitting ? 'Purging Archive...' : 'Confirm Purge'}
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