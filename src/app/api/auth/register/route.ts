import { NextRequest, NextResponse } from 'next/server';
// Note: Removed Firebase client SDK imports - these should only be used client-side

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, uid, displayName, photoURL } = body;

    // Firebase Auth user creation is now handled client-side
    // API route handles server-side operations only

    return NextResponse.json({
      success: true,
      user: {
        uid,
        email,
        displayName,
        photoURL,
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Registration failed' },
      { status: 400 }
    );
  }
}
