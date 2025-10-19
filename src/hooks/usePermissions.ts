"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getAdminUserByUID } from "@/lib/db/scraped-products";
import type { AdminUser } from "@/lib/db/scraped-products";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessFeature,
  type Permission
} from "@/lib/auth/permissions";

interface UsePermissionsReturn {
  user: AdminUser | null;
  loading: boolean;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  canAccessFeature: (feature: 'ADMIN_MANAGEMENT' | 'PRODUCT_MANAGEMENT' | 'ORDER_MANAGEMENT' | 'CUSTOMER_MANAGEMENT' | 'ANALYTICS' | 'BASIC_ACCESS') => boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isGeneral: boolean;
  isTestMode: boolean;
}

/**
 * Hook for managing admin permissions and user state
 */
export function usePermissions(): UsePermissionsReturn {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const adminUser = await getAdminUserByUID(firebaseUser.uid);
          setUser(adminUser);
        } catch (error) {
          console.error('Error fetching admin user:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    loading,
    hasPermission: (permission: Permission) => hasPermission(user, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(user, permissions),
    hasAllPermissions: (permissions: Permission[]) => hasAllPermissions(user, permissions),
    canAccessFeature: (feature: 'ADMIN_MANAGEMENT' | 'PRODUCT_MANAGEMENT' | 'ORDER_MANAGEMENT' | 'CUSTOMER_MANAGEMENT' | 'ANALYTICS' | 'BASIC_ACCESS') => canAccessFeature(user, feature),
    isSuperAdmin: user?.role === 'super_admin',
    isAdmin: user?.role === 'admin',
    isGeneral: user?.role === 'general',
    isTestMode: user?.role === 'test_mode'
  };
}
