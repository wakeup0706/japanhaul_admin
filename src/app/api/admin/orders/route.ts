import { NextResponse } from 'next/server';
import { getAllOrders } from '@/lib/db/scraped-products';

export async function GET() {
  try {
    // Get all orders for admin view
    const orders = await getAllOrders(100);

    return NextResponse.json({
      orders,
      count: orders.length,
    });
  } catch (error) {
    console.error('❌ Error fetching orders for admin:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

