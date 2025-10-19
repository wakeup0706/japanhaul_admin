import { NextRequest, NextResponse } from 'next/server';
import { initializeDefaultAdminUsers } from '@/lib/db/scraped-products';

/**
 * POST /api/admin/setup
 * Initialize default admin users and system setup
 * This should only be called once during first-time deployment
 */
export async function POST(request: NextRequest) {
    try {
        // Verify the request is coming from an authorized source
        // In production, you might want to add additional security checks here
        const { secret } = await request.json();

        // For security, you could check against an environment variable
        if (secret !== process.env.ADMIN_SETUP_SECRET) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        await initializeDefaultAdminUsers();

        return NextResponse.json({
            success: true,
            message: 'System initialized successfully. Default admin users created.',
        });
    } catch (error) {
        console.error('Error during system setup:', error);
        return NextResponse.json(
            { error: 'Failed to initialize system' },
            { status: 500 }
        );
    }
}
