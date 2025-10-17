import Link from "next/link";
import { useTranslations } from "next-intl";

const categories = [
    { slug: "trending", icon: "🔥", en: "Trending", ja: "トレンド" },
    { slug: "new", icon: "✨", en: "New", ja: "新着" },
    { slug: "sale", icon: "🏷️", en: "Sale", ja: "セール" },
    { slug: "snacks", icon: "🍘", en: "Snacks", ja: "スナック" },
    { slug: "kawaii", icon: "🐱", en: "Kawaii", ja: "かわいい" },
    { slug: "beauty", icon: "💄", en: "Beauty", ja: "ビューティー" },
];

export default function CategoryBar({ lang }: { lang: "en" | "ja" }) {
    const t = useTranslations("category");
    return (
        <div className="bg-white border-b sticky top-[56px] z-30">
            <div className="w-full px-4 py-2 overflow-x-auto">
                <ul className="flex gap-3 sm:gap-4 text-sm whitespace-nowrap">
                    {categories.map((c) => (
                        <li key={c.slug}>
                            <Link href={`/${lang}/products`} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 hover:bg-gray-100">
                                <span aria-hidden>{c.icon}</span>
                                <span>{t(c.slug)}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
