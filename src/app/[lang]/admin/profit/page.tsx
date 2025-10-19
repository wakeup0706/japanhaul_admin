"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAnalytics } from "@/lib/hooks/useAnalytics";
import { calculateProfitData, getProfitSummary, ProfitData } from "@/lib/db/profit";

// Chart components (simplified for demo)
interface ChartData {
    name: string;
    value: number;
}

interface BarChartProps {
    data: ChartData[];
    title: string;
    color?: string;
}

interface LineChartProps {
    data: ProfitData[];
    title: string;
}

function BarChart({ data, title, color = "#3B82F6" }: BarChartProps) {
    const maxValue = Math.max(...data.map(d => d.value));

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">{title}</h3>
            <div className="space-y-2">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center space-x-3">
                        <div className="w-20 text-sm text-gray-600 truncate">{item.name}</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                            <div
                                className="h-6 rounded-full transition-all duration-300"
                                style={{
                                    width: `${(item.value / maxValue) * 100}%`,
                                    backgroundColor: color,
                                }}
                            />
                            <div className="absolute inset-0 flex items-center justify-end pr-2">
                                <span className="text-xs font-medium text-white">{item.value}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function LineChart({ data, title }: LineChartProps) {
    if (data.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">{title}</h3>
                <div className="text-center text-gray-500 py-8">No data available</div>
            </div>
        );
    }

    const maxProfit = Math.max(...data.map(d => d.totalProfit));

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">{title}</h3>
            <div className="space-y-2">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center space-x-3">
                        <div className="w-20 text-sm text-gray-600">
                            {new Date(item.date).toLocaleDateString()}
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                            <div
                                className="h-6 rounded-full transition-all duration-300"
                                style={{
                                    width: `${(item.totalProfit / maxProfit) * 100}%`,
                                    backgroundColor: item.totalProfit >= 0 ? "#10B981" : "#EF4444",
                                }}
                            />
                            <div className="absolute inset-0 flex items-center justify-end pr-2">
                                <span className="text-xs font-medium text-white">
                                    ¥{item.totalProfit.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function ProfitPage() {
    const { lang: rawLang } = useParams<{ lang: string }>();
    const lang = rawLang === "ja" ? "ja" : "en";
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    const [userName, setUserName] = useState<string | null>(null);

    // Profit data state
    const [profitData, setProfitData] = useState<ProfitData[]>([]);
    const [profitSummary, setProfitSummary] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
        end: new Date().toISOString().split('T')[0],
    });

    // Analytics tracking
    const { trackFeatureUsage } = useAnalytics();

    // Check authentication
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const response = await fetch('/api/admin/check-access', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ uid: user.uid, email: user.email }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        setIsAuthenticated(data.hasAccess);
                        setUserRole(data.role);
                        setUserPermissions(data.permissions || []);
                        setUserName(data.name);
                    } else {
                        setIsAuthenticated(false);
                    }
                } catch (error) {
                    console.error('Error checking admin access:', error);
                    setIsAuthenticated(false);
                }
            } else {
                setIsAuthenticated(false);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Load profit data
    const loadProfitData = async () => {
        if (!userPermissions.includes('analytics.view')) return;

        setLoading(true);
        try {
            const startDate = new Date(dateRange.start);
            const endDate = new Date(dateRange.end);

            const [profit, summary] = await Promise.all([
                calculateProfitData(startDate, endDate, groupBy),
                getProfitSummary(startDate, endDate),
            ]);

            setProfitData(profit);
            setProfitSummary(summary);

            trackFeatureUsage('view_profit_dashboard');
        } catch (error) {
            console.error('Error loading profit data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Load data when authenticated and permissions allow
    useEffect(() => {
        if (isAuthenticated && userPermissions.includes('analytics.view')) {
            loadProfitData();
        }
    }, [isAuthenticated, userPermissions, dateRange, groupBy]);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (!isAuthenticated || !userPermissions.includes('analytics.view')) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
                    <p className="text-gray-600 mb-4">You don&apos;t have permission to access this page.</p>
                    <Link href={`/${lang}/admin/login`} className="text-blue-600 hover:text-blue-800">
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center space-x-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Profit Management</h1>
                                {userName && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        Welcome back, {userName} ({userRole?.replace('_', ' ')})
                                    </p>
                                )}
                            </div>
                            <div className="flex space-x-2">
                                <Link
                                    href={`/${lang}/admin/products`}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                                >
                                    📦 Products
                                </Link>
                                <Link
                                    href={`/${lang}/admin/purchases`}
                                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm"
                                >
                                    🛒 Purchases
                                </Link>
                                <Link
                                    href={`/${lang}/admin/analytics`}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                                >
                                    📊 Analytics
                                </Link>
                                <Link
                                    href={`/${lang}/admin/users`}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                                >
                                    👥 Users
                                </Link>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link href={`/${lang}`} className="text-gray-600 hover:text-gray-900 text-sm">
                                Back to Site
                            </Link>
                            <button
                                onClick={handleSignOut}
                                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Controls */}
                <div className="bg-white p-6 rounded-lg shadow mb-8">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                className="border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
                            <select
                                value={groupBy}
                                onChange={(e) => setGroupBy(e.target.value as 'day' | 'week' | 'month')}
                                className="border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="day">Day</option>
                                <option value="week">Week</option>
                                <option value="month">Month</option>
                            </select>
                        </div>
                        <button
                            onClick={loadProfitData}
                            disabled={loading}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Loading...' : 'Refresh'}
                        </button>
                    </div>
                </div>

                {/* Profit Summary Cards */}
                {profitSummary && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
                            <p className="text-2xl font-bold text-green-600">¥{profitSummary.totalRevenue.toLocaleString()}</p>
                            <p className="text-sm text-gray-600">Customer payments</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Total Cost</h3>
                            <p className="text-2xl font-bold text-red-600">¥{profitSummary.totalCost.toLocaleString()}</p>
                            <p className="text-sm text-gray-600">Original product costs</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Total Profit</h3>
                            <p className="text-2xl font-bold text-blue-600">¥{profitSummary.totalProfit.toLocaleString()}</p>
                            <p className="text-sm text-gray-600">Revenue - Cost</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Profit Margin</h3>
                            <p className="text-2xl font-bold text-purple-600">{profitSummary.profitMargin.toFixed(1)}%</p>
                            <p className="text-sm text-gray-600">Profit / Revenue</p>
                        </div>
                    </div>
                )}

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Revenue vs Cost Chart */}
                    {profitData.length > 0 && (
                        <BarChart
                            data={[
                                { name: 'Revenue', value: profitSummary?.totalRevenue || 0 },
                                { name: 'Cost', value: profitSummary?.totalCost || 0 },
                                { name: 'Profit', value: profitSummary?.totalProfit || 0 },
                            ]}
                            title="Revenue vs Cost vs Profit"
                            color="#3B82F6"
                        />
                    )}

                    {/* Average Order Value Chart */}
                    {profitData.length > 0 && (
                        <BarChart
                            data={[
                                { name: 'Avg Order Value', value: profitSummary?.averageOrderValue || 0 },
                                { name: 'Total Orders', value: profitSummary?.totalOrders || 0 },
                            ]}
                            title="Order Metrics"
                            color="#10B981"
                        />
                    )}
                </div>

                {/* Profit Trend Chart */}
                <div className="mb-8">
                    <LineChart
                        data={profitData}
                        title={`Profit Trend (${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}ly)`}
                    />
                </div>

                {/* Detailed Profit Data Table */}
                {profitData.length > 0 && (
                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold">Detailed Profit Data</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Revenue
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Cost
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Profit
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Orders
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Avg Order
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {profitData.map((data, index) => (
                                        <tr key={index}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(data.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                                                ¥{data.totalRevenue.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                                                ¥{data.totalCost.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <span className={data.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                    ¥{data.totalProfit.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {data.orderCount}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                ¥{data.averageOrderValue.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {profitData.length === 0 && !loading && (
                    <div className="text-center py-8 text-gray-500">
                        No profit data available for the selected date range.
                    </div>
                )}
            </div>
        </div>
    );
}
