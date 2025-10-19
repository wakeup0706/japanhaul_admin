"use client";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ConfirmationPage() {
	const { lang: rawLang } = useParams<{ lang: string }>();
	const searchParams = useSearchParams();
	const lang = rawLang === "ja" ? "ja" : "en";

	const [paymentStatus, setPaymentStatus] = useState<'loading' | 'success' | 'failed'>('loading');
	const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
	const [isDemoMode, setIsDemoMode] = useState(false);

	useEffect(() => {
		// Check payment status from URL params or local storage
		const paymentIntent = searchParams.get('payment_intent');

		if (paymentIntent) {
			setPaymentIntentId(paymentIntent);
			setPaymentStatus('success');
		} else {
			// Check if payment was successful
			const storedPaymentId = localStorage.getItem('payment_intent_id');
			const demoModeFlag = localStorage.getItem('is_demo_mode');
			if (storedPaymentId) {
				setPaymentIntentId(storedPaymentId);
				setIsDemoMode(demoModeFlag === 'true');
				setPaymentStatus('success');
				localStorage.removeItem('payment_intent_id');
				localStorage.removeItem('is_demo_mode');
			} else {
				setPaymentStatus('failed');
			}
		}
	}, [searchParams]);

	const t = {
		en: {
			title: "Payment Confirmed",
			sub: "Thank you for your purchase!",
			track: "Track Delivery",
			failed: "Payment Failed",
			failedSub: "Your payment could not be processed. Please try again.",
			retry: "Try Again"
		},
		ja: {
			title: "支払いが確認されました",
			sub: "ご購入ありがとうございます！",
			track: "配送状況を確認",
			failed: "支払いに失敗しました",
			failedSub: "支払いを処理できませんでした。もう一度お試しください。",
			retry: "再試行"
		},
	}[lang];

	if (paymentStatus === 'loading') {
		return (
			<section className="max-w-3xl mx-auto px-4 py-10 text-center">
				<div className="animate-spin inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full"></div>
				<p className="mt-4 text-gray-600">Confirming payment...</p>
			</section>
		);
	}

	if (paymentStatus === 'failed') {
		return (
			<section className="max-w-3xl mx-auto px-4 py-10 text-center">
				<h1 className="text-2xl font-semibold mb-2 text-red-600">{t.failed}</h1>
				<p className="text-gray-600 mb-6">{t.failedSub}</p>
				<Link href={`/${lang}/checkout`} className="inline-block bg-red-600 text-white px-6 py-3 rounded font-semibold">
					{t.retry}
				</Link>
			</section>
		);
	}

	return (
		<section className="max-w-3xl mx-auto px-4 py-10 text-center">
			<h1 className="text-2xl font-semibold mb-2 text-green-600">
				{isDemoMode ? 'Demo Payment Confirmed' : t.title}
			</h1>
			<p className="text-gray-600 mb-6">
				{isDemoMode ? 'Demo payment completed successfully!' : t.sub}
			</p>
			<div className={`border rounded p-4 text-left mb-6 ${isDemoMode ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50'}`}>
				<div className="font-semibold mb-2 flex items-center gap-2">
					<span className={`w-2 h-2 rounded-full ${isDemoMode ? 'bg-yellow-600' : 'bg-green-600'}`}></span>
					Order #{paymentIntentId?.slice(-8) || '000123'}
					{isDemoMode && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">DEMO</span>}
				</div>
				<div className="text-sm text-gray-600 mb-3">
					{isDemoMode ? 'Demo payment completed - no real transaction occurred' : 'Payment authorized successfully'}
				</div>
				{!isDemoMode && (
					<div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
						<div className="font-semibold text-blue-900 mb-1">💳 Payment Status</div>
						<div className="text-blue-800">
							✅ <strong>Authorized:</strong> Your payment method has been verified and ${paymentIntentId ? 'the product amount' : 'your order amount'} is reserved.<br/>
							⏳ <strong>Final Settlement:</strong> You&apos;ll be charged the final amount (including shipping) once your items are shipped.
						</div>
					</div>
				)}
			</div>
			<Link href={`/${lang}`} className="inline-block bg-black text-white px-6 py-3 rounded font-semibold">
				Continue Shopping
			</Link>
		</section>
	);
}
