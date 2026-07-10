'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import {
    Receipt, Calendar, Zap, Layers,
    RefreshCw, Search, DollarSign, Download
} from 'lucide-react';

export default function TransactionsPage() {
    const { user } = useAuthStore();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const response = await api.get('/sessions/transactions');
            if (response.data.success) {
                setTransactions(response.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch transactions", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchTransactions();
    }, [user]);

    // Format Duration Helper
    const formatDuration = (start, end) => {
        if (!start || !end) return '—';
        const diffMs = new Date(end) - new Date(start);
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    // Format Date Helper
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/60">
                <div className="flex items-center space-x-4">
                    <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl text-emerald-600 ring-1 ring-emerald-200/50 shadow-inner">
                        <Receipt size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Billing & Transactions</h2>
                        <p className="text-sm text-slate-500 mt-0.5 font-medium">Historical log of completed charging sessions and revenue</p>
                    </div>
                </div>

                <div className="flex space-x-3">
                    <button
                        onClick={fetchTransactions}
                        disabled={loading}
                        className="flex items-center justify-center p-2.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button className="flex items-center justify-center space-x-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-95">
                        <Download size={18} strokeWidth={2.5} />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Session Ref</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Location / Hardware</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Time & Duration</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Energy Drawn</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total Bill</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-16 text-center text-slate-400">
                                        <Receipt size={32} className="animate-pulse mx-auto mb-3 text-emerald-400" />
                                        <p className="text-sm font-medium">Loading transaction history...</p>
                                    </td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-16 text-center text-slate-500">
                                        <Layers size={36} className="mx-auto mb-3 text-slate-300" strokeWidth={1.5} />
                                        <p className="text-base font-bold text-slate-900">No transactions found</p>
                                        <p className="text-sm mt-1">Completed charging sessions will appear here.</p>
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">

                                        {/* Session ID */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs mr-3 border border-slate-200">
                                                    #{t.id}
                                                </div>
                                                <span className="text-xs font-semibold px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100">
                                                    COMPLETED
                                                </span>
                                            </div>
                                        </td>

                                        {/* Hardware/Location */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900">{t.connector?.chargePoint?.location?.name || 'Unknown Site'}</span>
                                                <span className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center">
                                                    HW: {t.connector?.chargePoint?.hardwareId} • Plug {t.connectorId}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Time */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-slate-700 flex items-center">
                                                    <Calendar size={12} className="mr-1.5 text-slate-400" />
                                                    {formatDate(t.startTime)}
                                                </span>
                                                <span className="text-xs font-bold text-slate-400 mt-0.5 ml-4">
                                                    Duration: {formatDuration(t.startTime, t.endTime)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Energy */}
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className="text-sm font-extrabold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100/50">
                                                {t.kwhConsumed.toFixed(2)} kWh
                                            </span>
                                        </td>

                                        {/* Cost */}
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-base font-extrabold text-slate-900 flex items-center">
                                                    <DollarSign size={14} className="text-slate-400 mr-0.5" />
                                                    {t.totalCost.toFixed(2)}
                                                </span>
                                                <span className="text-xs font-medium text-slate-400 mt-0.5">
                                                    {t.connector?.tariff ? `${t.connector.tariff.currency}` : 'Free'}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}