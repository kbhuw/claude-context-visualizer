import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST() {
  if (process.platform !== 'darwin') {
    return NextResponse.json({ error: 'Browse is only supported on macOS' });
  }

  try {
    const { stdout } = await execAsync(
      `osascript -e 'POSIX path of (choose folder)'`
    );
    const path = stdout.trim();
    return NextResponse.json({ path });
  } catch {
    // User cancelled the dialog
    return NextResponse.json({ cancelled: true });
  }
}
