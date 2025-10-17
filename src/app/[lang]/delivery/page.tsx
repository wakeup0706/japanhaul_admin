export default async function DeliveryStatusPage({ params }: { params: Promise<{ lang: string }> }) {
	const { lang: rawLang } = await params;
	const lang = rawLang === "ja" ? "ja" : "en";
	const t = {
		en: { title: "Delivery Status", input: "Enter tracking number", check: "Check", result: "In transit · ETA 3-5 days" },
		ja: { title: "配送状況", input: "追跡番号を入力", check: "確認", result: "輸送中 · 到着予定 3-5 日" },
	}[lang];

	return (
		<section className="max-w-3xl mx-auto px-4 py-8">
			<h1 className="text-xl font-semibold mb-4">{t.title}</h1>
			<div className="flex gap-2 mb-4">
				<input className="border rounded p-2 flex-1" placeholder={t.input} />
				<button className="border px-3 py-2 rounded">{t.check}</button>
			</div>
			<div className="text-sm text-gray-700">{t.result}</div>
		</section>
	);
}
