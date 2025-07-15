// In-memory store for issued tokens and their expiry
declare global {
  // eslint-disable-next-line no-var
  var __molotovTokenStore: Record<string, number>;
}
import { NextResponse } from 'next/server';
import config from '../../../../config';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { secretkey } = await req.json();
    if (!secretkey || typeof secretkey !== 'string' || secretkey.length > 255) {
      return NextResponse.json({ error: 'Missing or invalid secret key' }, { status: 400 });
    }
    const usersecret = config.secretkey;
    if (secretkey === usersecret) {
      // Generate a random cookie name
      const cookieName = 'sk_' + crypto.randomBytes(8).toString('hex');
      const response = NextResponse.json({ success: true, cookieName });
      response.cookies.set(cookieName, usersecret, { httpOnly: true, path: '/', sameSite: 'strict', secure: true, maxAge: 900 });
      return response;
    } else {
      return NextResponse.json({ error: 'Invalid secret key' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
