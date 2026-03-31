import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let dir = searchParams.get('dir');

  if (!dir) {
    dir = os.homedir();
  }

  // Expand tilde
  if (dir.startsWith('~/') || dir === '~') {
    dir = path.join(os.homedir(), dir.slice(1));
  }

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const items = entries
      .filter((e) => !e.name.startsWith('.'))
      .map((e) => ({
        name: e.name,
        path: path.join(dir!, e.name),
        isDirectory: e.isDirectory(),
      }))
      .filter((e) => e.isDirectory || e.name.endsWith('.md'))
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({ dir, items });
  } catch {
    return NextResponse.json({ error: 'Cannot read directory', dir }, { status: 404 });
  }
}
