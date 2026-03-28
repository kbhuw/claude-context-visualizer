import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { KnownProject } from '@/lib/types';

export async function GET() {
  try {
    const clientStatePath = path.join(os.homedir(), '.claude.json');
    const content = await fs.readFile(clientStatePath, 'utf-8');
    const clientState = JSON.parse(content) as Record<string, unknown>;

    const projects: KnownProject[] = [];

    if (clientState.projects && typeof clientState.projects === 'object') {
      const projectsObj = clientState.projects as Record<string, Record<string, unknown>>;
      for (const [projectPath, config] of Object.entries(projectsObj)) {
        projects.push({
          path: projectPath,
          lastActive: config?.lastActive as string | undefined,
        });
      }
    }

    return NextResponse.json(projects);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
