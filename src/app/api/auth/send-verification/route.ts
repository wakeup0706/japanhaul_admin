import { NextResponse } from 'next/server';

// This API route is no longer needed since we're using EmailJS (client-side)
// EmailJS handles email sending directly from the browser without server-side API calls

// Adding a minimal export to make this a valid module
export async function GET() {
  return NextResponse.json({ message: 'This endpoint is deprecated' }, { status: 410 });
}
