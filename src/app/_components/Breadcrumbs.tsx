"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {useMessages, useTranslations} from "next-intl";

function toTitle(slug: string): string {
    if (!slug) return "";
    return slug
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Breadcrumbs() {
    const t = useTranslations("breadcrumbs");
    const pathname = usePathname();
    const messages = useMessages() as Record<string, unknown>;
    // pathname like "/en/products/p1" -> segments after lang
    const segments = useMemo(() => {
        const parts = (pathname || "/").split("/").filter(Boolean);
        if (parts.length === 0) return [] as string[];
        // drop language segment if present (en/ja)
        const rest = parts.slice(1);
        return rest;
    }, [pathname]);

    if (segments.length === 0) return null;

    // Build items for JSON-LD and links
    const lang = (pathname || "/").split("/").filter(Boolean)[0] || "en";
    const crumbs = [{ label: t("home"), href: `/${lang}` }];
    let href = crumbs[0].href;
    // Pull a safe lookup map for route labels to avoid next-intl "MISSING_MESSAGE" logs
    const breadcrumbsMessages = messages?.breadcrumbs as Record<string, unknown> | undefined;
    const routeLabels: Record<string, string> = (breadcrumbsMessages?.routes ?? {}) as Record<string, string>;
    segments.forEach((seg) => {
        href += `/${seg}`;
        // Resolve translation if present; otherwise gracefully fallback without triggering MISSING_MESSAGE
        const label = typeof routeLabels[seg] === "string" ? routeLabels[seg] : toTitle(seg);
        crumbs.push({ label, href });
    });

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.label,
            item: c.href,
        })),
    };

    return (
        <div className="w-full px-6 lg:px-10 py-2 text-sm text-gray-600">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 flex-wrap">
                {crumbs.map((c, i) => (
                    <span key={c.href} className="flex items-center gap-2">
                        {i > 0 && <span className="text-gray-400">→</span>}
                        {i < crumbs.length - 1 ? (
                            <Link href={c.href} className="hover:underline">{c.label}</Link>
                        ) : (
                            <span className="text-gray-900">{c.label}</span>
                        )}
                    </span>
                ))}
            </nav>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        </div>
    );
}


