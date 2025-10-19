/**
 * Profit Calculation Service
 * Handles profit calculations and financial analytics
 */

import { getAllOrders } from './scraped-products';

// TypeScript interfaces
export interface ProfitData {
    date: string; // YYYY-MM-DD format
    totalRevenue: number; // Total amount customers paid (with markup)
    totalCost: number; // Total original scraped prices
    totalProfit: number; // Revenue - Cost
    orderCount: number;
    averageOrderValue: number;
}

/**
 * Calculate profit data for a date range
 */
export async function calculateProfitData(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'day'
): Promise<ProfitData[]> {
    try {
        const orders = await getAllOrders(1000); // Get last 1000 orders

        // Filter orders by date range and completed status
        const filteredOrders = orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate >= startDate &&
                   orderDate <= endDate &&
                   order.paymentStatus === 'captured' &&
                   order.orderStatus === 'delivered';
        });

        if (filteredOrders.length === 0) {
            return [];
        }

        // Group orders by the specified time period
        const groupedData = new Map<string, {
            totalRevenue: number;
            totalCost: number;
            orderCount: number;
        }>();

        filteredOrders.forEach(order => {
            const orderDate = new Date(order.createdAt);
            let groupKey: string;

            switch (groupBy) {
                case 'day':
                    groupKey = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD
                    break;
                case 'week':
                    const weekStart = new Date(orderDate);
                    weekStart.setDate(orderDate.getDate() - orderDate.getDay());
                    groupKey = weekStart.toISOString().split('T')[0];
                    break;
                case 'month':
                    groupKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-01`;
                    break;
            }

            if (!groupedData.has(groupKey)) {
                groupedData.set(groupKey, {
                    totalRevenue: 0,
                    totalCost: 0,
                    orderCount: 0,
                });
            }

            const group = groupedData.get(groupKey)!;
            group.totalRevenue += order.total || 0;
            group.orderCount++;

            // Calculate original cost from items
            if (order.items) {
                group.totalCost += order.items.reduce((total, item) => {
                    return total + (item.originalPrice * item.quantity);
                }, 0);
            }
        });

        // Convert to array and calculate profit metrics
        const profitData: ProfitData[] = Array.from(groupedData.entries()).map(([date, data]) => ({
            date,
            totalRevenue: data.totalRevenue,
            totalCost: data.totalCost,
            totalProfit: data.totalRevenue - data.totalCost,
            orderCount: data.orderCount,
            averageOrderValue: data.orderCount > 0 ? data.totalRevenue / data.orderCount : 0,
        })).sort((a, b) => a.date.localeCompare(b.date));

        return profitData;
    } catch (error) {
        console.error('❌ Error calculating profit data:', error);
        throw error;
    }
}

/**
 * Get profit summary for a date range
 */
export async function getProfitSummary(startDate: Date, endDate: Date): Promise<{
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    totalOrders: number;
    averageOrderValue: number;
    profitMargin: number; // (profit / revenue) * 100
}> {
    try {
        const orders = await getAllOrders(1000);

        const filteredOrders = orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate >= startDate &&
                   orderDate <= endDate &&
                   order.paymentStatus === 'captured' &&
                   order.orderStatus === 'delivered';
        });

        if (filteredOrders.length === 0) {
            return {
                totalRevenue: 0,
                totalCost: 0,
                totalProfit: 0,
                totalOrders: 0,
                averageOrderValue: 0,
                profitMargin: 0,
            };
        }

        const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalCost = filteredOrders.reduce((sum, order) => {
            if (order.items) {
                return sum + order.items.reduce((itemSum, item) => {
                    return itemSum + (item.originalPrice * item.quantity);
                }, 0);
            }
            return sum;
        }, 0);

        const totalProfit = totalRevenue - totalCost;
        const averageOrderValue = totalRevenue / filteredOrders.length;
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        return {
            totalRevenue,
            totalCost,
            totalProfit,
            totalOrders: filteredOrders.length,
            averageOrderValue,
            profitMargin,
        };
    } catch (error) {
        console.error('❌ Error calculating profit summary:', error);
        throw error;
    }
}
