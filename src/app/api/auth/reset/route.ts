import { NextRequest, NextResponse } from 'next/server';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  if (mode === 'resetPassword' && oobCode) {
    try {
      // Verify the password reset code
      await verifyPasswordResetCode(auth, oobCode);
      // Redirect to reset password page with the code
      return NextResponse.redirect(
        new URL(`/reset-password?mode=${mode}&oobCode=${oobCode}`, request.url)
      );
    } catch (error) {
      console.error('Error verifying reset code:', error);
      return NextResponse.redirect(new URL('/login?error=InvalidResetCode', request.url));
    }
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { oobCode, newPassword } = body;

    if (!oobCode || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await confirmPasswordReset(auth, oobCode, newPassword);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Password reset failed' },
      { status: 400 }
    );
  }
}
