import {useTranslations} from "next-intl";

export default function Footer() {
    const t = useTranslations("footer");
    return (
        <footer className="mt-10 bg-black text-white">
            <div className="w-full px-6 lg:px-10 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8 text-base">
				<div>
                    <div className="font-semibold mb-3 text-lg">{t("shop.title")}</div>
                    <ul className="space-y-2 pl-2 sm:pl-4">
						<li>{t("shop.trending")}</li>
						<li>{t("shop.newArrivals")}</li>
						<li>{t("shop.onSale")}</li>
						<li>{t("shop.collections")}</li>
					</ul>
				</div>
				<div>
                    <div className="font-semibold mb-3 text-lg">{t("care.title")}</div>
					<ul className="space-y-2">
						<li>{t("care.account")}</li>
						<li>{t("care.contact")}</li>
						<li>{t("care.faqs")}</li>
						<li>{t("care.shippingReturns")}</li>
					</ul>
				</div>
				<div>
                    <div className="font-semibold mb-3 text-lg">{t("about.title")}</div>
					<ul className="space-y-2">
						<li>{t("about.aboutUs")}</li>
						<li>{t("about.careers")}</li>
						<li>{t("about.privacy")}</li>
						<li>{t("about.terms")}</li>
					</ul>
				</div>
			</div>
            <div className="border-t border-white/10">
                <div className="w-full px-6 lg:px-10 py-6 text-xs text-white/70">{t("copyright")}</div>
			</div>
		</footer>
	);
}
