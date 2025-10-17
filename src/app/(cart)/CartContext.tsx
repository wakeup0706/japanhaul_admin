"use client";

import { createContext, useContext, useMemo, useReducer } from "react";

export type CartItem = { id: string; title: string; price: number; quantity: number; image?: string };

type CartState = { items: CartItem[] };

type Action =
	| { type: "add"; item: Omit<CartItem, "quantity">; quantity?: number }
	| { type: "remove"; id: string }
	| { type: "setQty"; id: string; quantity: number }
	| { type: "clear" };

function reducer(state: CartState, action: Action): CartState {
	switch (action.type) {
		case "add": {
			const existing = state.items.find((i) => i.id === action.item.id);
			if (existing) {
				return {
					items: state.items.map((i) =>
						i.id === action.item.id
							? { ...i, quantity: i.quantity + (action.quantity ?? 1) }
							: i
					),
				};
			}
			return { items: [...state.items, { ...action.item, quantity: action.quantity ?? 1 }] };
		}
		case "remove":
			return { items: state.items.filter((i) => i.id !== action.id) };
		case "setQty":
			return { items: state.items.map((i) => (i.id === action.id ? { ...i, quantity: action.quantity } : i)) };
		case "clear":
			return { items: [] };
		default:
			return state;
	}
}

const CartContext = createContext<{
	state: CartState;
	dispatch: React.Dispatch<Action>;
	subtotal: number;
} | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(reducer, undefined, () => {
        if (typeof window !== "undefined") {
            try {
                const raw = window.localStorage.getItem("cart:v1");
                if (raw) return JSON.parse(raw) as CartState;
            } catch {}
        }
        return { items: [] } as CartState;
    });
	const subtotal = useMemo(() => state.items.reduce((s, i) => s + i.price * i.quantity, 0), [state.items]);
    if (typeof window !== "undefined") {
        try { window.localStorage.setItem("cart:v1", JSON.stringify(state)); } catch {}
    }
    return <CartContext.Provider value={{ state, dispatch, subtotal }}>{children}</CartContext.Provider>;
}

export function useCart() {
	const ctx = useContext(CartContext);
	if (!ctx) throw new Error("useCart must be used within CartProvider");
	return ctx;
}
