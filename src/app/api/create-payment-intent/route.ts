import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Check if Stripe secret key is available
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY not found. Payment processing will be disabled.');
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2025-09-30.clover',
}) : null;

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      // Return demo payment intent for testing when secret key is missing
      const { amount } = await request.json();

      if (!amount || amount <= 0) {
        return NextResponse.json(
          { error: 'Invalid amount' },
          { status: 400 }
        );
      }

      // Generate a demo client secret (this won't process real payments)
      const demoClientSecret = `demo_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const demoPaymentIntentId = `pi_demo_${Date.now()}`;

      return NextResponse.json({
        clientSecret: demoClientSecret,
        paymentIntentId: demoPaymentIntentId,
        demo: true,
        message: 'Running in demo mode - no real payment processing'
      });
    }

    const { amount, currency = 'jpy', metadata = {} } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Create a PaymentIntent with authorization only (no immediate capture)
    // Product price will be authorized, shipping fees captured later when shipped
    const paymentIntent = await stripe.paymentIntents.create({
      amount: currency === 'jpy' ? amount : Math.round(amount * 100), // JPY uses whole numbers, USD uses cents
      currency: currency,
      metadata: metadata,
      capture_method: 'manual', // Manual capture - authorize now, capture later
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
