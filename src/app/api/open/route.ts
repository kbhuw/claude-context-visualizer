import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const filePath = body?.path;

    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json({ error: 'Missing path in request body' }, { status: 400 });
    }

    await execAsync(`open -R "${filePath}"`);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to open path', details: String(error) },
      { status: 500 }
    );
  }
}
