import CartView from "./CartView";

export default async function CartPage({ params }: { params: Promise<{ lang: string }> }) {
	const { lang: rawLang } = await params;
	const lang = rawLang === "ja" ? "ja" : "en";
	return <CartView lang={lang} />;
}
