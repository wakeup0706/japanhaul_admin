"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface Product {
    id: string;
    title: string;
    price: number;
    brand: string;
    availability: 'in' | 'out';
    imageUrl?: string;
    sourceUrl?: string;
}

export default function ProductsAdminPage() {
    const { lang: rawLang } = useParams<{ lang: string }>();
    const lang = rawLang === "ja" ? "ja" : "en";
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [lastCursor, setLastCursor] = useState<{ ts: number; id: string } | null>(null);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    // Check authentication on mount
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const response = await fetch('/api/admin/check-access', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ uid: user.uid, email: user.email }),
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

    // Load products
    useEffect(() => {
        if (isAuthenticated) {
            console.log('🔄 Initial load - resetting products and cursor');
            loadProducts(true); // Force reset for initial load
        }
    }, [isAuthenticated]);

    // Infinite scroll effect with throttling
    useEffect(() => {
        let scrollTimeout: NodeJS.Timeout;
        let isLoadingMore = false;

        const handleScroll = () => {
            // Clear existing timeout
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }

            // Set a small delay to prevent rapid-fire requests
            scrollTimeout = setTimeout(() => {
                const scrollTop = (document.documentElement && document.documentElement.scrollTop) || document.body.scrollTop;
                const scrollHeight = (document.documentElement && document.documentElement.scrollHeight) || document.body.scrollHeight;
                const clientHeight = document.documentElement.clientHeight || window.innerHeight;

                // Check if scrolled to within 100px of bottom
                const scrolledToBottom = Math.ceil(scrollTop + clientHeight) >= (scrollHeight - 100);

                if (scrolledToBottom && hasMore && !loadingMore && !isLoadingMore) {
                    isLoadingMore = true;
                    console.log('📜 Scroll detected, loading more products...');
                    loadMoreProducts().finally(() => {
                        isLoadingMore = false;
                    });
                }
            }, 200); // 200ms throttle
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
        };
    }, [hasMore, loadingMore]);

    const loadProducts = async (reset: boolean = false) => {
        if (reset) {
            setProductsLoading(true);
            setLastCursor(null);
            setHasMore(true);
            console.log('🔄 Loading products (RESET)');
        } else {
            setLoadingMore(true);
            console.log('🔄 Loading MORE products with cursor:', lastCursor);
        }

        try {
            const limit = 100;
            // Only add cursor params if we have a cursor AND we're not resetting
            const shouldUseCursor = lastCursor && !reset;
            const cursorParams = shouldUseCursor
                ? `&cursorTs=${lastCursor.ts}&cursorId=${lastCursor.id}`
                : '';

            console.log('📡 Fetching from API:', `/api/products/db?action=list&limit=${limit}${cursorParams}`, {
                hasCursor: !!lastCursor,
                reset,
                shouldUseCursor
            });

            const response = await fetch(`/api/products/db?action=list&limit=${limit}${cursorParams}`);

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Received', data.products?.length || 0, 'products from API');
                
                if (data.products && data.products.length > 0) {
                    console.log('📦 First product ID:', data.products[0].id, 'Last product ID:', data.products[data.products.length - 1].id);
                }

                // Handle API response with nextCursor (modern pagination)
                if (data.nextCursor) {
                    console.log('📍 API provided nextCursor:', data.nextCursor);
                    setLastCursor(data.nextCursor);
                    setHasMore(true);
                } else {
                    console.log('🏁 API indicates no more data');
                    setHasMore(false);
                    setLastCursor(null);
                }

                if (reset) {
                    // Remove duplicates by ID for initial load
                    const uniqueProducts = (data.products || []).filter((product: Product, index: number, self: Product[]) =>
                        index === self.findIndex((p) => p.id === product.id)
                    );
                    console.log('💾 Setting', uniqueProducts.length, 'unique products (reset)');
                    setProducts(uniqueProducts);
                } else {
                    // Merge with existing products and remove duplicates
                    const newProducts: Product[] = data.products || [];
                    setProducts(prev => {
                        const existingIds = new Set(prev.map(p => p.id));
                        const uniqueNewProducts = newProducts.filter(p => !existingIds.has(p.id));
                        console.log('🆕 Adding', uniqueNewProducts.length, 'new unique products');
                        return [...prev, ...uniqueNewProducts];
                    });
                }
            }
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setProductsLoading(false);
            setLoadingMore(false);
        }
    };

    const loadMoreProducts = async () => {
        if (hasMore && !loadingMore) {
            await loadProducts(false);
        }
    };

    const handleEditProduct = (product: Product) => {
        setEditingProduct(product);
        setShowEditModal(true);
    };

    const handleDeleteProduct = async (productId: string) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        
        try {
            const response = await fetch(`/api/admin/products/${productId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                loadProducts();
            }
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    };

    const handleSaveProduct = async () => {
        if (!editingProduct) return;

        try {
            const response = await fetch(`/api/admin/products/${editingProduct.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingProduct),
            });

            if (response.ok) {
                setShowEditModal(false);
                setEditingProduct(null);
                loadProducts();
            }
        } catch (error) {
            console.error('Error updating product:', error);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            window.location.href = `/${lang}/admin/login`;
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
                    <p className="text-gray-600 mb-6">
                        You do not have permission to access this page.
                    </p>
                    <Link
                        href={`/${lang}/admin/login`}
                        className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                    >
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="w-full px-2 sm:px-4 lg:px-6 py-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-2xl font-bold text-gray-900">Admin - Products</h1>
                            <div className="flex space-x-2">
                                <Link
                                    href={`/${lang}/admin/purchases`}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                                >
                                    📦 Purchases
                                </Link>
                                <Link
                                    href={`/${lang}/admin/profit`}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                                >
                                    💰 Profit
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
                        <button
                            onClick={handleLogout}
                            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <div className="w-full px-2 sm:px-4 lg:px-6 py-4">
                <div className="bg-white shadow rounded-lg">
                    <div className="px-3 py-4 sm:p-5">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Product Management ({products.length} items)
                        </h3>

                        {productsLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto w-full">
                                <table className="w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                📦 Product
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                💰 Price
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                🏷️ Brand
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                📊 Status
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                🔗 Source
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                ⚙️ Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {products.map((product, index) => (
                                            <tr key={`${product.id}-${index}`} className="hover:bg-gray-50">
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="h-10 w-10 flex-shrink-0 relative">
                                                            <Image
                                                                className="rounded-full object-cover"
                                                                src={product.imageUrl || "/placeholder.jpg"}
                                                                alt={product.title || "Product image"}
                                                                width={40}
                                                                height={40}
                                                            />
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">
                                                                {product.title}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                                    ¥{product.price.toLocaleString()}
                                                </td>
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                                                        {product.brand}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                        product.availability === 'in'
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-red-100 text-red-800'
                                                    }`}>
                                                        {product.availability === 'in' ? 'In Stock' : 'Out of Stock'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                        product.sourceUrl?.includes('scraped')
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {product.sourceUrl?.includes('scraped') ? 'Scraped' : 'Manual'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <button
                                                        onClick={() => handleEditProduct(product)}
                                                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteProduct(product.id)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Delete
                                                    </button>
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

                        {/* Loading indicator for infinite scroll */}
                        {loadingMore && (
                            <div className="flex justify-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                <span className="ml-2 text-sm text-gray-600">Loading more products...</span>
                            </div>
                        )}

                        {/* Load more button for manual loading */}
                        {!loadingMore && !productsLoading && hasMore && products.length > 0 && (
                            <div className="text-center py-4">
                                <button
                                    onClick={loadMoreProducts}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                                >
                                    Load More Products
                                </button>
                            </div>
                        )}

                        {/* End of results indicator */}
                        {!hasMore && products.length > 0 && (
                            <div className="text-center py-4 text-sm text-gray-500">
                                All products loaded ({products.length} total)
                            </div>
                        )}
                    </div>
                </div>

                {showEditModal && editingProduct && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Product</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Title</label>
                                    <input
                                        type="text"
                                        value={editingProduct.title}
                                        onChange={(e) => setEditingProduct({...editingProduct, title: e.target.value})}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Price</label>
                                    <input
                                        type="number"
                                        value={editingProduct.price}
                                        onChange={(e) => setEditingProduct({...editingProduct, price: parseInt(e.target.value)})}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Brand</label>
                                    <input
                                        type="text"
                                        value={editingProduct.brand}
                                        onChange={(e) => setEditingProduct({...editingProduct, brand: e.target.value})}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Status</label>
                                    <select
                                        value={editingProduct.availability}
                                        onChange={(e) => setEditingProduct({...editingProduct, availability: e.target.value as 'in' | 'out'})}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    >
                                        <option value="in">In Stock</option>
                                        <option value="out">Out of Stock</option>
                                    </select>
                                </div>
                                <div className="flex space-x-3 mt-6">
                                    <button
                                        onClick={handleSaveProduct}
                                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowEditModal(false);
                                            setEditingProduct(null);
                                        }}
                                        className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
