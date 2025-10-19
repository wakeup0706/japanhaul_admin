import { NextRequest, NextResponse } from 'next/server';
import { getAdminUserByUID } from '@/lib/db/scraped-products';

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

        // Check if user exists in admin users database
        const adminUser = await getAdminUserByUID(uid);

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

        // Check if user has 'all' permission (super admin)
        const hasAllAccess = adminUser.permissions.includes('all');

        return NextResponse.json({
            hasAccess: true,
            isAdmin: true,
            role: adminUser.role,
            permissions: adminUser.permissions,
            name: adminUser.name,
            email: adminUser.email,
            uid: adminUser.uid,
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
