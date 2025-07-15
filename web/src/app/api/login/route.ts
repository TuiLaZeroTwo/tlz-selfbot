// In-memory store for issued tokens and their expiry
declare global {
  // eslint-disable-next-line no-var
  var __molotovTokenStore: Record<string, number>;
}
const tokenStore: Record<string, number> = globalThis.__molotovTokenStore || (globalThis.__molotovTokenStore = {});
import { NextResponse } from 'next/server';
import config from '../../../../config';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json();
    if (
      !identifier ||
      !password ||
      typeof identifier !== 'string' ||
      typeof password !== 'string' ||
      identifier.length > 255 ||
      password.length > 255
    ) {
      return NextResponse.json({ error: 'Missing or invalid credentials' }, { status: 400 });
    }
    const username = config.website.account.username;
    const userpass = config.website.account.password;
        if (
            identifier === username &&
            password === userpass
        ) {
            const token = crypto.randomBytes(16).toString('hex');
            const expires = Date.now() + 900 * 1000; // 15 minutes
            tokenStore[token] = expires;
            const response = NextResponse.json({ success: true });
            response.cookies.set('auth_user', token, { httpOnly: true, path: '/', sameSite: 'strict', secure: true, maxAge: 900 });
            return response;
    } else {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
