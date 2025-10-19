import { NextRequest, NextResponse } from 'next/server';
import { updateOrderShippingFee } from '@/lib/db/scraped-products';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { shippingFee } = await request.json();

        if (typeof shippingFee !== 'number' || shippingFee < 0) {
            return NextResponse.json(
                { error: 'Invalid shipping fee' },
                { status: 400 }
            );
        }

        const orderId = await updateOrderShippingFee((await params).id, shippingFee);

        return NextResponse.json({
            success: true,
            orderId,
            shippingFee
        });
    } catch (error) {
        console.error('Error updating shipping fee:', error);
        return NextResponse.json(
            { error: 'Failed to update shipping fee' },
            { status: 500 }
        );
    }
}
