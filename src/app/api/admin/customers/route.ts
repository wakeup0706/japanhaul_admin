import { NextRequest, NextResponse } from 'next/server';
import { getAllOrders } from '@/lib/db/scraped-products';

interface Customer {
    name: string;
    email: string;
    phone?: string;
    orderCount: number;
    totalSpent: number;
    lastOrderDate?: string;
}

export async function GET() {
    try {
        const orders = await getAllOrders(1000); // Get more orders for customer analysis

        // Group orders by customer email
        const customerMap = new Map<string, Customer>();

        orders.forEach(order => {
            const customerKey = order.email;

            if (customerMap.has(customerKey)) {
                const existingCustomer = customerMap.get(customerKey)!;
                existingCustomer.orderCount += 1;
                existingCustomer.totalSpent += order.total || 0;

                // Update last order date if this order is more recent
                if (order.createdAt) {
                    const orderDate = new Date(order.createdAt).toISOString();
                    if (!existingCustomer.lastOrderDate || orderDate > existingCustomer.lastOrderDate) {
                        existingCustomer.lastOrderDate = orderDate;
                    }
                }
            } else {
                customerMap.set(customerKey, {
                    name: `${order.firstName} ${order.lastName}`,
                    email: order.email,
                    phone: order.phone,
                    orderCount: 1,
                    totalSpent: order.total || 0,
                    lastOrderDate: order.createdAt ? new Date(order.createdAt).toISOString() : undefined,
                });
            }
        });

        const customers = Array.from(customerMap.values());

        return NextResponse.json({
            customers,
            count: customers.length,
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        return NextResponse.json(
            { error: 'Failed to fetch customers' },
            { status: 500 }
        );
    }
}
