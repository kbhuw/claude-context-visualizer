import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { KnownProject } from '@/lib/types';

/**
 * Reconstruct a filesystem path from a Claude projects slug.
 * Slugs replace '/' with '-', but directory names can also contain '-',
 * so we greedily resolve segments by checking what exists on disk.
 */
async function slugToProjectPath(slug: string): Promise<string | null> {
  // Remove leading dash (represents leading /)
  const parts = slug.replace(/^-/, '').split('-');
  let current = '/';

  let i = 0;
  while (i < parts.length) {
    // Try longest possible segment first (greedy)
    let matched = false;
    for (let end = parts.length; end > i; end--) {
      const candidate = parts.slice(i, end).join('-');
      const candidatePath = path.join(current, candidate);
      try {
        const stat = await fs.stat(candidatePath);
        if (stat.isDirectory()) {
          current = candidatePath;
          i = end;
          matched = true;
          break;
        }
      } catch {
        // doesn't exist, try shorter
      }
    }
    if (!matched) {
      // Can't resolve this slug to a real path
      return null;
    }
  }

  return current;
}

export async function GET() {
  try {
    const home = os.homedir();
    const knownPaths = new Set<string>();
    const projects: KnownProject[] = [];

    // 1. Read projects from ~/.claude.json (client state)
    try {
      const clientStatePath = path.join(home, '.claude.json');
      const content = await fs.readFile(clientStatePath, 'utf-8');
      const clientState = JSON.parse(content) as Record<string, unknown>;

      if (clientState.projects && typeof clientState.projects === 'object') {
        const projectsObj = clientState.projects as Record<string, Record<string, unknown>>;
        for (const [projectPath, config] of Object.entries(projectsObj)) {
          knownPaths.add(projectPath);
          projects.push({
            path: projectPath,
            lastActive: config?.lastActive as string | undefined,
          });
        }
      }
    } catch {
      // client state not readable
    }

    // 2. Discover projects from ~/.claude/projects/ directory
    // These contain session data and memory for projects Claude Code has been used in,
    // even if they aren't registered in ~/.claude.json (e.g. Conductor workspaces)
    try {
      const projectsDir = path.join(home, '.claude', 'projects');
      const entries = await fs.readdir(projectsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const projectPath = await slugToProjectPath(entry.name);
        if (!projectPath || knownPaths.has(projectPath)) continue;
        knownPaths.add(projectPath);
        projects.push({ path: projectPath });
      }
    } catch {
      // projects dir not readable
    }

    return NextResponse.json(projects);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
