import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Check if Stripe credentials are available
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY not found. Payment capture will be disabled.');
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2025-09-30.clover',
}) : null;

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is properly configured
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment processing not configured. Please add STRIPE_SECRET_KEY to environment variables.' },
        { status: 503 }
      );
    }

    const { paymentIntentId, shippingFee = 0, finalAmount } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent ID is required' },
        { status: 400 }
      );
    }

    // Get the existing payment intent to see the authorized amount
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'requires_capture') {
      return NextResponse.json(
        { error: `Payment intent status is ${paymentIntent.status}, cannot capture` },
        { status: 400 }
      );
    }

    const authorizedAmount = paymentIntent.amount; // Amount that was authorized (product price only)

    // Calculate final capture amount (authorized amount + shipping fee)
    const captureAmount = finalAmount || (authorizedAmount + Math.round(shippingFee * 100));

    // Capture the payment with the final amount
    const capturedPaymentIntent = await stripe.paymentIntents.capture(paymentIntentId, {
      amount_to_capture: captureAmount, // Capture the final amount including shipping
    });

    return NextResponse.json({
      success: true,
      capturedAmount: capturedPaymentIntent.amount_received,
      paymentIntentId: capturedPaymentIntent.id,
      status: capturedPaymentIntent.status,
      message: `Payment captured for ${captureAmount / 100} ${paymentIntent.currency?.toUpperCase()}`
    });

  } catch (error) {
    console.error('❌ Error capturing payment:', error);
    return NextResponse.json(
      { error: 'Failed to capture payment' },
      { status: 500 }
    );
  }
}

