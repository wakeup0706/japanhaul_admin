import { NextRequest, NextResponse } from 'next/server';
import { updateOrderStatus } from '@/lib/db/scraped-products';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { status } = await request.json();

        if (!status || !['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid order status' },
                { status: 400 }
            );
        }

        const orderId = await updateOrderStatus((await params).id, status);

        return NextResponse.json({
            success: true,
            orderId,
            status
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        return NextResponse.json(
            { error: 'Failed to update order status' },
            { status: 500 }
        );
    }
}
