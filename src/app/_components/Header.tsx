"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Portal from "@/app/_components/Portal";
import { products } from "@/app/_data/products";
import CartDrawer from "@/app/_components/CartDrawer";
import { useCart } from "@/app/(cart)/CartContext";
import { useTranslations } from "next-intl";
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function Header({ lang }: { lang: "en" | "ja" }) {
    const t = useTranslations();
    const [open, setOpen] = useState(false);
    const [cartOpen, setCartOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const pathname = usePathname();
    const cart = useCart();
    const itemCount = cart?.state.items.reduce((s, i) => s + i.quantity, 0) ?? 0;
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        const onOpen = () => setCartOpen(true);
        const handler: EventListener = () => onOpen();
        window.addEventListener("cart:open", handler);
        document.addEventListener("cart:open", handler);

        // Listen for auth state changes
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });

        // Close user menu when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuOpen && !(event.target as Element).closest('.user-menu')) {
                setUserMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener("cart:open", handler);
            document.removeEventListener("cart:open", handler);
            document.removeEventListener('mousedown', handleClickOutside);
            unsubscribe();
        };
    }, [userMenuOpen]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setUserMenuOpen(false);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

	return (
		<div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
            <div className="w-full px-4 py-3 flex items-center gap-4">
                {/* Logo */}
                <Link href={`/${lang}`} className="flex items-center">
                    <Image
                        src="/logo.png"
                        alt="OtakuBox"
                        width={200}
                        height={60}
                        className="h-12 md:h-16 lg:h-20 w-auto"
                        priority
                    />
                </Link>
                <div className="flex-1" />
                {/* Actions */}
                <nav className="flex items-center gap-3 text-sm">
                    {/* Language toggle */}
                    {pathname && (
                        <Link
                            href={(() => {
                                const segments = pathname.split("/");
                                const current = segments[1] === "ja" ? "ja" : "en";
                                const other = current === "ja" ? "en" : "ja";
                                segments[1] = other;
                                const next = segments.join("/") || "/";
                                return next;
                            })()}
                            className="rounded-full px-3 py-1 border hover:bg-gray-100 inline-flex items-center gap-1"
                            aria-label={lang === "ja" ? "Switch to English" : "日本語に切り替え"}
                        >
                            <span aria-hidden className="text-lg">{lang === "ja" ? "A" : "あ"}</span>
                            <span className="hidden sm:inline">{lang === "ja" ? "EN" : "日本語"}</span>
                        </Link>
                    )}
                    {/* Search icon opens drawer */}
                    <button type="button" aria-label="Search" onClick={() => setOpen(true)} className="rounded-full p-2 hover:bg-gray-100">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 4.21 12.02l3.76 3.76a.75.75 0 1 0 1.06-1.06l-3.76-3.76A6.75 6.75 0 0 0 10.5 3.75Zm-5.25 6.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Z" clipRule="evenodd"/></svg>
                    </button>
                    {/* User menu or login link */}
                    {currentUser ? (
                        <div className="relative user-menu">
                            <button
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="flex items-center gap-2 hover:bg-gray-100 rounded-full px-3 py-2 transition-colors"
                            >
                                {currentUser.photoURL ? (
                                    <Image
                                        src={currentUser.photoURL || '/placeholder-avatar.png'}
                                        alt={currentUser.displayName || 'User'}
                                        width={32}
                                        height={32}
                                        className="h-8 w-8 rounded-full"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = '/placeholder-avatar.png';
                                        }}
                                    />
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-gray-600">
                                            <path d="M12 2a5 5 0 0 0-5 5v1a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5Zm7 18.25A7.75 7.75 0 0 0 11.25 12h-1.5A7.75 7.75 0 0 0 2 20.25c0 .414.336.75.75.75h17.5a.75.75 0 0 0 .75-.75Z"/>
                                        </svg>
                                    </div>
                                )}
                                <span className="hidden sm:inline text-sm font-medium">
                                    {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
                                </span>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                                    <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z" clipRule="evenodd"/>
                                </svg>
                            </button>

                            {/* User dropdown menu */}
                            {userMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 user-menu">
                                    <div className="px-4 py-3 border-b border-gray-100">
                                        <p className="text-sm font-medium text-gray-900">
                                            {currentUser.displayName || 'User'}
                                        </p>
                                        <p className="text-sm text-gray-500 truncate">
                                            {currentUser.email}
                                        </p>
                                    </div>
                                    <div className="py-1">
                                        <Link
                                            href={`/${lang}/account`}
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            onClick={() => setUserMenuOpen(false)}
                                        >
                                            {lang === 'ja' ? 'アカウント' : 'Account'}
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            {lang === 'ja' ? 'ログアウト' : 'Log out'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link href={`/${lang}/login`} className="flex items-center gap-1 hover:underline">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M12 2a5 5 0 0 0-5 5v1a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5Zm7 18.25A7.75 7.75 0 0 0 11.25 12h-1.5A7.75 7.75 0 0 0 2 20.25c0 .414.336.75.75.75h17.5a.75.75 0 0 0 .75-.75Z"/></svg>
                            <span className="hidden sm:inline">{t("auth.login")}</span>
                        </Link>
                    )}
                    <button onClick={() => setCartOpen(true)} className="relative inline-flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7"><path d="M2.25 3a.75.75 0 0 0 0 1.5h1.306l2.65 9.278A3 3 0 0 0 9.09 16.5h7.32a3 3 0 0 0 2.884-2.222l1.494-5.353A.75.75 0 0 0 20.07 8.5H6.246L5.37 5.5h14.38a.75.75 0 0 0 0-1.5H5.003a1.5 1.5 0 0 0-1.445 1.098L3.556 6.5H2.25ZM9 18.75A1.75 1.75 0 1 0 9 22.25a1.75 1.75 0 0 0 0-3.5Zm8.25 1.75a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0Z"/></svg>
                        {mounted && itemCount > 0 && (
                            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-black px-1 text-[10px] font-semibold text-white">{itemCount}</span>
                        )}
                    </button>
				</nav>
			</div>

            {/* Search Drawer */}
            {open && (
                <Portal>
                <div className="fixed inset-0 z-[1000]">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
                    <aside className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between border-b px-4 py-3">
                            <div className="text-lg font-semibold">{t("search.title", { default: "Search" })}</div>
                            <button className="rounded-full p-2 hover:bg-gray-100" onClick={() => setOpen(false)} aria-label="Close">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"/></svg>
                            </button>
                        </div>
                        <div className="p-4">
                            <label className="relative block">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 4.21 12.02l3.76 3.76a.75.75 0 1 0 1.06-1.06l-3.76-3.76A6.75 6.75 0 0 0 10.5 3.75Zm-5.25 6.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Z" clipRule="evenodd"/></svg>
                                </span>
                                <input
                                    type="search"
                                    className="w-full rounded-full border px-9 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10"
                                    placeholder={t("search.placeholder")}
                                    onChange={(e) => setQuery(e.target.value)}
                                    autoFocus
                                />
                            </label>
                        </div>
                        <SearchResults lang={lang} queryState={[query, setQuery]} onClose={() => setOpen(false)} />
                    </aside>
                </div>
                </Portal>
            )}
            {/* Cart Drawer rendered in a portal to escape header stacking context */}
            <Portal>
                <CartDrawer lang={lang} open={cartOpen} onClose={() => setCartOpen(false)} />
            </Portal>
        </div>
    );
}

function SearchResults({ lang, queryState, onClose }: { lang: "en" | "ja"; queryState: [string, (v: string) => void]; onClose: () => void }) {
    const t = useTranslations();
    const [query] = queryState;
    const q = query.trim().toLowerCase();
    const matches = q
        ? products.filter((p) => p.title.toLowerCase().includes(q)).slice(0, 6)
        : [];
    return (
        <div className="px-4 pb-6 text-sm text-gray-800">
            <div className="font-medium mb-2">{q ? t("search.products") : t("search.typeToSearch")}</div>
            {q && matches.length === 0 && (
                <div className="text-gray-500">{t("search.noMatches")}</div>
            )}
            <ul className="divide-y border rounded-md">
                {matches.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50">
                        <div className="h-10 w-12 rounded bg-gray-100 border" />
                        <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{p.title}</div>
                            <div className="text-xs text-gray-600">¥{p.price.toLocaleString()} JPY</div>
                        </div>
                        <Link href={`/${lang}/products/${p.id}`} className="text-blue-600 hover:underline" onClick={onClose}>{t("search.view")}</Link>
                    </li>
                ))}
            </ul>
		</div>
	);
}
