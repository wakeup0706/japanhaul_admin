"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { trackAnalyticsEvent, generateSessionId } from '@/lib/db/analytics';

interface UseAnalyticsOptions {
    trackPageViews?: boolean;
    trackFeatureUsage?: boolean;
}

/**
 * Hook to track analytics events for admin pages
 */
export function useAnalytics(options: UseAnalyticsOptions = {}) {
    const { trackPageViews = true, trackFeatureUsage: enableFeatureUsage = true } = options;
    const pathname = usePathname();
    const sessionIdRef = useRef<string>('');
    const currentUserRef = useRef<any>(null);
    const lastPageViewRef = useRef<string>('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUserRef.current = user;

                // Initialize session ID if not exists
                if (!sessionIdRef.current) {
                    sessionIdRef.current = generateSessionId();
                }

                // Track initial page view
                if (trackPageViews && pathname !== lastPageViewRef.current) {
                    trackPageView(pathname);
                    lastPageViewRef.current = pathname;
                }
            }
        });

        return () => unsubscribe();
    }, [pathname, trackPageViews]);

    const trackPageView = async (page: string) => {
        if (!currentUserRef.current) return;

        try {
            await trackAnalyticsEvent({
                userId: currentUserRef.current.uid,
                userRole: currentUserRef.current.role || 'unknown',
                eventType: 'page_view',
                page,
                sessionId: sessionIdRef.current,
            });
        } catch (error) {
            console.error('Failed to track page view:', error);
        }
    };

    const trackFeatureUsage = async (feature: string, metadata?: Record<string, any>) => {
        if (!currentUserRef.current) return;

        try {
            await trackAnalyticsEvent({
                userId: currentUserRef.current.uid,
                userRole: currentUserRef.current.role || 'unknown',
                eventType: 'feature_usage',
                page: pathname,
                feature,
                metadata,
                sessionId: sessionIdRef.current,
            });
        } catch (error) {
            console.error('Failed to track feature usage:', error);
        }
    };

    const trackAction = async (action: string, metadata?: Record<string, any>) => {
        if (!currentUserRef.current) return;

        try {
            await trackAnalyticsEvent({
                userId: currentUserRef.current.uid,
                userRole: currentUserRef.current.role || 'unknown',
                eventType: 'action',
                page: pathname,
                feature: action,
                metadata,
                sessionId: sessionIdRef.current,
            });
        } catch (error) {
            console.error('Failed to track action:', error);
        }
    };

    return {
        trackPageView,
        trackFeatureUsage,
        trackAction,
        sessionId: sessionIdRef.current,
    };
}
