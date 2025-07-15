import { NextResponse } from 'next/server';
import config from '../../../../../config';

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
    const username = config.website?.account?.username;
    const userpass = config.website?.account?.password;
    if (
      identifier === username &&
      password === userpass
    ) {
      const response = NextResponse.json({ success: true });
      response.cookies.set('auth_user', JSON.stringify({ username }), { httpOnly: true, path: '/' });
      return response;
    } else {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
