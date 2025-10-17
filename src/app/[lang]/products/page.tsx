"use client";

import Link from "next/link";
import Image from "next/image";
import { products as hardcodedProducts, brands, types, Product, getProductsPage } from "@/app/_data/products";
import { useMemo, useState, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

interface PopularProduct {
    productId: string;
    title: string;
    purchaseCount: number;
    totalQuantity: number;
    totalRevenue: number;
    imageUrl?: string;
    sourceUrl?: string;
}

const mockProducts: Product[] = hardcodedProducts;

export default function ProductsPage() {
    const t = useTranslations();
    const tHome = useTranslations("home");
    // Resolve lang param (server-provided in app router)
    // We don't need translations for filters UI in this demo
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const lang = (pathname || "/").split("/").filter(Boolean)[0] === "ja" ? "ja" : "en";

    // State for dynamic products
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [nextCursor, setNextCursor] = useState<{ ts: number; id: string } | null>(null);
    const [isBootstrapping, setIsBootstrapping] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // State for popular products
    const [popularProducts, setPopularProducts] = useState<PopularProduct[]>([]);

    // Fetch popular products
    const fetchPopularProducts = async () => {
        try {
            const response = await fetch('/api/products/popular');
            if (response.ok) {
                const data = await response.json();
                setPopularProducts(data.products);
            }
        } catch (error) {
            console.error('Error fetching popular products:', error);
        }
    };

    // Pass the current language to API requests
    useEffect(() => {
        // Set the document language for API requests
        if (typeof document !== 'undefined') {
            document.documentElement.lang = lang;
        }
    }, [lang]);

    // Fetch scraped products on component mount
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                console.log('🔄 Fetching products from Firebase...');
                // Immediately show mock items to avoid blank page while fetching
                if (allProducts.length === 0) {
                    setAllProducts(mockProducts);
                }
                // Fetch first page from API (fast, limited)
                const { products, nextCursor } = await getProductsPage(48);
                console.log('🎯 Products received in component:', products.length);
                console.log('🎯 First product:', products[0]);
                console.log('🎯 Sample product IDs:', products.slice(0, 5).map(p => p.id));

                // Also fetch popular products
                await fetchPopularProducts();
                
                // Check for duplicate IDs and deduplicate
                const ids = products.map(p => p.id);
                const uniqueIds = new Set(ids);
                if (ids.length !== uniqueIds.size) {
                    console.warn('⚠️ Warning: Duplicate product IDs found! Deduplicating...');
                    // Keep only unique products (last occurrence wins)
                    const uniqueProducts = Array.from(
                        products.reduce((map, product) => {
                            map.set(product.id, product);
                            return map;
                        }, new Map<string, Product>()).values()
                    );
                    console.log(`✅ Deduplicated: ${products.length} -> ${uniqueProducts.length} products`);
                    setAllProducts(uniqueProducts);
                } else {
                    setAllProducts(products);
                }
                setNextCursor(nextCursor);
            } catch (error) {
                console.error('❌ Error fetching products:', error);
                // Keep using hardcoded products as fallback
                setAllProducts(mockProducts);
            } finally {
                setIsBootstrapping(false);
            }
        };

        fetchProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function loadMore() {
        if (!nextCursor) return;
        setIsLoadingMore(true);
        try {
            const { products, nextCursor: nc } = await getProductsPage(48, nextCursor);
            // Deduplicate by id when appending
            const merged = new Map<string, Product>();
            [...allProducts, ...products].forEach(p => merged.set(p.id, p));
            setAllProducts(Array.from(merged.values()));
            setNextCursor(nc);
        } catch (e) {
            console.error('Load more failed', e);
        } finally {
            setIsLoadingMore(false);
        }
    }

    // Calculate display price with 20% markup on scraped products
    const getDisplayPrice = (product: Product) => {
        // For scraped products, add 20% markup to the scraped price
        if (product.sourceUrl && product.sourceUrl.includes('scraped')) {
            const scrapedPrice = product.price;
            const markupAmount = scrapedPrice * 0.2;
            return scrapedPrice + markupAmount;
        }
        return product.price;
    };

    const formatPrice = (amount: number) =>
        new Intl.NumberFormat(lang === "ja" ? "ja-JP" : "en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 2
        }).format(amount);
    
    // Translate product name (Product N -> 商品 N in Japanese)
    const translateProductName = (title: string) => {
        const match = title.match(/^Product (\d+)$/);
        if (match && lang === "ja") {
            return `${tHome("product")} ${match[1]}`;
        }
        return title;
    };

    // Helpers for URL state
    function getMulti(name: string): string[] {
        const value = searchParams.get(name);
        if (!value) return [];
        return value.split(",").filter(Boolean);
    }

    function setParam(name: string, values: string[] | string | null) {
        const sp = new URLSearchParams(searchParams.toString());
        if (values === null || (Array.isArray(values) && values.length === 0) || values === "") {
            sp.delete(name);
        } else if (Array.isArray(values)) {
            sp.set(name, values.join(","));
        } else {
            sp.set(name, values);
        }
        router.replace(`${pathname}?${sp.toString()}`);
    }

    function toggleInMulti(name: string, value: string) {
        const current = new Set(getMulti(name));
        if (current.has(value)) current.delete(value); else current.add(value);
        setParam(name, Array.from(current));
    }

    function removeFromMulti(name: string, value: string) {
        const current = new Set(getMulti(name));
        if (current.has(value)) {
            current.delete(value);
            setParam(name, Array.from(current));
        }
    }

    function chipClass(kind: "avail" | "brand" | "type" | "price") {
        switch (kind) {
            case "avail":
                return "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100";
            case "brand":
                return "bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100";
            case "type":
                return "bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100";
            case "price":
                return "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100";
            default:
                return "";
        }
    }

    const priceMin = Number(searchParams.get("min")) || 0;
    const priceMax = Number(searchParams.get("max")) || 999999; // Increased to show all products
    const sortParam = searchParams.get("sort") || "best"; // best | price-asc | price-desc | alpha-asc | alpha-desc | date-asc | date-desc
    const selectedAvailability = new Set(getMulti("avail"));
    const selectedBrands = new Set(getMulti("brand"));
    const selectedTypes = new Set(getMulti("type"));
    const query = (searchParams.get("q") || "").toLowerCase();

    const filtered = useMemo(() => {
        const base = allProducts.filter((p) => {
            if (query && !p.title.toLowerCase().includes(query)) return false;
            if (p.price < priceMin || p.price > priceMax) return false;
            if (selectedAvailability.size > 0 && !selectedAvailability.has(p.availability)) return false;
            if (selectedBrands.size > 0 && !selectedBrands.has(p.brand)) return false;
            if (selectedTypes.size > 0 && !selectedTypes.has(p.type)) return false;
            return true;
        });
        const list = [...base];
        switch (sortParam) {
            case "price-asc":
                list.sort((a, b) => a.price - b.price); break;
            case "price-desc":
                list.sort((a, b) => b.price - a.price); break;
            case "alpha-asc":
                list.sort((a, b) => a.title.localeCompare(b.title)); break;
            case "alpha-desc":
                list.sort((a, b) => b.title.localeCompare(a.title)); break;
            // date-based not applicable on mock data; fall through to default
            default:
                break;
        }
        return list;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, allProducts]);

    const [quickView, setQuickView] = useState<Product | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const loadingGateRef = useRef<number>(0); // simple debounce gate

    // Translation is now handled by pattern matching only
    // API translation is disabled due to reliability issues

	return (
        <section className="w-full px-6 lg:px-10 py-8">
            {/* Big page title */}
            <div className="w-full py-6">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center">{t("products.title")}</h1>
                {/* Translation status indicator */}
                <div className="flex justify-center mt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-full">
                        <span>Translation:</span>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Pattern-Based
                        </span>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Sidebar filters */}
                <aside className="lg:col-span-3 order-2 lg:order-1">
                    <div className="sticky top-28 lg:top-32 max-h-[calc(100vh-9rem)] overflow-auto pr-2 space-y-6 text-[15px]">
                    {/* Availability */}
                    <div>
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-semibold">{t("products.filters.availability")}</h2>
                        </div>
                        <div className="mt-3 space-y-2 text-base">
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={selectedAvailability.has("in")} onChange={() => toggleInMulti("avail", "in")} />
                                <span>{t("products.filters.inStock")}</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={selectedAvailability.has("out")} onChange={() => toggleInMulti("avail", "out")} />
                                <span>{t("products.filters.outOfStock")}</span>
                            </label>
                        </div>
                    </div>

                    {/* Price */}
                    <div>
                        <h2 className="text-base font-semibold">{t("products.filters.price")}</h2>
                        <div className="mt-3 flex items-center gap-3 text-base">
                            <div className="flex items-center gap-2">
                                <span>$</span>
                                <input
                                    type="number"
                                    className="w-20 rounded-md border px-2 py-1"
                                    value={priceMin}
                                    onChange={(e) => setParam("min", e.target.value)}
                                />
                            </div>
                            <span className="text-gray-400">{t("products.filters.to")}</span>
                            <div className="flex items-center gap-2">
                                <span>$</span>
                                <input
                                    type="number"
                                    className="w-20 rounded-md border px-2 py-1"
                                    value={priceMax === 9999 ? "" : priceMax}
                                    placeholder={t("products.filters.max")}
                                    onChange={(e) => setParam("max", e.target.value || null)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Brand */}
                    <div>
                        <h2 className="text-base font-semibold">{t("products.filters.brand")}</h2>
                        <div className="mt-3 max-h-56 overflow-auto pr-1 space-y-2 text-base">
                            {brands.map((b) => (
                                <label key={`brand-${b}`} className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedBrands.has(b)}
                                        onChange={() => toggleInMulti("brand", b)}
                                    />
                                    <span>{b}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Product type */}
                    <div>
                        <h2 className="text-base font-semibold">{t("products.filters.productType")}</h2>
                        <div className="mt-3 space-y-2 text-base">
                            {types.map((type) => (
                                <label key={`type-${type}`} className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedTypes.has(type)}
                                        onChange={() => toggleInMulti("type", type)}
                                    />
                                    <span>{type}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Extra filters to match reference richness */}
                    <div>
                        <h2 className="text-base font-semibold">{t("products.filters.region")}</h2>
                        <div className="mt-3 space-y-2 text-base">
                            {['Japan','Korea','Taiwan'].map((c) => (
                                <label key={`region-${c}`} className="flex items-center gap-2 opacity-60 cursor-not-allowed">
                                    <input type="checkbox" disabled />
                                    <span>{c}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h2 className="text-base font-semibold">{t("products.filters.availability")}</h2>
                        <div className="mt-3 space-y-2 text-base">
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={selectedAvailability.has("in")} onChange={() => toggleInMulti("avail", "in")} />
                                <span>{t("products.filters.inStock")}</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" checked={selectedAvailability.has("out")} onChange={() => toggleInMulti("avail", "out")} />
                                <span>{t("products.filters.outOfStock")}</span>
                            </label>
                        </div>
                    </div>
                    </div>
                </aside>

                {/* Popular Products Section */}
                {popularProducts.length > 0 && (
                    <div className="lg:col-span-9 mb-8 order-1 lg:order-2">
                        <div className="bg-gradient-to-r from-orange-50 to-pink-50 border border-orange-200 rounded-lg p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                🔥 Popular Products
                                <span className="text-sm font-normal text-gray-600">({popularProducts.length} most purchased)</span>
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                {popularProducts.slice(0, 8).map((product, idx) => (
                                    <Link key={`popular-${product.productId}-${idx}`} href={`${pathname}/${product.productId}`} className="group block">
                                        <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-white group-hover:shadow-md group-hover:-translate-y-0.5 transition-transform">
                                            <Image
                                                src={product.imageUrl || "/placeholder.jpg"}
                                                alt={product.title}
                                                className="object-cover"
                                                fill
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            />
                                            <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                                #{idx + 1}
                                            </div>
                                        </div>
                                        <div className="mt-2 text-sm">
                                            <div className="font-medium text-gray-900 truncate">{product.title}</div>
                                            <div className="text-gray-600">
                                                Bought {product.purchaseCount} times
                                            </div>
                                            <div className="text-green-600 font-semibold">
                                                ${product.totalRevenue.toFixed(2)} earned
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            {popularProducts.length > 8 && (
                                <div className="mt-4 text-center">
                                    <Link href={`${pathname}?sort=popular`} className="text-orange-600 hover:text-orange-700 font-medium">
                                        View all popular products →
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Products grid */}
                <div className="lg:col-span-9 order-2 lg:order-3">
                    {/* Active filter chips above product grid */}
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        {Array.from(selectedAvailability).map((v) => (
                            <button key={`avail-${v}`} onClick={() => removeFromMulti("avail", v)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${chipClass("avail")}`}>
                                <span>{v === "in" ? t("products.filters.inStock") : t("products.filters.outOfStock")}</span>
                                <span className="rounded-full bg-white/60 p-0.5" aria-hidden>×</span>
                            </button>
                        ))}
                        {Array.from(selectedBrands).map((b) => (
                            <button key={`brand-${b}`} onClick={() => removeFromMulti("brand", b)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${chipClass("brand")}`}>
                                <span>{b}</span>
                                <span className="rounded-full bg-white/60 p-0.5" aria-hidden>×</span>
                            </button>
                        ))}
                        {Array.from(selectedTypes).map((t) => (
                            <button key={`type-${t}`} onClick={() => removeFromMulti("type", t)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${chipClass("type")}`}>
                                <span>{t}</span>
                                <span className="rounded-full bg-white/60 p-0.5" aria-hidden>×</span>
                            </button>
                        ))}
                        {(priceMin > 0 || priceMax < 999999) && (
                            <button onClick={() => { setParam("min", null); setParam("max", null); }} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${chipClass("price")}`}>
                                <span>${priceMin} – {priceMax === 999999 ? "∞" : `$${priceMax}`}</span>
                                <span className="rounded-full bg-white/60 p-0.5" aria-hidden>×</span>
                            </button>
                        )}
                    </div>
                        <div className="mb-4 flex items-center justify-between">
                        <div className="text-sm text-gray-600">{t("products.count", { count: filtered.length })}</div>
                        <label className="flex items-center gap-2 text-sm">
                            <span className="text-gray-600">{t("products.sortBy")}</span>
                            <select
                                className="rounded-md border px-2 py-1"
                                value={sortParam}
                                onChange={(e) => setParam("sort", e.target.value)}
                            >
                                <option value="best">{t("products.sort.best")}</option>
                                <option value="alpha-asc">{t("products.sort.alphaAsc")}</option>
                                <option value="alpha-desc">{t("products.sort.alphaDesc")}</option>
                                <option value="price-asc">{t("products.sort.priceAsc")}</option>
                                <option value="price-desc">{t("products.sort.priceDesc")}</option>
                            </select>
                        </label>
                    </div>
                    
                    {/* Initial loading indicator (kept small; mock products are shown meanwhile) */}
                    {isBootstrapping && allProducts.length === 0 && (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center">
                                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                                <p className="mt-2 text-sm text-gray-600">Loading products from Firebase...</p>
                            </div>
                        </div>
                    )}
                    
                    {/* Product grid stays visible; on load-more we show a small inline loader below */}
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                        {filtered.map((p, idx) => (
                            // Use a robust composite key to avoid duplicate key warnings if backend returns duplicate or missing IDs
                            <Link key={`${p.id || p.sourceUrl || 'item'}-${idx}`} href={`${pathname}/${p.id}`} className="group block">
                                <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-gradient-to-br from-pink-50 to-blue-50 group-hover:shadow-md group-hover:-translate-y-0.5 transition-transform">
                                    {/* Quick view button */}
                                    <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); setQuickView(p); }}
                                        className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition"
                                        aria-label="Quick view"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M21.75 12c0-1.6-3.9-6.75-9.75-6.75S2.25 10.4 2.25 12c0 1.6 3.9 6.75 9.75 6.75S21.75 13.6 21.75 12Zm-6.5 0a3.25 3.25 0 1 1-6.5 0 3.25 3.25 0 0 1 6.5 0Z" clipRule="evenodd"/></svg>
                                    </button>
                                    {/* Labels */}
                                    <div className="absolute left-2 top-2 flex flex-col gap-1">
                                        {p.compareAt && (
                                            <div className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                                                -{Math.round(((p.compareAt - p.price) / p.compareAt) * 100)}%
                                            </div>
                                        )}
                                        {p.labels?.map((label, index) => (
                                            <div
                                                key={`${p.id}-label-${label}-${index}`}
                                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm ${
                                                    label === 'Sold' ? 'bg-gray-600' :
                                                    label === 'Used' ? 'bg-orange-500' :
                                                    'bg-blue-500'
                                                }`}
                                            >
                                                {label}
                                            </div>
                                        ))}
                                        {p.isSoldOut && (
                                            <div className="rounded-full bg-gray-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                                                Sold
                                            </div>
                                        )}
                                    </div>
                                    {/* Base image */}
                                    <Image
                                        src={p.imageUrl || "/placeholder.jpg"}
                                        alt={p.title}
                                        width={600}
                                        height={450}
                                        className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
                                        priority={idx < 4}
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = "/placeholder.jpg";
                                        }}
                                    />
                                    {/* Hover image (crossfade) */}
                                    <Image
                                        src={p.imageUrl || "/placeholder_alt.jpg"}
                                        alt={`${p.title} alt`}
                                        width={600}
                                        height={450}
                                        className="absolute inset-0 h-full w-full object-cover object-center opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 pointer-events-none"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = "/placeholder_alt.jpg";
                                        }}
                                    />
                                </div>
                                <div className="mt-2 text-sm leading-tight">
                                    <div className="font-medium group-hover:underline">{translateProductName(p.title)}</div>
                                    <div className="mt-0.5 flex items-center gap-2">
                                        <span className={`${p.compareAt ? "text-rose-600 font-semibold" : "text-black font-semibold"}`}>
                                            {formatPrice(getDisplayPrice(p))}
                                            {p.sourceUrl && p.sourceUrl.includes('scraped') && (
                                                <span className="ml-1 text-xs text-gray-500">
                                                    (+20% markup)
                                                </span>
                                            )}
                                        </span>
                                        {p.compareAt && (
                                            <span className="text-xs text-black line-through">{formatPrice(p.compareAt)}</span>
                                        )}
                                    </div>
                                </div>
						</Link>
				))}
                    </div>
                        {nextCursor && (
                        <div className="mt-6 flex justify-center">
                            <button
                                className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                                onClick={loadMore}
                                disabled={isLoadingMore}
                            >
                                {isLoadingMore ? 'Loading…' : 'Load more'}
                            </button>
                        </div>
                    )}
                        {/* Sentinel for auto-load */}
                        <div ref={sentinelRef} className="h-6" />
                    
                        {/* Auto-load with IntersectionObserver */}
                        {nextCursor && (
                            <AutoLoader
                                observeRef={sentinelRef}
                                isLoading={isLoadingMore}
                                onVisible={() => {
                                    const now = Date.now();
                                    // Debounce: at most once per 800ms
                                    if (now - loadingGateRef.current < 800) return;
                                    loadingGateRef.current = now;
                                    loadMore();
                                }}
                            />
                        )}
                </div>
			</div>

            {/* Quick View Drawer */}
            {quickView && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setQuickView(null)} />
                    <aside className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between border-b px-4 py-3">
                            <div className="text-lg font-semibold">{translateProductName(quickView.title)}</div>
                            <button className="rounded-full p-2 hover:bg-gray-100" onClick={() => setQuickView(null)} aria-label="Close">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"/></svg>
                            </button>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-4">
                            <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border bg-gray-50">
                                <Image
                                    src={quickView.imageUrl || "/placeholder.jpg"}
                                    alt={quickView.title}
                                    width={900}
                                    height={675}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = "/placeholder.jpg";
                                    }}
                                />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-lg">
                                    <span className="font-semibold text-rose-600">
                                        {formatPrice(getDisplayPrice(quickView))}
                                        {quickView.sourceUrl && quickView.sourceUrl.includes('scraped') && (
                                            <span className="ml-1 text-xs text-gray-500">
                                                (+20% markup)
                                            </span>
                                        )}
                                    </span>
                                    {quickView.compareAt && (
                                        <span className="text-sm text-gray-500 line-through">{formatPrice(quickView.compareAt)}</span>
                                    )}
                                </div>
                                <div className="mt-2 text-sm text-gray-600">{t("products.quick.inStock")}</div>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold mb-2">{t("products.quick.about")}</h3>
                                <p className="text-sm text-gray-700">{t("products.quick.aboutText")}</p>
                            </div>
                            <div className="pt-2">
                                <Link href={`${pathname}/${quickView.id}`} className="inline-flex items-center justify-center rounded-full bg-black px-4 py-2 text-sm font-medium text-white">{t("products.quick.viewDetails")}</Link>
                            </div>
                        </div>
                    </aside>
                </div>
            )}
		</section>
	);
}

// Lightweight helper to observe when a ref is visible and trigger a callback
function AutoLoader({
    observeRef,
    isLoading,
    onVisible,
}: {
    observeRef: React.RefObject<Element | null>;
    isLoading: boolean;
    onVisible: () => void;
}) {
    useEffect(() => {
        if (!observeRef.current) return;
        if (isLoading) return; // don't observe while loading
        const el = observeRef.current;
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    onVisible();
                }
            });
        }, { rootMargin: '200px 0px 400px 0px' });
        io.observe(el);
        return () => io.disconnect();
    }, [observeRef, isLoading, onVisible]);
    return null;
}
