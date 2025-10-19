/**
 * Analytics Database Service
 * Handles usage tracking and analytics data collection
 */

import { db } from '@/lib/firebase';
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    Timestamp,
    QueryConstraint
} from 'firebase/firestore';

// TypeScript interfaces
export interface AnalyticsEvent {
    id?: string;
    userId: string;
    userRole?: string;
    eventType: 'page_view' | 'action' | 'feature_usage';
    page: string; // e.g., '/admin/products', '/admin/orders'
    feature?: string; // e.g., 'edit_product', 'capture_payment'
    metadata?: Record<string, any>;
    timestamp: Date;
    sessionId: string;
}

/**
 * Track an analytics event
 */
export async function trackAnalyticsEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
        const analyticsRef = collection(db, 'analytics');

        // Build event data, only including defined fields
        const eventData: any = {
            userId: event.userId,
            eventType: event.eventType,
            page: event.page,
            sessionId: event.sessionId,
            timestamp: new Date(),
            // Add random suffix to avoid duplicates
            _id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };

        // Only add optional fields if they're defined
        if (event.userRole !== undefined) {
            eventData.userRole = event.userRole;
        }

        if (event.feature !== undefined && event.feature !== null) {
            eventData.feature = event.feature;
        }

        if (event.metadata !== undefined && event.metadata !== null) {
            // Filter out undefined values from metadata
            const cleanMetadata = Object.fromEntries(
                Object.entries(event.metadata).filter(([_, value]) => value !== undefined && value !== null)
            );
            if (Object.keys(cleanMetadata).length > 0) {
                eventData.metadata = cleanMetadata;
            }
        }

        await addDoc(analyticsRef, eventData);
    } catch (error: any) {
        // Silently ignore duplicate document errors
        if (error?.code === 'already-exists' || error?.message?.includes('already exists')) {
            console.log('ℹ️ Analytics event already tracked (duplicate ignored)');
            return;
        }
        console.error('❌ Error tracking analytics event:', error);
        // Don't throw - analytics shouldn't break the app
    }
}

/**
 * Get analytics data for a date range
 */
export async function getAnalyticsData(
    startDate: Date,
    endDate: Date,
    filters?: {
        userRole?: string;
        page?: string;
        eventType?: string;
    }
): Promise<{
    pageViews: Array<{ page: string; count: number; uniqueUsers: number }>;
    featureUsage: Array<{ feature: string; count: number }>;
    userActivity: Array<{ userId: string; userRole: string; events: number }>;
    totalEvents: number;
}> {
    try {
        const analyticsRef = collection(db, 'analytics');
        const startTimestamp = Timestamp.fromDate(startDate);
        const endTimestamp = Timestamp.fromDate(endDate);

        const constraints: QueryConstraint[] = [
            where('timestamp', '>=', startTimestamp),
            where('timestamp', '<=', endTimestamp),
        ];

        const q = query(analyticsRef, ...constraints);
        const querySnapshot = await getDocs(q);

        const events: AnalyticsEvent[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            events.push({
                id: doc.id,
                ...data,
                timestamp: data.timestamp.toDate(),
            } as AnalyticsEvent);
        });

        // Apply additional filters
        let filteredEvents = events;
        if (filters?.userRole) {
            filteredEvents = filteredEvents.filter(e => e.userRole === filters.userRole);
        }
        if (filters?.page) {
            filteredEvents = filteredEvents.filter(e => e.page === filters.page);
        }
        if (filters?.eventType) {
            filteredEvents = filteredEvents.filter(e => e.eventType === filters.eventType);
        }

        // Calculate page views
        const pageViewsMap = new Map<string, Set<string>>();
        filteredEvents
            .filter(e => e.eventType === 'page_view')
            .forEach(event => {
                if (!pageViewsMap.has(event.page)) {
                    pageViewsMap.set(event.page, new Set());
                }
                pageViewsMap.get(event.page)!.add(event.userId);
            });

        const pageViews = Array.from(pageViewsMap.entries()).map(([page, users]) => ({
            page,
            count: filteredEvents.filter(e => e.eventType === 'page_view' && e.page === page).length,
            uniqueUsers: users.size,
        })).sort((a, b) => b.count - a.count);

        // Calculate feature usage
        const featureUsageMap = new Map<string, number>();
        filteredEvents
            .filter(e => e.eventType === 'feature_usage')
            .forEach(event => {
                const feature = event.feature || 'unknown';
                featureUsageMap.set(feature, (featureUsageMap.get(feature) || 0) + 1);
            });

        const featureUsage = Array.from(featureUsageMap.entries())
            .map(([feature, count]) => ({ feature, count }))
            .sort((a, b) => b.count - a.count);

        // Calculate user activity
        const userActivityMap = new Map<string, { userId: string; userRole: string; events: number }>();
        filteredEvents.forEach(event => {
            const key = `${event.userId}_${event.userRole}`;
            if (!userActivityMap.has(key)) {
                userActivityMap.set(key, {
                    userId: event.userId,
                    userRole: event.userRole || 'unknown',
                    events: 0,
                });
            }
            userActivityMap.get(key)!.events++;
        });

        const userActivity = Array.from(userActivityMap.values())
            .sort((a, b) => b.events - a.events);

        return {
            pageViews,
            featureUsage,
            userActivity,
            totalEvents: filteredEvents.length,
        };
    } catch (error) {
        console.error('❌ Error getting analytics data:', error);
        throw error;
    }
}

/**
 * Generate a session ID for analytics tracking
 */
export function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
