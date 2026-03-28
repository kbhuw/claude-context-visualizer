#!/usr/bin/env npx tsx
/**
 * CLI for Claude Context Visualizer
 *
 * Usage:
 *   npx tsx src/cli.ts [project-path] [options]
 *
 * Options:
 *   --project, -p <path>    Project path to scan (or pass as first positional arg)
 *   --custom, -c <path>     Custom source file(s) to include (repeatable)
 *   --pretty                 Pretty-print JSON output (default: compact)
 *   --section, -s <name>    Output only a specific section:
 *                              sources, mcpServers, plugins, skills, hooks, claudeMd, summary
 *   --list-projects          List known Claude projects and exit
 *   --help, -h               Show this help
 *
 * Examples:
 *   npx tsx src/cli.ts                          # Scan global context only
 *   npx tsx src/cli.ts /path/to/project         # Scan project + global
 *   npx tsx src/cli.ts -p /path -s skills       # Just list skills
 *   npx tsx src/cli.ts --list-projects           # List known projects
 *   npx tsx src/cli.ts -p /path -s summary       # Quick summary counts
 */

import { scanContext } from './lib/scanner';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

interface CliArgs {
  projectPath: string | null;
  customSources: string[];
  pretty: boolean;
  section: string | null;
  listProjects: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    projectPath: null,
    customSources: [],
    pretty: false,
    section: null,
    listProjects: false,
    help: false,
  };

  const rawArgs = argv.slice(2);
  let i = 0;

  while (i < rawArgs.length) {
    const arg = rawArgs[i];

    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--pretty') {
      args.pretty = true;
    } else if (arg === '--list-projects') {
      args.listProjects = true;
    } else if ((arg === '--project' || arg === '-p') && i + 1 < rawArgs.length) {
      i++;
      args.projectPath = path.resolve(rawArgs[i]);
    } else if ((arg === '--custom' || arg === '-c') && i + 1 < rawArgs.length) {
      i++;
      args.customSources.push(path.resolve(rawArgs[i]));
    } else if ((arg === '--section' || arg === '-s') && i + 1 < rawArgs.length) {
      i++;
      args.section = rawArgs[i];
    } else if (!arg.startsWith('-') && !args.projectPath) {
      args.projectPath = path.resolve(arg);
    }

    i++;
  }

  return args;
}

function printHelp() {
  const help = `Claude Context Visualizer CLI

Usage:
  npx tsx src/cli.ts [project-path] [options]

Options:
  --project, -p <path>    Project path to scan
  --custom, -c <path>     Custom source file(s) to include (repeatable)
  --pretty                Pretty-print JSON output (default: compact)
  --section, -s <name>    Output only a specific section:
                            sources, mcpServers, plugins, skills, hooks, claudeMd, summary
  --list-projects         List known Claude projects and exit
  --help, -h              Show this help

Examples:
  npx tsx src/cli.ts                              # Global context only
  npx tsx src/cli.ts /path/to/project             # Project + global context
  npx tsx src/cli.ts -p /path/to/project -s skills  # Just skills
  npx tsx src/cli.ts --list-projects              # Known projects
  npx tsx src/cli.ts -p /path -s summary          # Summary counts`;

  console.log(help);
}

async function listProjects(): Promise<void> {
  const clientStatePath = path.join(os.homedir(), '.claude.json');
  try {
    const raw = await fs.readFile(clientStatePath, 'utf-8');
    const data = JSON.parse(raw);
    const projects: Array<{ path: string; lastActive?: string }> = [];

    if (data.projects && typeof data.projects === 'object') {
      for (const [projPath, projData] of Object.entries(data.projects)) {
        const pd = projData as Record<string, unknown>;
        projects.push({
          path: projPath,
          lastActive: pd.lastActive as string | undefined,
        });
      }
    }

    // Sort by lastActive descending
    projects.sort((a, b) => {
      if (!a.lastActive) return 1;
      if (!b.lastActive) return -1;
      return b.lastActive.localeCompare(a.lastActive);
    });

    console.log(JSON.stringify(projects, null, 2));
  } catch {
    console.log(JSON.stringify([]));
  }
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.listProjects) {
    await listProjects();
    process.exit(0);
  }

  const context = await scanContext(args.projectPath, args.customSources);
  const indent = args.pretty ? 2 : undefined;

  if (args.section) {
    // Normalize section name: allow case-insensitive matching
    const sectionMap: Record<string, string> = {
      sources: 'sources',
      mcpservers: 'mcpServers',
      plugins: 'plugins',
      skills: 'skills',
      hooks: 'hooks',
      commands: 'commands',
      claudemd: 'claudeMd',
      summary: 'summary',
    };
    const section = sectionMap[args.section.toLowerCase()] || args.section;

    if (section === 'summary') {
      const summary = {
        projectPath: context.projectPath,
        sourcesFound: context.sources.filter(s => s.found).length,
        sourcesTotal: context.sources.length,
        mcpServers: context.mcpServers.length,
        plugins: context.plugins.length,
        skills: context.skills.length,
        hooks: context.hooks.length,
        commands: context.commands.length,
        hasClaudeMd: context.claudeMd !== null,
      };
      console.log(JSON.stringify(summary, null, indent));
    } else if (section in context) {
      const value = (context as unknown as Record<string, unknown>)[section];
      console.log(JSON.stringify(value, null, indent));
    } else {
      console.error(`Unknown section: ${args.section}`);
      console.error('Valid sections: sources, mcpServers, plugins, skills, hooks, commands, claudeMd, summary');
      process.exit(1);
    }
  } else {
    console.log(JSON.stringify(context, null, indent));
  }
}

main().catch(err => {
  console.error(JSON.stringify({ error: String(err) }));
  process.exit(1);
});
