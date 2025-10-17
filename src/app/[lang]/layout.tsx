"use client";
import type { ReactNode } from "react";
import { usePathname, useParams } from "next/navigation";
import { CartProvider } from "@/app/(cart)/CartContext";
import PromoBar from "@/app/_components/PromoBar";
import Header from "@/app/_components/Header";
import CategoryBar from "@/app/_components/CategoryBar";
import Footer from "@/app/_components/Footer";
import Breadcrumbs from "@/app/_components/Breadcrumbs";
import { NextIntlClientProvider } from "next-intl";
import en from "@/i18n/messages/en.json";
import ja from "@/i18n/messages/ja.json";

export default function LangLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const { lang: rawLang } = useParams<{ lang: string }>();
    const lang = rawLang === "ja" ? "ja" : "en";

    const hideChrome = pathname?.includes("/checkout") || pathname?.includes("/confirmation");

    const messages = lang === "ja" ? ja : en;

    return (
        <CartProvider>
            <NextIntlClientProvider locale={lang} messages={messages} timeZone="UTC">
                {hideChrome ? (
                    <div className="min-h-screen bg-white text-gray-900">
                        <main>{children}</main>
                    </div>
                ) : (
                    <div className="min-h-screen flex flex-col bg-white text-gray-900">
                        <PromoBar />
                        <Header lang={lang} />
                        <CategoryBar lang={lang} />
                        <Breadcrumbs />
                        <main className="flex-1">{children}</main>
                        <Footer />
                    </div>
                )}
            </NextIntlClientProvider>
        </CartProvider>
    );
}
