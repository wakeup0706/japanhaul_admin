import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory store for demo purposes
const authenticatedSessions = new Set<string>();

export async function POST(request: NextRequest) {
    try {
        const sessionId = request.cookies.get('admin_session');

        if (sessionId) {
            // Remove session from store
            authenticatedSessions.delete(sessionId.value);
        }

        // Create response with cleared cookie
        const response = NextResponse.json({
            success: true,
            message: 'Logged out successfully',
        });

        // Clear the session cookie
        response.cookies.set('admin_session', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 0, // Expire immediately
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
