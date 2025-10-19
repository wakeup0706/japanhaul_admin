import { NextRequest, NextResponse } from 'next/server';
import { deleteAdminUser } from '@/lib/db/scraped-products';

export async function DELETE(
    request: NextRequest,
    { params }: { params: { uid: string } }
) {
    try {
        await deleteAdminUser(params.uid);

        return NextResponse.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json(
            { error: 'Failed to delete user' },
            { status: 500 }
        );
    }
}
