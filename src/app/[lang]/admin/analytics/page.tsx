"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAnalytics } from "@/lib/hooks/useAnalytics";
import { getAnalyticsData } from "@/lib/db/analytics";
import { calculateProfitData, getProfitSummary, ProfitData } from "@/lib/db/profit";

// Note: These would normally be from recharts library
// We'll create simple chart components for now
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

// Simple chart components (would use recharts in production)
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

export default function AnalyticsPage() {
    const { lang: rawLang } = useParams<{ lang: string }>();
    const lang = rawLang === "ja" ? "ja" : "en";
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    const [userName, setUserName] = useState<string | null>(null);

    // Analytics state
    const [analyticsData, setAnalyticsData] = useState<any>(null);
    const [profitData, setProfitData] = useState<ProfitData[]>([]);
    const [profitSummary, setProfitSummary] = useState<any>(null);
    const [loading, setLoading] = useState(false);
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

    // Load analytics data
    const loadAnalyticsData = async () => {
        if (!userPermissions.includes('analytics.view')) return;

        setLoading(true);
        try {
            const startDate = new Date(dateRange.start);
            const endDate = new Date(dateRange.end);

            const [analytics, profit, summary] = await Promise.all([
                getAnalyticsData(startDate, endDate),
                calculateProfitData(startDate, endDate),
                getProfitSummary(startDate, endDate),
            ]);

            setAnalyticsData(analytics);
            setProfitData(profit);
            setProfitSummary(summary);

            trackFeatureUsage('view_analytics_dashboard');
        } catch (error) {
            console.error('Error loading analytics data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Load data when authenticated and permissions allow
    useEffect(() => {
        if (isAuthenticated && userPermissions.includes('analytics.view')) {
            loadAnalyticsData();
        }
    }, [isAuthenticated, userPermissions, dateRange]);

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
                                <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
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
                                    href={`/${lang}/admin/profit`}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                                >
                                    💰 Profit
                                </Link>
                            </div>
                        </div>
                        <div className="flex items-center">
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
                {/* Date Range Filter */}
                <div className="bg-white p-6 rounded-lg shadow mb-8">
                    <h2 className="text-lg font-semibold mb-4">Date Range</h2>
                    <div className="flex space-x-4">
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
                        <div className="flex items-end">
                            <button
                                onClick={loadAnalyticsData}
                                disabled={loading}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? 'Loading...' : 'Refresh'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Profit Summary Cards */}
                {profitSummary && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
                            <p className="text-2xl font-bold text-green-600">¥{profitSummary.totalRevenue.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Total Profit</h3>
                            <p className="text-2xl font-bold text-blue-600">¥{profitSummary.totalProfit.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Total Orders</h3>
                            <p className="text-2xl font-bold text-gray-900">{profitSummary.totalOrders}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-sm font-medium text-gray-500">Profit Margin</h3>
                            <p className="text-2xl font-bold text-purple-600">{profitSummary.profitMargin.toFixed(1)}%</p>
                        </div>
                    </div>
                )}

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Page Views Chart */}
                    {analyticsData?.pageViews && (
                        <BarChart
                            data={analyticsData.pageViews.map((pv: any) => ({
                                name: pv.page.split('/').pop() || 'unknown',
                                value: pv.count,
                            }))}
                            title="Page Views by Section"
                            color="#3B82F6"
                        />
                    )}

                    {/* Feature Usage Chart */}
                    {analyticsData?.featureUsage && (
                        <BarChart
                            data={analyticsData.featureUsage.map((fu: any) => ({
                                name: fu.feature.replace('_', ' '),
                                value: fu.count,
                            }))}
                            title="Feature Usage"
                            color="#10B981"
                        />
                    )}

                    {/* Profit Over Time Chart */}
                    <div className="lg:col-span-2">
                        <LineChart
                            data={profitData}
                            title="Profit Trend Over Time"
                        />
                    </div>
                </div>

                {/* User Activity Table */}
                {analyticsData?.userActivity && analyticsData.userActivity.length > 0 && (
                    <div className="mt-8 bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold">User Activity</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            User ID
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Role
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Events
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {analyticsData.userActivity.slice(0, 10).map((user: any, index: number) => (
                                        <tr key={index}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {user.userId.slice(0, 8)}...
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {user.userRole.replace('_', ' ')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {user.events}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
