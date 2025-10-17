"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { OrderData } from "@/lib/db/scraped-products";

interface OrdersResponse {
    orders: OrderData[];
    count: number;
}

export default function PurchasesAdminPage() {
    const { lang: rawLang } = useParams<{ lang: string }>();
    const lang = rawLang === "ja" ? "ja" : "en";
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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

    // Load data when component mounts
    useEffect(() => {
        if (isAuthenticated) {
            loadOrders();
        }
    }, [isAuthenticated]);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'delivered':
                return 'bg-green-100 text-green-800';
            case 'shipped':
                return 'bg-blue-100 text-blue-800';
            case 'confirmed':
                return 'bg-yellow-100 text-yellow-800';
            case 'processing':
                return 'bg-orange-100 text-orange-800';
            case 'pending':
                return 'bg-gray-100 text-gray-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString: string | Date) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
                            <h1 className="text-3xl font-bold text-gray-900">Purchase Management</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link href={`/${lang}`} className="text-gray-600 hover:text-gray-900">
                                Back to Site
                            </Link>
                            <Link href={`/${lang}/admin/products`} className="text-gray-600 hover:text-gray-900">
                                Admin Dashboard
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
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                            Purchase Details & Status Tracking
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Display purchase details including customer information, products, and status tracking
                        </p>

                        {ordersLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orders.map((order) => (
                                    <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="text-lg font-semibold text-gray-900">
                                                    Order #{order.id?.slice(-8) || 'Unknown'}
                                                </h4>
                                                <p className="text-sm text-gray-600">
                                                    {order.firstName} {order.lastName} • {order.email}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(order.orderStatus)}`}>
                                                    {order.orderStatus?.toUpperCase() || 'PENDING'}
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    ${order.total?.toFixed(2)} • {formatDate(order.createdAt)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Customer Details */}
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                            <h5 className="font-semibold text-blue-900 mb-2">👤 Customer Information</h5>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="font-medium">Name:</span> {order.firstName} {order.lastName}
                                                </div>
                                                <div>
                                                    <span className="font-medium">Email:</span> {order.email}
                                                </div>
                                                <div>
                                                    <span className="font-medium">Phone:</span> {order.phone || 'N/A'}
                                                </div>
                                                <div>
                                                    <span className="font-medium">Newsletter:</span> {order.newsletterOptIn ? '✅ Subscribed' : '❌ Not subscribed'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Delivery Details */}
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                                            <h5 className="font-semibold text-green-900 mb-2">📦 Delivery Information</h5>
                                            <div className="text-sm">
                                                <div><span className="font-medium">Address:</span> {order.address}, {order.city}, {order.state} {order.zipCode}</div>
                                                {order.trackingNumber && (
                                                    <div className="mt-2">
                                                        <span className="font-medium">Tracking:</span> {order.trackingNumber}
                                                        {order.shippingCarrier && <span> via {order.shippingCarrier}</span>}
                                                    </div>
                                                )}
                                                {order.shippedAt && (
                                                    <div className="mt-2">
                                                        <span className="font-medium">Shipped:</span> {formatDate(order.shippedAt)}
                                                    </div>
                                                )}
                                                {order.deliveredAt && (
                                                    <div className="mt-2">
                                                        <span className="font-medium">Delivered:</span> {formatDate(order.deliveredAt)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Products */}
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                                            <h5 className="font-semibold text-gray-900 mb-2">🛍️ Products ({order.items?.length || 0} items)</h5>
                                            <div className="space-y-2">
                                                {order.items?.map((item, index) => (
                                                    <div key={index} className="flex items-center gap-3 p-2 bg-white rounded border">
                                                        <div className="w-12 h-12 relative flex-shrink-0">
                                                            <Image
                                                                src={item.imageUrl || "/placeholder.jpg"}
                                                                alt={item.title}
                                                                className="object-cover rounded"
                                                                fill
                                                                sizes="48px"
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="font-medium text-sm">{item.title}</div>
                                                            <div className="text-xs text-gray-600">
                                                                From: {item.sourceUrl?.includes('scraped') ? 'Scraped Site' : 'Manual Entry'}
                                                            </div>
                                                        </div>
                                                        <div className="text-right text-sm">
                                                            <div className="font-medium">${item.price.toFixed(2)}</div>
                                                            <div className="text-gray-600">Qty: {item.quantity}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-3 pt-3 border-t text-right">
                                                <div className="text-sm">
                                                    <span className="font-medium">Subtotal:</span> ${order.subtotal?.toFixed(2)}
                                                    {order.shippingFee && (
                                                        <span className="ml-4">
                                                            <span className="font-medium">Shipping:</span> ${order.shippingFee.toFixed(2)}
                                                        </span>
                                                    )}
                                                    <span className="ml-4 font-semibold">
                                                        Total: ${order.total?.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Payment Status */}
                                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                            <h5 className="font-semibold text-purple-900 mb-2">💳 Payment Information</h5>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <span className="font-medium">Payment ID:</span> {order.paymentIntentId}
                                                </div>
                                                <div>
                                                    <span className="font-medium">Payment Status:</span>
                                                    <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.paymentStatus)}`}>
                                                        {order.paymentStatus?.toUpperCase() || 'PENDING'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="font-medium">Authorized:</span> ${order.authorizedAmount?.toFixed(2) || '0.00'}
                                                    {order.capturedAmount && (
                                                        <span className="ml-2">
                                                            <span className="font-medium">Captured:</span> ${order.capturedAmount.toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                                            {order.orderStatus === 'confirmed' && (
                                                <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
                                                    Mark as Processing
                                                </button>
                                            )}
                                            {order.orderStatus === 'processing' && (
                                                <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700">
                                                    Mark as Shipped
                                                </button>
                                            )}
                                            {order.paymentStatus === 'authorized' && order.orderStatus === 'shipped' && (
                                                <button className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700">
                                                    Capture Payment
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {orders.length === 0 && !ordersLoading && (
                            <div className="text-center py-8 text-gray-500">
                                No purchases found
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

