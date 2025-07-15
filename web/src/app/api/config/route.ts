import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const configPath = path.join(process.cwd(), '../config.js');

export async function GET() {
  const fileContent = await fs.readFile(configPath, 'utf-8');
  const configMatch = fileContent.match(/module\.exports\s*=\s*({[\s\S]*?});/);
  if (!configMatch) {
    return NextResponse.json({ error: 'Invalid config format' }, { status: 400 });
  }
  const config = eval(`(${configMatch[1]})`);
  return NextResponse.json(config);
}

export async function POST(request: Request) {
  const newConfig = await request.json();
  const configString = `module.exports = ${JSON.stringify(newConfig, null, 2)};`;
  await fs.writeFile(configPath, configString, 'utf-8');
  return NextResponse.json({ message: 'Config updated successfully' });
}