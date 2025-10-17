import { NextResponse } from 'next/server';
import { getAllOrders } from '@/lib/db/scraped-products';

interface ProductPopularity {
    productId: string;
    title: string;
    purchaseCount: number;
    totalQuantity: number;
    totalRevenue: number;
    imageUrl?: string;
    sourceUrl?: string;
}

export async function GET() {
  try {
    // Get all orders to calculate popularity
    const orders = await getAllOrders(500);

    // Calculate product popularity
    const productStats = new Map<string, ProductPopularity>();

    orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                const existing = productStats.get(item.productId);

                if (existing) {
                    existing.purchaseCount += 1;
                    existing.totalQuantity += item.quantity;
                    existing.totalRevenue += item.price * item.quantity;
                } else {
                    productStats.set(item.productId, {
                        productId: item.productId,
                        title: item.title,
                        purchaseCount: 1,
                        totalQuantity: item.quantity,
                        totalRevenue: item.price * item.quantity,
                        imageUrl: item.imageUrl,
                        sourceUrl: item.sourceUrl,
                    });
                }
            });
        }
    });

    // Convert to array and sort by purchase count (popularity)
    const popularProducts = Array.from(productStats.values())
        .sort((a, b) => b.purchaseCount - a.purchaseCount)
        .slice(0, 50); // Limit to top 50

    return NextResponse.json({
        products: popularProducts,
        count: popularProducts.length,
    });
  } catch (error) {
    console.error('❌ Error fetching popular products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popular products' },
      { status: 500 }
    );
  }
}

