import { NextRequest, NextResponse } from 'next/server';
import { scanContext } from '@/lib/scanner';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectPath = searchParams.get('project') || null;

  try {
    const context = await scanContext(projectPath);
    return NextResponse.json(context);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to scan context', details: String(error) },
      { status: 500 }
    );
  }
}
