import { NextRequest, NextResponse } from 'next/server';
import { createOrder, OrderData, calculateDisplayPrice, calculateSubtotalWithMarkup, calculateOriginalSubtotal } from '@/lib/db/scraped-products';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      // Customer Contact Information
      email,
      firstName,
      lastName,
      phone,

      // Delivery Information
      address,
      city,
      state,
      zipCode,

      // Order Details
      items,
      subtotal,

      // Payment Information
      paymentIntentId,

      // Preferences
      newsletterOptIn = false,
    } = body;

    // Validate required fields
    if (!email || !firstName || !lastName || !address || !city || !state || !zipCode) {
      return NextResponse.json(
        { error: 'Missing required customer or delivery information' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'No items in order' },
        { status: 400 }
      );
    }

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment information required' },
        { status: 400 }
      );
    }

    // Calculate pricing with 20% markup
    const itemsWithPricing = items.map(item => ({
      ...item,
      originalPrice: item.price, // Store original scraped price
      price: calculateDisplayPrice(item.price), // Apply 20% markup for display
    }));

    const originalSubtotal = calculateOriginalSubtotal(items.map(item => ({ price: item.price, quantity: item.quantity })));
    const subtotalWithMarkup = calculateSubtotalWithMarkup(items.map(item => ({ price: item.price, quantity: item.quantity })));

    // Create order data
    const orderData: Omit<OrderData, 'id' | 'createdAt' | 'updatedAt'> = {
      email,
      firstName,
      lastName,
      phone,
      address,
      city,
      state,
      zipCode,
      items: itemsWithPricing,
      subtotal: subtotalWithMarkup,
      originalSubtotal,
      total: subtotalWithMarkup, // Will be updated when shipping fee is added
      paymentIntentId,
      paymentStatus: 'authorized',
      orderStatus: 'confirmed',
      authorizedAmount: originalSubtotal, // Authorize original price only (without markup)
      newsletterOptIn,
    };

    // Create order in database
    const orderId = await createOrder(orderData);

    return NextResponse.json({
      success: true,
      orderId,
      message: 'Order created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

