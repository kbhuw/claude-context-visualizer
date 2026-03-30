import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const INSTALLED_PLUGINS_PATH = join(homedir(), '.claude', 'plugins', 'installed_plugins.json');

export async function DELETE(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Plugin name is required' }, { status: 400 });
    }

    const raw = await readFile(INSTALLED_PLUGINS_PATH, 'utf-8');
    const data = JSON.parse(raw);

    if (data.version === 2 && data.plugins) {
      // Find the matching key (e.g., "context7@claude-plugins-official")
      const matchingKey = Object.keys(data.plugins).find(
        (key) => key.startsWith(name + '@') || key === name
      );

      if (!matchingKey) {
        return NextResponse.json({ error: `Plugin "${name}" not found` }, { status: 404 });
      }

      delete data.plugins[matchingKey];
    } else if (Array.isArray(data)) {
      // v1 format
      const idx = data.findIndex((p: { name: string }) => p.name === name);
      if (idx === -1) {
        return NextResponse.json({ error: `Plugin "${name}" not found` }, { status: 404 });
      }
      data.splice(idx, 1);
    } else {
      return NextResponse.json({ error: 'Unknown plugin file format' }, { status: 500 });
    }

    await writeFile(INSTALLED_PLUGINS_PATH, JSON.stringify(data, null, 2) + '\n');

    return NextResponse.json({ success: true, removed: name });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to remove plugin' },
      { status: 500 }
    );
  }
}
