"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/app/(cart)/CartContext";
import { useTranslations } from "next-intl";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Checkout Form Component that uses Stripe Elements
function CheckoutForm({ subtotal, onPaymentSuccess, isDemoMode }: { subtotal: number; onPaymentSuccess: () => void; isDemoMode: boolean }) {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isDemoMode) {
            // Demo mode - simulate payment success
            setIsProcessing(true);
            setMessage('Demo mode: Payment would be processed...');

            setTimeout(() => {
                setMessage('Demo mode: Payment successful!');
                setIsProcessing(false);
                onPaymentSuccess();
            }, 2000);
            return;
        }

        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);

        try {
            const { error: paymentError } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/confirmation`,
                },
            });

            if (paymentError) {
                setMessage(paymentError.message || 'Payment failed');
            } else {
                onPaymentSuccess();
            }
        } catch {
            setMessage('Payment failed');
        }

        setIsProcessing(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {isDemoMode && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="text-yellow-800 text-sm">
                        🧪 <strong>Demo Mode:</strong> This is a demo payment form. No real payment will be processed.
                    </div>
                </div>
            )}
            <div className="border rounded-md p-4">
                <h2 className="font-semibold mb-3">Payment Information</h2>
                <PaymentElement />
                {message && <div className="mt-2 text-sm text-red-600">{message}</div>}
            </div>

            <button
                disabled={isProcessing || (!stripe && !isDemoMode)}
                type="submit"
                className="inline-flex w-full justify-center rounded bg-red-600 text-white px-4 py-3 text-base font-semibold disabled:opacity-50"
            >
                {isProcessing
                    ? (isDemoMode ? 'Processing Demo...' : 'Processing...')
                    : (isDemoMode ? `Demo Pay ¥${subtotal.toLocaleString()}` : `Pay ¥${subtotal.toLocaleString()}`)
                }
            </button>
        </form>
    );
}

export default function CheckoutPage() {
    const { lang: rawLang } = useParams<{ lang: string }>();
	const lang = rawLang === "ja" ? "ja" : "en";
    const t = useTranslations("checkout");
    const { state, subtotal } = useCart();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
    const [isLoadingPayment, setIsLoadingPayment] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [currentUser, setCurrentUser] = useState<unknown>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
    const [orderError, setOrderError] = useState<string | null>(null);

    // Form state for contact and delivery details
    const [formData, setFormData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        newsletterOptIn: true,
    });

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const createOrderFromForm = async () => {
        if (!paymentIntentId) {
            throw new Error('No payment intent ID available');
        }

        const orderData = {
            ...formData,
            items: state.items.map(item => ({
                productId: item.id,
                title: item.title,
                price: item.price,
                quantity: item.quantity,
                imageUrl: item.image,
            })),
            subtotal,
            total: subtotal, // For now, total equals subtotal (no shipping/tax)
            paymentIntentId,
        };

        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to create order');
        }

        return result.orderId;
    };

    useEffect(() => {
        setMounted(true);

        // Check authentication state first
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setAuthChecked(true);

            if (!user) {
                // Redirect to login if not authenticated
                router.push(`/${lang}/login?message=${encodeURIComponent('Please login to access checkout')}&redirect=${encodeURIComponent(`/${lang}/checkout`)}`);
                return;
            }
        });

        return () => unsubscribe();
    }, [router, lang]);

    useEffect(() => {
        // Only create PaymentIntent if user is authenticated and auth check is complete
        if (!authChecked || !currentUser) return;

        // Create PaymentIntent on component mount
        const createPaymentIntent = async () => {
            if (subtotal <= 0) return;

            setIsLoadingPayment(true);
            setPaymentError(null);

            try {
                const response = await fetch('/api/create-payment-intent', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        amount: subtotal,
                        currency: 'jpy',
                        metadata: {
                            itemCount: state.items.length,
                        },
                    }),
                });

                const data = await response.json();

                if (data.clientSecret) {
                    setClientSecret(data.clientSecret);
                    setPaymentIntentId(data.paymentIntentId);
                    setIsDemoMode(data.demo || false);
                } else if (data.error) {
                    setPaymentError(data.error);
                }
            } catch (error) {
                console.error('Failed to create payment intent:', error);
                setPaymentError('Failed to initialize payment system');
            } finally {
                setIsLoadingPayment(false);
            }
        };

        createPaymentIntent();
    }, [subtotal, state.items.length, authChecked, currentUser]);

    const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);

    const handlePaymentSuccess = async () => {
        if (!paymentIntentId) return;

        setIsCreatingOrder(true);
        setOrderError(null);

        try {
            // Create order with form data
            await createOrderFromForm();

            // Store data for confirmation page
            localStorage.setItem('payment_intent_id', paymentIntentId);
            localStorage.setItem('is_demo_mode', isDemoMode.toString());

            // Redirect to confirmation page
            router.push(`/${lang}/confirmation`);
        } catch (error) {
            console.error('Error creating order:', error);
            setOrderError(error instanceof Error ? error.message : 'Failed to create order');
        } finally {
            setIsCreatingOrder(false);
        }
    };

    const appearance = {
        theme: 'stripe' as const,
    };

    const options = clientSecret ? {
        clientSecret,
        appearance,
    } : { clientSecret: '', appearance };

	// Show loading state while checking authentication
	if (!authChecked) {
        return (
            <>
                {/* Minimal header */}
                <header className="w-full border-b bg-white">
                    <div className="mx-auto max-w-7xl px-4 h-16 flex items-center">
                        <Link href={`/${lang}`} className="text-xl font-semibold tracking-wide">JapanHaul</Link>
                        <div className="flex-1" />
                        <Link href={`/${lang}/cart`} aria-label="Cart" className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100">
                            <span className="text-2xl" role="img" aria-hidden>🛒</span>
                        </Link>
                    </div>
                </header>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full mb-4"></div>
                        <p className="text-gray-600">Checking authentication...</p>
                    </div>
                </div>
            </>
        );
    }

    // If not authenticated, don't render checkout content
    if (!currentUser) {
        return null; // Will redirect via useEffect
    }

	return (
        <>
        {/* Minimal checkout header */}
        <header className="w-full border-b bg-white">
            <div className="mx-auto max-w-7xl px-4 h-16 flex items-center">
                <Link href={`/${lang}`} className="text-xl font-semibold tracking-wide">JapanHaul</Link>
                <div className="flex-1" />
                <Link href={`/${lang}/cart`} aria-label="Cart" className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100">
                    <span className="text-2xl" role="img" aria-hidden>🛒</span>
                </Link>
            </div>
        </header>

        <section className="mx-auto max-w-7xl px-4 py-6 md:py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: form */}
                <div className="lg:col-span-2">
                    <h1 className="text-2xl font-semibold mb-4">{t("title")}</h1>

                    <div className="space-y-6">
                        {/* Payment Flow Explanation */}
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                            <h2 className="font-semibold mb-3 text-blue-900">💳 How Payment Works</h2>
                            <div className="text-sm text-blue-800 space-y-2">
                                <div className="flex items-start gap-2">
                                    <span className="font-semibold text-blue-600">1. Authorization:</span>
                                    <span>When you complete your order, we&apos;ll authorize ¥{subtotal.toLocaleString()} (product cost) on your card. This reserves the funds but doesn&apos;t charge you yet.</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="font-semibold text-blue-600">2. Shipping Calculation:</span>
                                    <span>Once we determine the final shipping cost, we&apos;ll calculate your total.</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="font-semibold text-blue-600">3. Final Charge:</span>
                                    <span>After your items ship, we&apos;ll charge the total amount (products + shipping) to your card.</span>
                                </div>
                            </div>
                        </div>

                        <div className="border rounded-md p-4">
                            <h2 className="font-semibold mb-3">{t("contact")}</h2>
                            <input
                                className="border rounded p-3 w-full"
                                placeholder={t("email")}
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                required
                            />
                            <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={formData.newsletterOptIn}
                                    onChange={(e) => handleInputChange('newsletterOptIn', e.target.checked.toString())}
                                    className="h-4 w-4"
                                />
                                <span>Email me with news and offers</span>
                            </label>
                        </div>

                        <div className="border rounded-md p-4">
                            <h2 className="font-semibold mb-3">{t("delivery")}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                    className="border rounded p-3 w-full"
                                    placeholder="First name"
                                    value={formData.firstName}
                                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                                    required
                                />
                                <input
                                    className="border rounded p-3 w-full"
                                    placeholder="Last name"
                                    value={formData.lastName}
                                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                                    required
                                />
                            </div>
                            <input
                                className="mt-3 border rounded p-3 w-full"
                                placeholder="Address"
                                value={formData.address}
                                onChange={(e) => handleInputChange('address', e.target.value)}
                                required
                            />
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                                <input
                                    className="border rounded p-3 w-full"
                                    placeholder="City"
                                    value={formData.city}
                                    onChange={(e) => handleInputChange('city', e.target.value)}
                                    required
                                />
                                <input
                                    className="border rounded p-3 w-full"
                                    placeholder="State"
                                    value={formData.state}
                                    onChange={(e) => handleInputChange('state', e.target.value)}
                                    required
                                />
                                <input
                                    className="border rounded p-3 w-full"
                                    placeholder="ZIP code"
                                    value={formData.zipCode}
                                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                                    required
                                />
                            </div>
                            <input
                                className="mt-3 border rounded p-3 w-full"
                                placeholder="Phone"
                                value={formData.phone}
                                onChange={(e) => handleInputChange('phone', e.target.value)}
                            />
				</div>

                        {/* Show loading state initially until payment intent is created */}
                        {isLoadingPayment && subtotal > 0 && (
                            <div className="text-center p-4 border rounded-md">
                                <div className="animate-spin inline-block w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full"></div>
                                <p className="mt-2 text-sm text-gray-600">Setting up payment...</p>
                            </div>
                        )}

                        {/* Show Stripe Elements when client secret is available */}
                        {clientSecret && !isLoadingPayment && (
                            <Elements options={options} stripe={stripePromise}>
                                <CheckoutForm subtotal={subtotal} onPaymentSuccess={handlePaymentSuccess} isDemoMode={isDemoMode} />
                            </Elements>
                        )}

                        {/* Show empty cart message when no items */}
                        {subtotal === 0 && !isLoadingPayment && (
                            <div className="text-center p-4 border rounded-md text-gray-500">
                                Add items to your cart to proceed with payment
                            </div>
                        )}

                        {/* Show error when payment system fails */}
                        {!isLoadingPayment && paymentError && subtotal > 0 && (
                            <div className="text-center p-4 border rounded-md bg-red-50 border-red-200">
                                <div className="text-red-800 mb-2">❌ Payment Error</div>
                                <p className="text-sm text-red-700 mb-3">
                                    {paymentError}
                                </p>
                                <Link href={`/${lang}`} className="text-blue-600 hover:text-blue-800 text-sm">
                                    Continue Shopping →
                                </Link>
                            </div>
                        )}

                        {/* Show error when Stripe is not configured */}
                        {!isLoadingPayment && !clientSecret && !paymentError && subtotal > 0 && (
                            <div className="text-center p-4 border rounded-md bg-yellow-50 border-yellow-200">
                                <div className="text-yellow-800 mb-2">⚠️ Payment System Not Configured</div>
                                <p className="text-sm text-yellow-700 mb-3">
                                    Stripe payment processing is not set up. Please add your Stripe keys to proceed with payments.
                                </p>
                                <Link href={`/${lang}`} className="text-blue-600 hover:text-blue-800 text-sm">
                                    Continue Shopping →
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: order summary */}
                <aside className="lg:col-span-1">
                    <div className="lg:sticky lg:top-6 border rounded-md p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold">Order summary</h2>
                            <span suppressHydrationWarning className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-black px-2 text-xs font-semibold text-white">
                                {mounted ? itemCount : 0}
                            </span>
                        </div>

                        <div className="space-y-4">
                            {mounted && state.items.map((i) => (
                                <div key={i.id} className="flex items-center gap-3">
                                    {/* thumbnail with badge positioned outside so it's not clipped */}
                                    <div className="relative">
                                        <div className="h-16 w-16 overflow-hidden rounded border bg-white">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={i.image || "/placeholder.jpg"} alt={i.title || "Product"} className="h-full w-full object-cover" />
                                        </div>
                                        <span suppressHydrationWarning className="pointer-events-none absolute -top-2 -right-2 translate-x-1 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-gray-800 px-2 text-xs font-semibold text-white">
                                            {mounted ? i.quantity : 0}
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium">{i.title}</div>
                                        <div className="text-sm text-gray-600">¥{i.price.toLocaleString()} JPY</div>
                                    </div>
                                </div>
                            ))}

                            <div className="flex gap-2">
                                <input className="flex-1 border rounded p-2" placeholder={t("discount")} />
                                <button className="rounded border px-4">Apply</button>
                            </div>

                            <div className="border-t pt-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>{t("subtotal")}</span>
                                    <span>¥{subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>{t("shipping")}</span>
                                    <span className="text-gray-600">{t("enterShipping")}</span>
                                </div>
                                <div className="flex justify-between text-base font-semibold pt-2">
                                    <span>{t("total")}</span>
                                    <span>JPY ¥{subtotal.toLocaleString()}</span>
                                </div>
					</div>
				</div>
			</div>
                </aside>
			</div>
		</section>
        </>
	);
}
