"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/app/(cart)/CartContext";
import { useTranslations } from "next-intl";

export default function CartDrawer({ lang, open, onClose }: { lang: string; open: boolean; onClose: () => void }) {
    const t = useTranslations("cart");
    const tHome = useTranslations("home");
    const { state, dispatch, subtotal } = useCart();
    const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);
    const formatPrice = (amount: number) =>
        new Intl.NumberFormat(lang === "ja" ? "ja-JP" : "en-US", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(amount);
    
    // Translate product name (Product N -> 商品 N in Japanese)
    const translateProductName = (title: string) => {
        const match = title.match(/^Product (\d+)$/);
        if (match && lang === "ja") {
            return `${tHome("product")} ${match[1]}`;
        }
        return title;
    };
    
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[1200]">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <aside className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-2xl flex flex-col">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="text-2xl font-bold inline-flex items-center gap-2">
                        <span>{t("title")}</span>
                        <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-black px-2.5 text-sm font-bold text-white">{itemCount}</span>
                    </div>
                    <button className="rounded-full p-2 hover:bg-gray-100" onClick={onClose}>✕</button>
                </div>
                <div className="flex-1 overflow-auto px-4 py-3 space-y-4">
                    {state.items.length === 0 && <div className="text-sm text-gray-600">{t("empty")}</div>}
                    {state.items.map((i) => (
                        <div key={i.id} className="flex items-center gap-3">
                            <div className="h-16 w-16 overflow-hidden rounded border bg-white">
                                {/* fallback if no image */}
                                <Image src={i.image || "/placeholder.jpg"} alt={i.title} width={64} height={64} className="h-full w-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-lg font-bold">{translateProductName(i.title)}</div>
                                <div className="text-base text-gray-700 font-semibold">{formatPrice(i.price)}</div>
                            </div>
                            <div className="inline-flex items-center rounded-full border px-6 py-2.5 min-w-[160px] justify-between">
                                <button
                                    className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-gray-100 text-lg font-bold"
                                    onClick={() => {
                                        const next = i.quantity - 1;
                                        if (next < 1) dispatch({ type: "remove", id: i.id });
                                        else dispatch({ type: "setQty", id: i.id, quantity: next });
                                    }}
                                >-</button>
                                <span className="px-2 text-lg font-bold min-w-[2rem] text-center">{i.quantity}</span>
                                <button className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-gray-100 text-lg font-bold" onClick={() => dispatch({ type: "setQty", id: i.id, quantity: i.quantity + 1 })}>+</button>
                            </div>
                            <button
                                className="ml-3 text-base text-red-600 font-bold hover:underline"
                                onClick={() => dispatch({ type: "remove", id: i.id })}
                            >{t("remove")}</button>
                        </div>
                    ))}
                </div>
                <div className="border-t px-4 py-4 space-y-3">
                    <div className="flex items-center justify-between text-base font-semibold">
                        <span>{t("estimated")}</span>
                        <span className="font-bold">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex gap-3">
                        <Link href={`/${lang}/cart`} className="flex-1 rounded-full border px-5 py-3.5 text-center text-lg font-bold transition-colors hover:bg-indigo-600 hover:text-white hover:border-indigo-600" onClick={onClose}>{t("viewCart")}</Link>
                        <Link href={`/${lang}/checkout`} className="flex-1 rounded-full bg-black px-5 py-3.5 text-center text-lg font-bold text-white transition-colors hover:bg-indigo-700" onClick={onClose}>{t("checkout")}</Link>
                    </div>
                </div>
            </aside>
        </div>
    );
}


