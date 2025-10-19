import type { AdminUser } from "@/lib/db/scraped-products";

/**
 * Permission checking utilities for admin users
 */

export type Permission =
  | 'admin.login'
  | 'admin.permissions.edit'
  | 'products.view'
  | 'products.popularity.view'
  | 'orders.view'
  | 'customers.view'
  | 'analytics.profit.view';

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: AdminUser | null, permission: Permission): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(user: AdminUser | null, permissions: Permission[]): boolean {
  if (!user) return false;
  return permissions.some(permission => user.permissions.includes(permission));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(user: AdminUser | null, permissions: Permission[]): boolean {
  if (!user) return false;
  return permissions.every(permission => user.permissions.includes(permission));
}

/**
 * Get user's role level (higher number = more permissions)
 */
export function getRoleLevel(role: AdminUser['role']): number {
  switch (role) {
    case 'super_admin': return 4;
    case 'admin': return 3;
    case 'general': return 2;
    case 'test_mode': return 1;
    default: return 0;
  }
}

/**
 * Check if a user can access a resource based on role hierarchy
 */
export function canAccessByRole(userRole: AdminUser['role'], requiredRole: AdminUser['role']): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

/**
 * Permission groups for easier management
 */
export const PERMISSION_GROUPS = {
  ADMIN_MANAGEMENT: ['admin.permissions.edit'] as Permission[],
  PRODUCT_MANAGEMENT: ['products.view', 'products.popularity.view'] as Permission[],
  ORDER_MANAGEMENT: ['orders.view'] as Permission[],
  CUSTOMER_MANAGEMENT: ['customers.view'] as Permission[],
  ANALYTICS: ['analytics.profit.view'] as Permission[],
  BASIC_ACCESS: ['admin.login'] as Permission[]
} as const;

/**
 * Check if user has access to a specific feature area
 */
export function canAccessFeature(user: AdminUser | null, feature: keyof typeof PERMISSION_GROUPS): boolean {
  if (!user) return false;
  const requiredPermissions = PERMISSION_GROUPS[feature];
  return hasAnyPermission(user, requiredPermissions);
}

/**
 * Get all permissions available to a role (for UI display)
 */
export function getAllPermissionsForRole(role: AdminUser['role']): Permission[] {
  switch (role) {
    case 'super_admin':
      return [
        'admin.login',
        'admin.permissions.edit',
        'products.view',
        'products.popularity.view',
        'orders.view',
        'customers.view',
        'analytics.profit.view'
      ];
    case 'admin':
      return [
        'admin.login',
        'products.view',
        'products.popularity.view',
        'orders.view',
        'customers.view',
        'analytics.profit.view'
      ];
    case 'general':
      return [
        'admin.login',
        'products.view',
        'products.popularity.view',
        'orders.view',
        'customers.view'
      ];
    case 'test_mode':
      return [
        'admin.login',
        'products.view'
      ];
    default:
      return [];
  }
}
