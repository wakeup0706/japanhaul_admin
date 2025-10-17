import { NextRequest, NextResponse } from 'next/server';
import { createOrder, OrderData } from '@/lib/db/scraped-products';

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
      items,
      subtotal,
      total: subtotal, // Will be updated when shipping fee is added
      paymentIntentId,
      paymentStatus: 'authorized',
      orderStatus: 'confirmed',
      authorizedAmount: subtotal,
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

