import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function TrafficAnalytics() {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(7);

    const fetchMetrics = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/v1/open-data/admin/traffic-metrics?days=${days}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMetrics(res.data);
        } catch (err) {
            console.error('Failed to load traffic metrics', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
    }, [days]);

    if (loading) return <div className="p-4 text-gray-500">Loading traffic analytics...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">API Request & IP Traffic Analytics</h1>
                <select
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-1.5"
                >
                    <option value={1}>Last 24 Hours</option>
                    <option value={7}>Last 7 Days</option>
                    <option value={30}>Last 30 Days</option>
                </select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-lg border shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">Total API Requests</p>
                    <p className="text-3xl font-bold text-blue-600">{metrics?.summary?.total_requests || 0}</p>
                </div>
                <div className="bg-white p-5 rounded-lg border shadow-sm">
                    <p className="text-sm text-gray-500 font-medium">Active Unique Client IPs</p>
                    <p className="text-3xl font-bold text-green-600">{metrics?.top_client_ips?.length || 0}</p>
                </div>
            </div>

            {/* Top Requesting IPs Table */}
            <div className="bg-white rounded-lg border shadow-sm p-5">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">Top Requesting IP Addresses</h2>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">IP Address</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Request Count</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {metrics?.top_client_ips?.map((item, idx) => (
                            <tr key={idx}>
                                <td className="px-4 py-2 font-mono text-sm text-gray-800">{item.ip}</td>
                                <td className="px-4 py-2 text-right text-sm font-semibold text-gray-700">{item.count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Recent Request Logs */}
            <div className="bg-white rounded-lg border shadow-sm p-5">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">Recent Request Audit Logs</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-3 py-2 text-left text-xs text-gray-500">Timestamp</th>
                                <th className="px-3 py-2 text-left text-xs text-gray-500">IP Address</th>
                                <th className="px-3 py-2 text-left text-xs text-gray-500">Endpoint</th>
                                <th className="px-3 py-2 text-left text-xs text-gray-500">Operator Ref</th>
                                <th className="px-3 py-2 text-right text-xs text-gray-500">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {metrics?.recent_logs?.map((log) => (
                                <tr key={log.id}>
                                    <td className="px-3 py-2 text-gray-500 text-xs">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2 font-mono text-xs">{log.ipAddress}</td>
                                    <td className="px-3 py-2">{log.endpoint}</td>
                                    <td className="px-3 py-2 font-mono text-xs text-gray-600">
                                        {log.operatorReferenceId || '-'}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${log.statusCode < 400 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {log.statusCode}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}