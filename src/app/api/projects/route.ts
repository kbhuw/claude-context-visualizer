import { NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type { KnownProject, ConductorProject } from '@/lib/types';

/**
 * Reconstruct a filesystem path from a Claude projects slug.
 * Slugs replace '/' with '-', but directory names can also contain '-',
 * so we greedily resolve segments by checking what exists on disk.
 */
async function slugToProjectPath(slug: string): Promise<string | null> {
  const parts = slug.replace(/^-/, '').split('-');
  let current = '/';

  let i = 0;
  while (i < parts.length) {
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
    if (!matched) return null;
  }

  return current;
}

/**
 * Given a worktree directory, resolve its main repo path by reading the .git file.
 * Worktree .git files contain: gitdir: <main-repo>/.git/worktrees/<name>
 */
async function resolveMainRepo(worktreePath: string): Promise<string | null> {
  try {
    const gitPath = path.join(worktreePath, '.git');
    const stat = await fs.stat(gitPath);
    if (stat.isFile()) {
      const content = (await fs.readFile(gitPath, 'utf-8')).trim();
      const match = content.match(/^gitdir:\s*(.+)$/);
      if (match) {
        // e.g. /Users/kush/Documents/puffle/puffle-app/.git/worktrees/biarritz-v2
        // We want: /Users/kush/Documents/puffle/puffle-app
        const gitdir = match[1];
        const worktreesIdx = gitdir.indexOf('/.git/worktrees/');
        if (worktreesIdx !== -1) {
          return gitdir.substring(0, worktreesIdx);
        }
      }
    }
  } catch {
    // not a worktree or unreadable
  }
  return null;
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

    // 2. Discover from ~/.claude/projects/ directory
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

    // 3. Discover Conductor projects: group by project name with main repo + worktrees
    const conductorDir = path.join(home, 'conductor');
    const conductorProjects: ConductorProject[] = [];
    const projectMap = new Map<string, ConductorProject>();

    // 3a. Scan ~/conductor/workspaces/<project>/<worktree> and resolve main repos
    try {
      const wsDir = path.join(conductorDir, 'workspaces');
      const wsEntries = await fs.readdir(wsDir, { withFileTypes: true });
      for (const wsEntry of wsEntries) {
        if (!wsEntry.isDirectory()) continue;
        const projectName = wsEntry.name;
        const proj: ConductorProject = { name: projectName, mainRepo: null, worktrees: [] };

        try {
          const worktrees = await fs.readdir(path.join(wsDir, projectName), { withFileTypes: true });
          for (const wt of worktrees) {
            if (!wt.isDirectory()) continue;
            const wtPath = path.join(wsDir, projectName, wt.name);
            proj.worktrees.push({ name: wt.name, path: wtPath });

            // Try to resolve main repo from this worktree's .git pointer
            if (!proj.mainRepo) {
              const mainRepo = await resolveMainRepo(wtPath);
              if (mainRepo) proj.mainRepo = mainRepo;
            }
          }
        } catch {
          // worktree dir not readable
        }

        // Sort worktrees alphabetically
        proj.worktrees.sort((a, b) => a.name.localeCompare(b.name));
        projectMap.set(projectName, proj);
      }
    } catch {
      // workspaces dir not readable
    }

    // 3b. Also check ~/conductor/repos/ — if a project doesn't have a mainRepo yet,
    //     or if a repo exists here but has no worktrees, include it
    try {
      const reposDir = path.join(conductorDir, 'repos');
      const repoEntries = await fs.readdir(reposDir, { withFileTypes: true });
      for (const entry of repoEntries) {
        if (!entry.isDirectory()) continue;
        const repoPath = path.join(reposDir, entry.name);
        const existing = projectMap.get(entry.name);
        if (existing) {
          // Prefer conductor/repos/ as main repo if worktree resolution didn't find one,
          // or if it already points here
          if (!existing.mainRepo) existing.mainRepo = repoPath;
        } else {
          // Repo with no worktrees
          projectMap.set(entry.name, { name: entry.name, mainRepo: repoPath, worktrees: [] });
        }
      }
    } catch {
      // repos dir not readable
    }

    // Sort projects alphabetically
    for (const proj of [...projectMap.values()].sort((a, b) => a.name.localeCompare(b.name))) {
      conductorProjects.push(proj);
    }

    return NextResponse.json({ projects, conductorProjects, conductorDir });
  } catch {
    return NextResponse.json({ projects: [], conductorProjects: [], conductorDir: null }, { status: 200 });
  }
}
