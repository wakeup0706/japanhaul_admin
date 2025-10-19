"use client";

import Link from "next/link";
import Image from "next/image";
import AddToCartButton from "./AddToCartButton";
import { use, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Product } from "@/app/_data/products";

type DBProduct = Product & {
    images?: string[];
    specs?: string[];
    shippingSchedule?: string;
    reservationEndDate?: string;
    preorderOpen?: boolean;
    singlePriceJpy?: number;
    boxPriceJpy?: number;
    taxIncluded?: boolean;
};

export default function ProductDetail({ params }: { params: Promise<{ lang: string; id: string }> }) {
    const t = useTranslations("productDetail");
    const [openBar, setOpenBar] = useState(false);
    const [qty, setQty] = useState(1);
    const { lang: routeLang, id } = use(params);
	const lang = routeLang === "ja" ? "ja" : "en";
    const [product, setProduct] = useState<DBProduct | null>(null);
    const [loading, setLoading] = useState(true);
    const [related, setRelated] = useState<Array<{ id: string; docId?: string; title: string; imageUrl?: string; sourceUrl: string; priceJpy?: number }>>([]);
    const [loadingRelated, setLoadingRelated] = useState(true);
    // Canonical Firestore doc id to query related subcollection (scrapedProducts/{docId}/related)
    const [relatedDocId, setRelatedDocId] = useState<string | null>(null);
    // Track whether we completed at least one related fetch attempt to avoid showing empty state too early
    const [attemptedRelated, setAttemptedRelated] = useState(false);
    // Retry logic for first-load population delay
    const retryRef = useRef(0);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const MAX_RELATED_RETRIES = 2; // total extra attempts after the first
    const RETRY_DELAY_MS = 3500;

    useEffect(() => {
        let mounted = true;
        async function load() {
            try {
                setLoading(true);
                // Try direct fetch first (works if id is already a docId like p_*)
                let res = await fetch(`/api/products/db?action=get&id=${encodeURIComponent(id)}`, { cache: 'no-store' });
                
                if (!res.ok && res.status === 404) {
                    // If not found, it might be a numeric ID - call ensure to get/create the product
                    const ensure = await fetch(`/api/products/ensure?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
                    if (ensure.ok) {
                        const ensureData = await ensure.json();
                        const docId = ensureData.docId;
                        if (docId) {
                            // Refetch using the docId returned by ensure
                            res = await fetch(`/api/products/db?action=get&id=${encodeURIComponent(docId)}`, { cache: 'no-store' });
                        }
                    }
                }
                
                if (res.ok) {
                    const data = await res.json();
                    const dbp = data.product as DBProduct;
                    if (mounted && dbp) {
                        setProduct(dbp);
                        // Prefer the canonical Firestore doc id returned from DB
                        setRelatedDocId(dbp.id || null);
                    }
                }
            } catch (e) {
                console.error('Failed to load product', e);
            } finally {
                if (mounted) setLoading(false);
            }
        }
        load();
        return () => { mounted = false; };
    }, [id]);

    // Load related products AFTER main product has loaded, using the canonical doc id
    useEffect(() => {
        let mounted = true;
        async function loadRelated() {
            // Only start fetching once the main product load is finished and we know the canonical doc id
            if (loading || !relatedDocId) return;
            try {
                setLoadingRelated(true);
                const res = await fetch(`/api/products/related?id=${encodeURIComponent(relatedDocId)}&limit=12`, { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    const items = (Array.isArray(data) ? data : data?.items || []) as typeof related;
                    if (mounted) {
                        setRelated(items);
                        
                        // If empty on first load, schedule a couple of retries (for first-visit population lag)
                        if (items.length === 0 && retryRef.current < MAX_RELATED_RETRIES) {
                            // keep skeleton visible
                            retryRef.current += 1;
                            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
                            retryTimerRef.current = setTimeout(() => {
                                // re-attempt fetching
                                loadRelated();
                            }, RETRY_DELAY_MS);
                            return; // don't mark attempted yet
                        } else {
                            setAttemptedRelated(true);
                        }
                    }
                } else {
                    if (mounted) {
                        setRelated([]);
                        setAttemptedRelated(true);
                    }
                }
            } catch (e) {
                console.warn('Failed to load related', e);
                if (mounted) {
                    setRelated([]);
                    setAttemptedRelated(true);
                }
            } finally {
                if (mounted) setLoadingRelated(false);
            }
        }
        // When route changes, reset state and wait for main product
        setRelated([]);
        // Keep skeleton visible until we actually attempt to fetch
        setLoadingRelated(true);
        setAttemptedRelated(false);
        // reset retries and clear any pending timers
        retryRef.current = 0;
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
        loadRelated();
        return () => {
            mounted = false;
            if (retryTimerRef.current) {
                clearTimeout(retryTimerRef.current);
                retryTimerRef.current = null;
            }
        };
    }, [id, loading, relatedDocId]);

    // Calculate display price with 20% markup on scraped products
    const getDisplayPrice = (product: DBProduct) => {
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
            currency: "JPY",
            maximumFractionDigits: 2
        }).format(amount);

    return (
        <section className="w-full px-6 lg:px-10 py-12 md:py-16" onScrollCapture={(e) => {
            const sc = (e.currentTarget as HTMLElement).scrollTop;
            setOpenBar(sc > 500);
        }}>
            {loading && (
                <div className="max-w-6xl mx-auto animate-pulse">
                    <div className="h-4 w-28 bg-gray-200 rounded" />
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
                        <div className="lg:col-span-7 space-y-4">
                            <div className="aspect-square rounded-xl bg-gray-200" />
                            <div className="grid grid-cols-3 gap-4">
                                <div className="aspect-[4/3] rounded-lg bg-gray-200" />
                                <div className="aspect-[4/3] rounded-lg bg-gray-200" />
                                <div className="aspect-[4/3] rounded-lg bg-gray-200" />
                            </div>
                        </div>
                        <div className="lg:col-span-5 space-y-4">
                            <div className="h-8 bg-gray-200 rounded w-3/4" />
                            <div className="h-6 bg-gray-200 rounded w-1/3" />
                            <div className="space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-full" />
                                <div className="h-4 bg-gray-200 rounded w-5/6" />
                                <div className="h-4 bg-gray-200 rounded w-4/6" />
                            </div>
                            <div className="h-10 bg-gray-200 rounded w-40" />
                        </div>
                    </div>
                </div>
            )}
            {!loading && product && (
                <div className="max-w-6xl mx-auto">
                <Link href={`/${lang}/products`} className="text-sm underline text-blue-600">{t("back")}</Link>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
                    <div className="lg:col-span-7 space-y-4">
                        <div className="aspect-square overflow-hidden rounded-xl border bg-white">
                            <Image
                                src={product?.images?.[0] || product?.imageUrl || "/placeholder.jpg"}
                                alt={product?.title || "Product"}
                                width={1200}
                                height={1200}
                                className="h-full w-full object-cover"
                            />
                        </div>
                        {product && (
                            <div className="grid grid-cols-3 gap-4">
                                {(product.images && product.images.length > 0
                                    ? product.images.slice(0, 6)
                                    : [product.imageUrl, product.imageUrl, product.imageUrl]).map((img, i) => (
                                    <div key={i} className="aspect-[4/3] overflow-hidden rounded-lg border bg-white">
                                        <Image
                                            src={img || "/placeholder.jpg"}
                                            alt={`${product.title} ${i+1}`}
                                            width={600}
                                            height={450}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Feature badges under the gallery */}
                        <div className="pt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
                            <div className="w-auto inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1.5 hover:bg-blue-600 hover:text-white transition-colors">
                                <span className="h-2 w-2 rounded-full bg-current"></span>
                                <span>{t("shipsTokyo")}</span>
                            </div>
                            <div className="w-auto inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1.5 hover:bg-blue-600 hover:text-white transition-colors">
                                <span className="h-2 w-2 rounded-full bg-current"></span>
                                <span>{t("securePayments")}</span>
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-5">
                        <div className="flex items-start justify-between mb-2">
                            <h1 className="text-3xl font-bold">{product?.title || "Loading..."}</h1>
                            <div className="flex flex-col gap-1 ml-4">
                                {product?.labels?.map((label, index) => (
                                    <span
                                        key={index}
                                        className={`px-2 py-1 text-xs rounded-full font-semibold text-white ${
                                            label === 'Sold' ? 'bg-gray-600' :
                                            label === 'Used' ? 'bg-orange-500' :
                                            'bg-blue-500'
                                        }`}
                                    >
                                        {label}
                                    </span>
                                ))}
                                {product?.isSoldOut && (
                                    <span className="px-2 py-1 text-xs rounded-full font-semibold text-white bg-gray-600">
                                        Sold
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="text-lg mb-2 flex items-center gap-2">
                            <span className={`${product?.compareAt ? "text-rose-600 font-semibold" : "text-black font-semibold"}`}>
                                {product ? formatPrice(getDisplayPrice(product)) : formatPrice(0)}
                                {product?.sourceUrl && product.sourceUrl.includes('scraped') && (
                                    <span className="ml-2 text-xs text-gray-500">
                                        (+20% markup)
                                    </span>
                                )}
                            </span>
                            {product?.compareAt && (
                                <span className="text-base text-black line-through">{formatPrice(product!.compareAt)}</span>
                            )}
                        </div>
                        <div className="text-sm text-gray-600 mb-4">
                            {product?.description || t("description")}
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="inline-flex items-center rounded-full border px-4 py-2 min-w-[140px] justify-between">
                                <button className="h-6 w-6 inline-flex items-center justify-center rounded-full hover:bg-gray-100" onClick={() => setQty(Math.max(1, qty-1))}>-</button>
                                <span className="px-3 min-w-[2rem] text-center">{qty}</span>
                                <button className="h-6 w-6 inline-flex items-center justify-center rounded-full hover:bg-gray-100" onClick={() => setQty(qty+1)}>+</button>
                            </div>
                            {product && (
                                <AddToCartButton id={product.id} title={product.title} price={product.price} label={t("addToCart")} image={product.images?.[0] || product.imageUrl || "/placeholder.jpg"} quantity={qty} />
                            )}
                        </div>
                        {/* badges moved under images */}
                        <hr className="my-6" />
                            <div className="space-y-2 text-sm">
                                <div className="font-semibold">{t("whatsInside")}</div>
                                {Array.isArray((product as DBProduct).specs) && (product as DBProduct).specs!.length > 0 ? (
                                    <ul className="list-disc pl-5 space-y-1">
                                        {(product as DBProduct).specs!.map((s, i) => (
                                            <li key={i}>{s}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <ul className="list-disc pl-5 space-y-1">
                                        <li>{t("feature1")}</li>
                                        <li>{t("feature2")}</li>
                                        <li>{t("feature3")}</li>
                                    </ul>
                                )}
                            </div>
                    </div>
                </div>

                {/* Related products section - only render after we attempt fetch or have data */}
                {(!attemptedRelated && related.length === 0 && (loading || loadingRelated)) ? null : (
                <div className="mt-16 md:mt-20">
                    <h2 className="text-xl font-semibold mb-6 text-center">{t("youMayLike")}</h2>
                    {(loading || loadingRelated) ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <div key={i} className="animate-pulse">
                                    <div className="aspect-[4/3] rounded-lg bg-gray-200" />
                                    <div className="mt-2 space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : related.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {related.slice(0, 8).map((p) => (
                                <Link key={`${p.id}`} href={`/${lang}/products/p_${p.id}`} className="group block">
                                    <div className="aspect-[4/3] overflow-hidden rounded-lg border bg-white">
                                        <Image
                                            src={p.imageUrl || "/placeholder.jpg"}
                                            alt={p.title}
                                            width={600}
                                            height={450}
                                            className="h-full w-full object-cover group-hover:scale-105 transition"
                                        />
                                    </div>
                                    <div className="mt-2 text-sm">
                                        <div className="font-medium group-hover:underline">{p.title}</div>
                                        {p.priceJpy ? (
                                            <div className="mt-0.5 text-xs text-gray-700">¥ {p.priceJpy.toLocaleString('ja-JP')}</div>
                                        ) : null}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-8">
                            {t("noRelatedProducts") || "No related products available"}
                        </div>
                    )}
                </div>
                )}
            </div>
            )}
            {/* Sticky footer add-to-cart bar */}
            {openBar && (
                <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur">
                    <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <div className="truncate font-medium">{product?.title || "Loading..."}</div>
                            <div className="text-sm flex items-center gap-2">
                                <span className={`${product?.compareAt ? "text-rose-600 font-semibold" : "text-black font-semibold"}`}>
                                    {product ? formatPrice(getDisplayPrice(product)) : formatPrice(0)}
                                    {product?.sourceUrl && product.sourceUrl.includes('scraped') && (
                                        <span className="ml-1 text-xs text-gray-500">
                                            (+20% markup)
                                        </span>
                                    )}
                                </span>
                                {product?.compareAt && (
                                    <span className="text-xs text-black line-through">{formatPrice(product!.compareAt)}</span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="inline-flex items-center rounded-full border px-4 py-2 min-w-[140px] justify-between">
                                <button className="h-6 w-6 inline-flex items-center justify-center rounded-full hover:bg-gray-100" onClick={() => setQty(Math.max(1, qty-1))}>-</button>
                                <span className="px-3 min-w-[2rem] text-center">{qty}</span>
                                <button className="h-6 w-6 inline-flex items-center justify-center rounded-full hover:bg-gray-100" onClick={() => setQty(qty+1)}>+</button>
                            </div>
                            {product && (
                                <AddToCartButton id={product.id} title={product.title} price={getDisplayPrice(product)} label={t("addToCart")} image={product.images?.[0] || product.imageUrl || "/placeholder.jpg"} />
                            )}
                        </div>
                    </div>
                </div>
                )}
        </section>
    );
}
