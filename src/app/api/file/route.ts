import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';

const SENSITIVE_KEYS = /token|key|secret|password|authorization/i;

function maskSecrets(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) return obj.map(maskSecrets);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.test(k) && typeof v === 'string') {
        result[k] = '***';
      } else {
        result[k] = maskSecrets(v);
      }
    }
    return result;
  }
  return obj;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');

  if (!filePath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  try {
    const content = await fs.readFile(filePath, 'utf-8');

    // Try to parse as JSON and mask secrets
    try {
      const parsed = JSON.parse(content);
      const masked = maskSecrets(parsed);
      return NextResponse.json({
        path: filePath,
        content: JSON.stringify(masked, null, 2),
        isJson: true,
      });
    } catch {
      // Not JSON, return raw but still mask any inline secrets
      return NextResponse.json({
        path: filePath,
        content,
        isJson: false,
      });
    }
  } catch {
    return NextResponse.json(
      { error: 'File not found or unreadable', path: filePath },
      { status: 404 }
    );
  }
}
