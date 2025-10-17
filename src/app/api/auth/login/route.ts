import { NextRequest, NextResponse } from 'next/server';
// Note: Removed Firebase client SDK imports - these should only be used client-side

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, uid, displayName, photoURL } = body;

    // Firebase Auth is now handled client-side
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
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Login failed' },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  if (mode === 'resetPassword' && oobCode) {
    // Handle password reset callback
    return NextResponse.redirect(new URL(`/reset-password?mode=${mode}&oobCode=${oobCode}`, request.url));
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}
