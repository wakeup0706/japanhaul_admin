"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/app/(cart)/CartContext";

export default function CartView({ lang }: { lang: "en" | "ja" }) {
	const { state, subtotal, dispatch } = useCart();
	const t = {
		en: { title: "Your Cart", checkout: "Proceed to Checkout", empty: "Your cart is empty", remove: "Remove", subtotal: "Subtotal" },
		ja: { title: "カート", checkout: "レジに進む", empty: "カートは空です", remove: "削除", subtotal: "小計" },
	}[lang];

	return (
        <section className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
            <h1 className="text-4xl font-bold mb-10 text-center">{t.title}</h1>
			{state.items.length === 0 ? (
				<div className="text-gray-600">{t.empty}</div>
			) : (
				<>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Items table */}
                        <div className="lg:col-span-2">
                            <div className="hidden md:grid grid-cols-12 px-4 pb-3 text-base text-gray-700">
                                <div className="col-span-6">Product</div>
                                <div className="col-span-2 text-center">Price</div>
                                <div className="col-span-2 text-center">Quantity</div>
                                <div className="col-span-2 text-right">Total</div>
                            </div>
                            <div className="divide-y rounded-2xl border bg-white shadow-sm">
                                {state.items.map((item) => (
                                    <div key={item.id} className="grid grid-cols-12 items-center gap-4 p-4">
                                        <div className="col-span-12 md:col-span-6 flex items-center gap-4 min-w-0">
                                            <div className="h-20 w-20 overflow-hidden rounded-lg border bg-gray-50 shrink-0">
                                                <Image src={item.image || "/placeholder.jpg"} alt={item.title} width={80} height={80} className="h-full w-full object-cover" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="truncate text-lg font-medium">{item.title}</div>
                                                <button className="text-sm text-red-600 hover:underline" onClick={() => dispatch({ type: "remove", id: item.id })}>{t.remove}</button>
                                            </div>
                                        </div>
                                        <div className="col-span-4 md:col-span-2 text-center text-base">${item.price.toFixed(2)} USD</div>
                                        <div className="col-span-4 md:col-span-2 flex items-center justify-center">
                                            <div className="inline-flex items-center rounded-full border px-5 py-3 min-w-[160px] justify-between">
                                                <button className="h-7 w-7 inline-flex items-center justify-center rounded-full hover:bg-gray-100 text-base" onClick={() => dispatch({ type: "setQty", id: item.id, quantity: Math.max(1, item.quantity - 1) })}>-</button>
                                                <span className="px-2 text-base min-w-[2.25rem] text-center">{item.quantity}</span>
                                                <button className="h-7 w-7 inline-flex items-center justify-center rounded-full hover:bg-gray-100 text-base" onClick={() => dispatch({ type: "setQty", id: item.id, quantity: item.quantity + 1 })}>+</button>
                                            </div>
                                        </div>
                                        <div className="col-span-4 md:col-span-2 text-right text-lg font-semibold">${(item.price * item.quantity).toFixed(2)} USD</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Summary */}
                        <aside className="lg:col-span-1">
                            <div className="rounded-2xl border bg-white p-5 space-y-4 shadow-sm">
                                <div className="flex items-center justify-between text-base">
                                    <span className="text-gray-700">{t.subtotal}</span>
                                    <span className="text-lg font-semibold">$ {subtotal.toFixed(2)}</span>
                                </div>
                                <div className="text-sm text-gray-500">Taxes and shipping calculated at checkout</div>
                                <Link href={`/${lang}/checkout`} className="block rounded-full bg-black px-5 py-3.5 text-center text-lg font-semibold text-white transition-colors hover:bg-indigo-700">
                                    {t.checkout}
                                </Link>
                            </div>
                        </aside>
                    </div>
				</>
			)}
		</section>
	);
}
