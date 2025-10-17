"use client";

import { useCart } from "@/app/(cart)/CartContext";

export default function AddToCartButton({ id, title, price, label, image, quantity = 1 }: { id: string; title: string; price: number; label: string; image?: string; quantity?: number }) {
    const { dispatch } = useCart();
    return (
        <button
            className="bg-black text-white px-4 py-2 rounded"
            onClick={() => {
                dispatch({ type: "add", item: { id, title, price, image }, quantity });
                try {
                    const ev = new CustomEvent("cart:open");
                    window.dispatchEvent(ev);
                    document.dispatchEvent(ev);
                } catch {}
            }}
        >
            {label}
        </button>
    );
}
