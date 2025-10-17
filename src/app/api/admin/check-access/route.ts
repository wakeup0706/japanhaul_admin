import { NextRequest, NextResponse } from 'next/server';

// Admin users with roles - in production, store this in a database
interface AdminUser {
    email: string;
    role: 'super_admin' | 'admin' | 'general' | 'test_mode';
    name?: string;
    permissions?: string[];
}

const ADMIN_USERS: AdminUser[] = [
    {
        email: 'superadmin@japanhaul.com',
        role: 'super_admin',
        name: 'Super Administrator',
        permissions: ['all']
    },
    {
        email: 'admin@japanhaul.com',
        role: 'admin',
        name: 'Administrator',
        permissions: ['manage_products', 'manage_orders', 'view_analytics']
    },
    {
        email: 'general@japanhaul.com',
        role: 'general',
        name: 'General Staff',
        permissions: ['view_products', 'view_orders']
    },
    {
        email: 'test@japanhaul.com',
        role: 'test_mode',
        name: 'Test User',
        permissions: ['test_features']
    },
    // Add more admin emails as needed
];

// Role-based permissions
const ROLE_PERMISSIONS = {
    super_admin: [
        'all',
        'manage_users',
        'manage_products',
        'manage_orders',
        'view_analytics',
        'system_settings',
        'test_features'
    ],
    admin: [
        'manage_products',
        'manage_orders',
        'view_analytics'
    ],
    general: [
        'view_products',
        'view_orders'
    ],
    test_mode: [
        'test_features',
        'view_products'
    ]
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { uid, email } = body;

        if (!uid || !email) {
            return NextResponse.json(
                { error: 'UID and email are required' },
                { status: 400 }
            );
        }

        // Find user in admin list
        const adminUser = ADMIN_USERS.find(user => user.email === email);

        if (!adminUser) {
            return NextResponse.json({
                hasAccess: false,
                isAdmin: false,
                role: null,
                permissions: [],
                email,
                uid,
            });
        }

        // Get permissions for the role
        const rolePermissions = ROLE_PERMISSIONS[adminUser.role] || [];

        // Check if user has 'all' permission (super admin)
        const hasAllAccess = rolePermissions.includes('all');

        return NextResponse.json({
            hasAccess: true,
            isAdmin: true,
            role: adminUser.role,
            permissions: rolePermissions,
            name: adminUser.name,
            email,
            uid,
            hasAllAccess,
        });

    } catch (error) {
        console.error('Check access error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
