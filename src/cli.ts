#!/usr/bin/env npx tsx
/**
 * CLI for Claude Context Visualizer
 *
 * Usage:
 *   npx tsx src/cli.ts [project-path] [options]
 *
 * Options:
 *   --project, -p <path>       Project path to scan (or pass as first positional arg)
 *   --custom, -c <path>        Custom source file(s) to include (repeatable)
 *   --pretty                   Pretty-print JSON output (default: compact)
 *   --section, -s <name>       Output only a specific section:
 *                                 sources, mcpServers, plugins, skills, hooks, commands,
 *                                 claudeMd, markdowns, summary
 *   --list-projects            List known Claude projects and exit
 *   --conductor-projects       List Conductor projects (repos, worktrees, main repos)
 *   --read-file <path>         Read a file and output its contents (JSON secrets masked)
 *   --introspect [--server <name>] [--all]  Introspect MCP servers
 *   --help, -h                 Show this help
 *
 * Examples:
 *   npx tsx src/cli.ts                              # Scan global context only
 *   npx tsx src/cli.ts /path/to/project             # Scan project + global
 *   npx tsx src/cli.ts -p /path -s skills           # Just list skills
 *   npx tsx src/cli.ts -p /path -s markdowns        # All discovered .md files
 *   npx tsx src/cli.ts --list-projects              # Known projects from ~/.claude.json
 *   npx tsx src/cli.ts --conductor-projects         # Conductor repos + worktrees
 *   npx tsx src/cli.ts --read-file /path/to/file    # Read a file
 *   npx tsx src/cli.ts --introspect --all           # Introspect all MCP servers
 *   npx tsx src/cli.ts -p /path -s summary          # Quick summary counts
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
  conductorProjects: boolean;
  readFile: string | null;
  introspect: boolean;
  introspectServer: string | null;
  introspectAll: boolean;
  dumpHooks: boolean;
  writeEnrichments: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    projectPath: null,
    customSources: [],
    pretty: false,
    section: null,
    listProjects: false,
    conductorProjects: false,
    readFile: null,
    introspect: false,
    introspectServer: null,
    introspectAll: false,
    dumpHooks: false,
    writeEnrichments: false,
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
    } else if (arg === '--conductor-projects') {
      args.conductorProjects = true;
    } else if (arg === '--read-file' && i + 1 < rawArgs.length) {
      i++;
      args.readFile = path.resolve(rawArgs[i]);
    } else if (arg === '--introspect') {
      args.introspect = true;
    } else if (arg === '--server' && i + 1 < rawArgs.length) {
      i++;
      args.introspectServer = rawArgs[i];
    } else if (arg === '--all') {
      args.introspectAll = true;
    } else if (arg === '--dump-hooks') {
      args.dumpHooks = true;
    } else if (arg === '--write-enrichments') {
      args.writeEnrichments = true;
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
  --project, -p <path>       Project path to scan
  --custom, -c <path>        Custom source file(s) to include (repeatable)
  --pretty                   Pretty-print JSON output (default: compact)
  --section, -s <name>       Output only a specific section:
                               sources, mcpServers, plugins, skills, hooks,
                               commands, claudeMd, markdowns, summary
  --list-projects            List known Claude projects from ~/.claude.json
  --conductor-projects       List Conductor projects (repos, worktrees, main repos)
  --read-file <path>         Read a file (JSON secrets masked)
  --introspect               Introspect MCP servers (use with --all or --server <name>)
  --help, -h                 Show this help

Sections:
  sources       All config source paths and whether they exist
  mcpServers    MCP servers from all sources
  plugins       Installed plugins with sub-resources
  skills        All skills (plugins, dirs, commands, built-in)
  hooks         All hooks with events, matchers, commands
  commands      All commands from global + project dirs
  claudeMd      Resolved CLAUDE.md with @includes expanded
  markdowns     All discovered .md files across project and global config
  summary       Quick counts of everything

Examples:
  npx tsx src/cli.ts                                 # Global context only
  npx tsx src/cli.ts /path/to/project                # Project + global context
  npx tsx src/cli.ts -p /path -s skills              # Just skills
  npx tsx src/cli.ts -p /path -s markdowns           # All .md files
  npx tsx src/cli.ts --list-projects                 # Known projects
  npx tsx src/cli.ts --conductor-projects            # Conductor repos + worktrees
  npx tsx src/cli.ts --conductor-projects --pretty   # Pretty-printed
  npx tsx src/cli.ts --read-file /path/to/file       # Read file contents
  npx tsx src/cli.ts --introspect --all              # Introspect all MCP servers
  npx tsx src/cli.ts --introspect --server nia       # Introspect one server
  npx tsx src/cli.ts -p /path -s summary --pretty    # Summary counts`;

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

/** Resolve main repo path from a worktree's .git file */
async function resolveMainRepo(worktreePath: string): Promise<string | null> {
  try {
    const gitPath = path.join(worktreePath, '.git');
    const stat = await fs.stat(gitPath);
    if (stat.isFile()) {
      const content = (await fs.readFile(gitPath, 'utf-8')).trim();
      const match = content.match(/^gitdir:\s*(.+)$/);
      if (match) {
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

interface ConductorProject {
  name: string;
  mainRepo: string | null;
  worktrees: { name: string; path: string }[];
}

async function discoverConductorProjects(indent?: number): Promise<void> {
  const home = os.homedir();
  const conductorDir = path.join(home, 'conductor');
  const projectMap = new Map<string, ConductorProject>();

  // Scan workspaces
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

          if (!proj.mainRepo) {
            const mainRepo = await resolveMainRepo(wtPath);
            if (mainRepo) proj.mainRepo = mainRepo;
          }
        }
      } catch {
        // skip
      }

      proj.worktrees.sort((a, b) => a.name.localeCompare(b.name));
      projectMap.set(projectName, proj);
    }
  } catch {
    // workspaces dir not readable
  }

  // Scan repos
  try {
    const reposDir = path.join(conductorDir, 'repos');
    const repoEntries = await fs.readdir(reposDir, { withFileTypes: true });
    for (const entry of repoEntries) {
      if (!entry.isDirectory()) continue;
      const repoPath = path.join(reposDir, entry.name);
      const existing = projectMap.get(entry.name);
      if (existing) {
        if (!existing.mainRepo) existing.mainRepo = repoPath;
      } else {
        projectMap.set(entry.name, { name: entry.name, mainRepo: repoPath, worktrees: [] });
      }
    }
  } catch {
    // repos dir not readable
  }

  const projects = [...projectMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  console.log(JSON.stringify({ conductorDir, projects }, null, indent));
}

/** Read a file with JSON secret masking */
async function readFileCommand(filePath: string, indent?: number): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    console.error(JSON.stringify({ error: 'File not found or unreadable', path: filePath }));
    process.exit(1);
  }

  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    let content = raw;
    let isJson = false;

    // Try to parse as JSON and mask secrets
    try {
      const parsed = JSON.parse(raw);
      const sensitivePattern = /token|key|secret|password|authorization/i;
      const maskSecrets = (obj: unknown): unknown => {
        if (typeof obj !== 'object' || obj === null) return obj;
        if (Array.isArray(obj)) return obj.map(maskSecrets);
        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          if (sensitivePattern.test(k) && typeof v === 'string') {
            result[k] = v.slice(0, 4) + '***';
          } else {
            result[k] = maskSecrets(v);
          }
        }
        return result;
      };
      content = JSON.stringify(maskSecrets(parsed), null, indent);
      isJson = true;
    } catch {
      // Not JSON, return raw
    }

    console.log(JSON.stringify({ path: filePath, content, isJson }, null, indent));
  } catch (err) {
    console.error(JSON.stringify({ error: 'Failed to read file', details: String(err) }));
    process.exit(1);
  }
}

/** Introspect MCP servers using the scanner to discover them first */
async function introspectServers(
  projectPath: string | null,
  serverName: string | null,
  all: boolean,
  indent?: number,
): Promise<void> {
  // Dynamically import the MCP SDK
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
  const { SSEClientTransport } = await import('@modelcontextprotocol/sdk/client/sse.js');
  const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');

  // Use the scanner to discover all configured MCP servers
  const context = await scanContext(projectPath, []);
  const servers = context.mcpServers;

  if (servers.length === 0) {
    console.error('No MCP servers found. Use -p <path> to scan a project.');
    process.exit(1);
  }

  // Filter
  let targets = servers;
  if (serverName) {
    targets = servers.filter(s => s.name === serverName);
    if (targets.length === 0) {
      console.error(`Server "${serverName}" not found. Available: ${servers.map(s => s.name).join(', ')}`);
      process.exit(1);
    }
  } else if (!all) {
    // Just list available servers
    const listing = servers.map(s => ({ name: s.name, scope: s.scope, source: s.source, type: s.type }));
    console.log(JSON.stringify(listing, null, indent));
    console.error('\nUse --introspect --server <name> or --introspect --all to introspect.');
    process.exit(0);
  }

  const results = [];
  for (const server of targets) {
    const cfg = server.config;
    const serverType = server.type || (cfg.command ? 'stdio' : cfg.url ? 'http' : 'unknown');
    let client: InstanceType<typeof Client> | null = null;

    try {
      client = new Client(
        { name: 'ccv-introspect', version: '1.0.0' },
        { capabilities: {} },
      );

      let transport: InstanceType<typeof StdioClientTransport> | InstanceType<typeof SSEClientTransport> | InstanceType<typeof StreamableHTTPClientTransport>;

      if (serverType === 'sse' && cfg.url) {
        transport = new SSEClientTransport(new URL(cfg.url as string));
      } else if ((serverType === 'http' || cfg.url) && cfg.url) {
        transport = new StreamableHTTPClientTransport(new URL(cfg.url as string));
      } else if (cfg.command) {
        transport = new StdioClientTransport({
          command: cfg.command as string,
          args: (cfg.args as string[]) || [],
          env: cfg.env ? { ...process.env, ...(cfg.env as Record<string, string>) } as Record<string, string> : undefined,
        });
      } else {
        results.push({ server: server.name, scope: server.scope, type: serverType, error: 'No command or URL configured', tools: [], resources: [], prompts: [] });
        continue;
      }

      process.stderr.write(`Connecting to ${server.name}...`);
      await client.connect(transport);
      process.stderr.write('\r\x1b[K');

      const [toolsResult, resourcesResult, promptsResult] = await Promise.allSettled([
        client.listTools().catch(() => ({ tools: [] })),
        client.listResources().catch(() => ({ resources: [] })),
        client.listPrompts().catch(() => ({ prompts: [] })),
      ]);

      results.push({
        server: server.name,
        scope: server.scope,
        source: server.source,
        type: serverType,
        tools: (toolsResult.status === 'fulfilled' ? toolsResult.value.tools : []) || [],
        resources: (resourcesResult.status === 'fulfilled' ? resourcesResult.value.resources : []) || [],
        prompts: (promptsResult.status === 'fulfilled' ? promptsResult.value.prompts : []) || [],
      });
    } catch (err) {
      process.stderr.write('\r\x1b[K');
      results.push({
        server: server.name,
        scope: server.scope,
        type: serverType,
        error: err instanceof Error ? err.message : String(err),
        tools: [],
        resources: [],
        prompts: [],
      });
    } finally {
      try { if (client) await client.close(); } catch { /* ignore */ }
    }
  }

  console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, indent));
}

async function main() {
  const args = parseArgs(process.argv);
  const indent = args.pretty ? 2 : undefined;

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.listProjects) {
    await listProjects();
    process.exit(0);
  }

  if (args.conductorProjects) {
    await discoverConductorProjects(indent);
    process.exit(0);
  }

  if (args.readFile) {
    await readFileCommand(args.readFile, indent);
    process.exit(0);
  }

  if (args.introspect) {
    await introspectServers(args.projectPath, args.introspectServer, args.introspectAll, indent);
    process.exit(0);
  }

  if (args.writeEnrichments) {
    const { mergeEnrichments } = await import('./lib/enrichment');
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    const input = Buffer.concat(chunks).toString('utf-8').trim();
    if (!input) {
      console.error('Error: no JSON provided on stdin');
      process.exit(1);
    }
    try {
      const incoming = JSON.parse(input);
      const merged = await mergeEnrichments(incoming);
      console.log(`Wrote ${Object.keys(incoming).length} enrichments (${Object.keys(merged).length} total)`);
      process.exit(0);
    } catch (err) {
      console.error('Error: invalid JSON on stdin', err);
      process.exit(1);
    }
  }

  if (args.dumpHooks) {
    const effectivePath = args.projectPath || process.cwd();
    const context = await scanContext(effectivePath, args.customSources);
    const { computeHookKey } = await import('./lib/enrichment');
    const dumpedHooks = await Promise.all(
      context.hooks.map(async (hook) => {
        let sourceCode: string | null = null;
        if (hook.sourcePath) {
          try {
            sourceCode = await fs.readFile(hook.sourcePath, 'utf-8');
          } catch {
            sourceCode = null;
          }
        }
        return {
          key: computeHookKey(hook.command, hook.event || hook.name, hook.matcher || ''),
          event: hook.event || hook.name,
          matcher: hook.matcher || '',
          command: hook.command,
          scope: hook.scope,
          source: hook.source,
          sourcePath: hook.sourcePath || null,
          sourceCode,
        };
      }),
    );
    console.log(JSON.stringify(dumpedHooks, null, 2));
    process.exit(0);
  }

  // Default: scan context
  const effectiveProjectPath = args.projectPath ?? process.cwd();
  const context = await scanContext(effectiveProjectPath, args.customSources);

  if (args.section) {
    const sectionMap: Record<string, string> = {
      sources: 'sources',
      mcpservers: 'mcpServers',
      plugins: 'plugins',
      skills: 'skills',
      hooks: 'hooks',
      commands: 'commands',
      claudemd: 'claudeMd',
      markdowns: 'markdownFiles',
      markdownfiles: 'markdownFiles',
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
        markdownFiles: context.markdownFiles.length,
        hasClaudeMd: context.claudeMd !== null,
      };
      console.log(JSON.stringify(summary, null, indent));
    } else if (section in context) {
      const value = (context as unknown as Record<string, unknown>)[section];
      console.log(JSON.stringify(value, null, indent));
    } else {
      console.error(`Unknown section: ${args.section}`);
      console.error('Valid sections: sources, mcpServers, plugins, skills, hooks, commands, claudeMd, markdowns, summary');
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
