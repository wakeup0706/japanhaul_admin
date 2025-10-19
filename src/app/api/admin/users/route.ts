import { NextRequest, NextResponse } from 'next/server';
import { getAllAdminUsers, upsertAdminUser, getRolePermissions } from '@/lib/db/scraped-products';

export async function GET() {
    try {
        const users = await getAllAdminUsers();

        return NextResponse.json({
            users,
            count: users.length,
        });
    } catch (error) {
        console.error('Error fetching admin users:', error);
        return NextResponse.json(
            { error: 'Failed to fetch admin users' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { uid, email, name, role } = await request.json();

        if (!uid || !email || !role) {
            return NextResponse.json(
                { error: 'UID, email, and role are required' },
                { status: 400 }
            );
        }

        if (!['super_admin', 'admin', 'general', 'test_mode'].includes(role)) {
            return NextResponse.json(
                { error: 'Invalid role' },
                { status: 400 }
            );
        }

        // Create new admin user
        const adminUser = {
            uid,
            email,
            name,
            role: role as any,
            permissions: getRolePermissions(role as any),
            isActive: true,
        };

        const userId = await upsertAdminUser(adminUser);

        return NextResponse.json({
            success: true,
            message: 'Admin user created successfully',
            userId,
        });
    } catch (error) {
        console.error('Error creating admin user:', error);
        return NextResponse.json(
            { error: 'Failed to create admin user' },
            { status: 500 }
        );
    }
}
