import { NextRequest, NextResponse } from 'next/server';
import { getAdminUserByUID, upsertAdminUser, getRolePermissions } from '@/lib/db/scraped-products';

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { role } = await request.json();

        if (!role || !['super_admin', 'admin', 'general', 'test_mode'].includes(role)) {
            return NextResponse.json(
                { error: 'Invalid role' },
                { status: 400 }
            );
        }

        // Get current user data
        const currentUser = await getAdminUserByUID(params.id);
        if (!currentUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Update user with new role and permissions
        const updatedUser = {
            ...currentUser,
            role: role as any,
            permissions: getRolePermissions(role as any),
        };

        await upsertAdminUser(updatedUser);

        return NextResponse.json({
            success: true,
            message: 'User role updated successfully'
        });
    } catch (error) {
        console.error('Error updating user role:', error);
        return NextResponse.json(
            { error: 'Failed to update user role' },
            { status: 500 }
        );
    }
}
