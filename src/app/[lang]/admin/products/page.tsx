"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { Product } from "@/app/_data/products";
import type { OrderData } from "@/lib/db/scraped-products";

interface ProductsResponse {
    products: Product[];
    count: number;
}

interface OrdersResponse {
    orders: OrderData[];
    count: number;
}

export default function ProductsAdminPage() {
    const { lang: rawLang } = useParams<{ lang: string }>();
    const lang = rawLang === "ja" ? "ja" : "en";
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    const [userName, setUserName] = useState<string | null>(null);

    // Products state
    const [products, setProducts] = useState<Product[]>([]);
    const [productsLoading, setProductsLoading] = useState(false);

    // Orders state
    const [orders, setOrders] = useState<OrderData[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);

    // Check authentication on mount
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Check if user has admin privileges
                try {
                    const response = await fetch('/api/admin/check-access', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ uid: user.uid }),
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

    // Load products
    const loadProducts = async () => {
        setProductsLoading(true);
        try {
            const response = await fetch('/api/products/db?action=list&limit=100');
            if (response.ok) {
                const data: ProductsResponse = await response.json();
                setProducts(data.products);
            }
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setProductsLoading(false);
        }
    };

    // Load orders
    const loadOrders = async () => {
        setOrdersLoading(true);
        try {
            const response = await fetch('/api/admin/orders');
            if (response.ok) {
                const data: OrdersResponse = await response.json();
                setOrders(data.orders);
            }
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setOrdersLoading(false);
        }
    };

    // Load data when tab changes or component mounts
    useEffect(() => {
        if (isAuthenticated) {
            if (activeTab === 'products') {
                loadProducts();
            } else {
                loadOrders();
            }
        }
    }, [activeTab, isAuthenticated]);

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

    if (!isAuthenticated) {
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
                        <div className="flex items-center">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                                {userName && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        Welcome back, {userName} ({userRole?.replace('_', ' ')})
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link href={`/${lang}`} className="text-gray-600 hover:text-gray-900">
                                Back to Site
                            </Link>
                            {userPermissions.includes('manage_orders') && (
                                <Link href={`/${lang}/admin/purchases`} className="text-gray-600 hover:text-gray-900">
                                    Purchase Management
                                </Link>
                            )}
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
                {/* Tabs */}
                <div className="mb-8">
                    <nav className="flex space-x-8">
                        {userPermissions.includes('view_products') && (
                            <button
                                onClick={() => setActiveTab('products')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === 'products'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Products ({products.length})
                            </button>
                        )}
                        {userPermissions.includes('view_orders') && (
                            <button
                                onClick={() => setActiveTab('orders')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === 'orders'
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Orders ({orders.length})
                            </button>
                        )}
                    </nav>
                </div>

                {/* Products Tab */}
                {activeTab === 'products' && userPermissions.includes('view_products') && (
                    <div>
                        <div className="bg-white shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                    Product Information Management
                                </h3>
                                <p className="text-sm text-gray-600 mb-6">
                                    Display a list of currently listed products
                                </p>

                                {productsLoading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Product
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Price
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Brand
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Source
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {products.map((product) => (
                                                <tr key={product.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="h-10 w-10 flex-shrink-0 relative">
                                                                <Image
                                                                    className="rounded-full object-cover"
                                                                    src={product.imageUrl || "/placeholder.jpg"}
                                                                    alt={product.title}
                                                                    fill
                                                                    sizes="40px"
                                                                />
                                                            </div>
                                                            <div className="ml-4">
                                                                    <div className="text-sm font-medium text-gray-900">
                                                                        {product.title}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                            ${product.price.toFixed(2)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {product.brand}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                                product.availability === 'in'
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-red-100 text-red-800'
                                                            }`}>
                                                                {product.availability === 'in' ? 'In Stock' : 'Out of Stock'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {product.sourceUrl?.includes('scraped') ? 'Scraped' : 'Manual'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {products.length === 0 && !productsLoading && (
                                    <div className="text-center py-8 text-gray-500">
                                        No products found
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Orders Tab */}
                {activeTab === 'orders' && userPermissions.includes('view_orders') && (
                    <div>
                        <div className="bg-white shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                    Customer Orders
                                </h3>
                                <p className="text-sm text-gray-600 mb-6">
                                    List of past users who have made purchases
                                </p>

                                {ordersLoading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Customer
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Order Details
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Payment Status
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Order Status
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Date
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {orders.map((order) => (
                                                    <tr key={order.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {order.firstName} {order.lastName}
                                                            </div>
                                                            <div className="text-sm text-gray-500">{order.email}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm text-gray-900">
                                                                {order.items?.length || 0} items
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                ${order.total?.toFixed(2)}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                                order.paymentStatus === 'captured'
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : order.paymentStatus === 'authorized'
                                                                    ? 'bg-yellow-100 text-yellow-800'
                                                                    : 'bg-red-100 text-red-800'
                                                            }`}>
                                                                {order.paymentStatus || 'pending'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                                order.orderStatus === 'delivered'
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : order.orderStatus === 'shipped'
                                                                    ? 'bg-blue-100 text-blue-800'
                                                                    : order.orderStatus === 'confirmed'
                                                                    ? 'bg-yellow-100 text-yellow-800'
                                                                    : 'bg-gray-100 text-gray-800'
                                                            }`}>
                                                                {order.orderStatus || 'pending'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {orders.length === 0 && !ordersLoading && (
                                    <div className="text-center py-8 text-gray-500">
                                        No orders found
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
