#!/usr/bin/env npx tsx
/**
 * CLI tool to introspect MCP servers and discover their tools, resources, and prompts.
 *
 * Usage:
 *   npx tsx src/cli/mcp-introspect.ts [options]
 *
 * Options:
 *   --server <name>       Introspect a specific server by name from your config
 *   --all                 Introspect all configured servers
 *   --command <cmd>       Introspect a stdio server by command (e.g. "npx -y @modelcontextprotocol/server-memory")
 *   --url <url>           Introspect an HTTP/SSE server by URL
 *   --type <type>         Server type: stdio | http | sse (default: auto-detect)
 *   --header <key:value>  Add a header (can be repeated)
 *   --json                Output raw JSON
 *   --tools-only          Only show tools
 *   --project <path>      Project path for local .mcp.json servers
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
}

interface IntrospectResult {
  server: string;
  type: string;
  tools: McpTool[];
  resources: McpResource[];
  prompts: McpPrompt[];
  error?: string;
}

interface ServerConfig {
  type?: string;
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
  env?: Record<string, string>;
}

// ── Load configured servers from ~/.claude.json and project .mcp.json ──

async function loadConfiguredServers(projectPath?: string): Promise<Record<string, ServerConfig>> {
  const servers: Record<string, ServerConfig> = {};

  // Global servers from ~/.claude.json
  try {
    const clientState = JSON.parse(
      await fs.readFile(path.join(os.homedir(), '.claude.json'), 'utf-8'),
    );
    if (clientState.mcpServers) {
      for (const [name, cfg] of Object.entries(clientState.mcpServers)) {
        servers[name] = cfg as ServerConfig;
      }
    }
    // Project-specific servers from ~/.claude.json
    if (projectPath && clientState.projects?.[projectPath]?.mcpServers) {
      for (const [name, cfg] of Object.entries(
        clientState.projects[projectPath].mcpServers as Record<string, unknown>,
      )) {
        servers[name] = cfg as ServerConfig;
      }
    }
  } catch {
    // no global config
  }

  // Local .mcp.json
  if (projectPath) {
    try {
      const mcpJson = JSON.parse(
        await fs.readFile(path.join(projectPath, '.mcp.json'), 'utf-8'),
      );
      const serversObj = mcpJson.mcpServers || mcpJson;
      for (const [name, cfg] of Object.entries(serversObj)) {
        if (name === 'mcpServers' || typeof cfg !== 'object' || cfg === null) continue;
        servers[name] = cfg as ServerConfig;
      }
    } catch {
      // no local config
    }
  }

  return servers;
}

// ── Connect and introspect a single server ──

async function introspectServer(
  name: string,
  config: ServerConfig,
): Promise<IntrospectResult> {
  let client: Client | null = null;
  const serverType = config.type || (config.command ? 'stdio' : config.url ? 'http' : 'unknown');

  try {
    client = new Client(
      { name: 'mcp-introspect-cli', version: '1.0.0' },
      { capabilities: {} },
    );

    let transport: StdioClientTransport | SSEClientTransport | StreamableHTTPClientTransport;

    if (serverType === 'sse' && config.url) {
      transport = new SSEClientTransport(new URL(config.url), {
        requestInit: config.headers ? { headers: config.headers } : undefined,
      });
    } else if ((serverType === 'http' || config.url) && config.url) {
      transport = new StreamableHTTPClientTransport(new URL(config.url), {
        requestInit: config.headers ? { headers: config.headers } : undefined,
      });
    } else if (config.command) {
      transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env: config.env ? { ...process.env, ...config.env } as Record<string, string> : undefined,
      });
    } else {
      return { server: name, type: serverType, tools: [], resources: [], prompts: [], error: 'No command or URL configured' };
    }

    await client.connect(transport);

    const [toolsResult, resourcesResult, promptsResult] = await Promise.allSettled([
      client.listTools().catch(() => ({ tools: [] })),
      client.listResources().catch(() => ({ resources: [] })),
      client.listPrompts().catch(() => ({ prompts: [] })),
    ]);

    const tools = (toolsResult.status === 'fulfilled' ? toolsResult.value.tools : []) || [];
    const resources = (resourcesResult.status === 'fulfilled' ? resourcesResult.value.resources : []) || [];
    const prompts = (promptsResult.status === 'fulfilled' ? promptsResult.value.prompts : []) || [];

    return {
      server: name,
      type: serverType,
      tools: tools.map((t: Record<string, unknown>) => ({
        name: t.name as string,
        description: t.description as string | undefined,
        inputSchema: t.inputSchema as Record<string, unknown> | undefined,
      })),
      resources: resources.map((r: Record<string, unknown>) => ({
        uri: r.uri as string,
        name: r.name as string,
        description: r.description as string | undefined,
        mimeType: r.mimeType as string | undefined,
      })),
      prompts: prompts.map((p: Record<string, unknown>) => ({
        name: p.name as string,
        description: p.description as string | undefined,
        arguments: p.arguments as Array<{ name: string; description?: string; required?: boolean }> | undefined,
      })),
    };
  } catch (err) {
    return {
      server: name,
      type: serverType,
      tools: [],
      resources: [],
      prompts: [],
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    try {
      if (client) await client.close();
    } catch {
      // ignore
    }
  }
}

// ── Pretty printing ──

function printResult(result: IntrospectResult, toolsOnly: boolean) {
  const dim = '\x1b[2m';
  const bold = '\x1b[1m';
  const cyan = '\x1b[36m';
  const green = '\x1b[32m';
  const yellow = '\x1b[33m';
  const red = '\x1b[31m';
  const reset = '\x1b[0m';

  console.log(`\n${bold}${cyan}═══ ${result.server}${reset} ${dim}(${result.type})${reset}`);

  if (result.error) {
    console.log(`  ${red}Error: ${result.error}${reset}`);
    return;
  }

  const counts = [];
  if (result.tools.length) counts.push(`${result.tools.length} tools`);
  if (result.resources.length) counts.push(`${result.resources.length} resources`);
  if (result.prompts.length) counts.push(`${result.prompts.length} prompts`);
  if (counts.length === 0) {
    console.log(`  ${dim}No tools, resources, or prompts exposed${reset}`);
    return;
  }
  console.log(`  ${dim}${counts.join(' · ')}${reset}`);

  // Tools
  if (result.tools.length > 0) {
    console.log(`\n  ${bold}${green}Tools${reset}`);
    for (const tool of result.tools) {
      console.log(`  ${green}●${reset} ${bold}${tool.name}${reset}`);
      if (tool.description) {
        console.log(`    ${dim}${tool.description}${reset}`);
      }
      if (tool.inputSchema?.properties) {
        const props = tool.inputSchema.properties as Record<string, Record<string, unknown>>;
        const required = (tool.inputSchema.required as string[]) || [];
        const params = Object.entries(props).map(([name, schema]) => {
          const req = required.includes(name) ? '*' : '';
          const type = schema.type || '';
          return `${name}${req}${type ? `:${type}` : ''}`;
        });
        console.log(`    ${dim}params: ${params.join(', ')}${reset}`);
      }
    }
  }

  if (toolsOnly) return;

  // Resources
  if (result.resources.length > 0) {
    console.log(`\n  ${bold}${yellow}Resources${reset}`);
    for (const resource of result.resources) {
      console.log(`  ${yellow}●${reset} ${bold}${resource.name}${reset} ${dim}${resource.uri}${reset}`);
      if (resource.mimeType) console.log(`    ${dim}${resource.mimeType}${reset}`);
      if (resource.description) console.log(`    ${dim}${resource.description}${reset}`);
    }
  }

  // Prompts
  if (result.prompts.length > 0) {
    console.log(`\n  ${bold}${cyan}Prompts${reset}`);
    for (const prompt of result.prompts) {
      console.log(`  ${cyan}●${reset} ${bold}${prompt.name}${reset}`);
      if (prompt.description) console.log(`    ${dim}${prompt.description}${reset}`);
      if (prompt.arguments?.length) {
        const args = prompt.arguments.map(a => `${a.name}${a.required ? '*' : ''}`);
        console.log(`    ${dim}args: ${args.join(', ')}${reset}`);
      }
    }
  }
}

// ── Main ──

async function main() {
  const args = process.argv.slice(2);

  let serverName: string | null = null;
  let all = false;
  let command: string | null = null;
  let url: string | null = null;
  let type: string | null = null;
  const headers: Record<string, string> = {};
  let jsonOutput = false;
  let toolsOnly = false;
  let projectPath: string | null = null;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--server': case '-s':
        serverName = args[++i];
        break;
      case '--all': case '-a':
        all = true;
        break;
      case '--command': case '-c':
        command = args[++i];
        break;
      case '--url': case '-u':
        url = args[++i];
        break;
      case '--type': case '-t':
        type = args[++i];
        break;
      case '--header': case '-H':
        const [key, ...rest] = args[++i].split(':');
        headers[key.trim()] = rest.join(':').trim();
        break;
      case '--json':
        jsonOutput = true;
        break;
      case '--tools-only':
        toolsOnly = true;
        break;
      case '--project': case '-p':
        projectPath = args[++i];
        break;
      case '--help': case '-h':
        console.log(`Usage: npx tsx src/cli/mcp-introspect.ts [options]

Options:
  -s, --server <name>       Introspect a named server from config
  -a, --all                 Introspect all configured servers
  -c, --command <cmd>       Introspect a stdio server by command
  -u, --url <url>           Introspect an HTTP/SSE server by URL
  -t, --type <type>         Server type: stdio | http | sse
  -H, --header <key:value>  Add a header (repeatable)
  -p, --project <path>      Project path for local .mcp.json
      --json                Output raw JSON
      --tools-only          Only show tools
  -h, --help                Show this help

Examples:
  # Introspect all configured servers
  npx tsx src/cli/mcp-introspect.ts --all

  # Introspect a specific configured server
  npx tsx src/cli/mcp-introspect.ts --server nia

  # Introspect an ad-hoc stdio server
  npx tsx src/cli/mcp-introspect.ts --command "npx -y @modelcontextprotocol/server-memory"

  # Introspect an HTTP server with auth
  npx tsx src/cli/mcp-introspect.ts --url https://example.com/mcp --header "Authorization:Bearer token123"

  # JSON output for scripting
  npx tsx src/cli/mcp-introspect.ts --all --json`);
        process.exit(0);
    }
  }

  // Ad-hoc server from --command or --url
  if (command || url) {
    const config: ServerConfig = {};
    if (command) {
      const parts = command.split(/\s+/);
      config.command = parts[0];
      config.args = parts.slice(1);
      config.type = type || 'stdio';
    }
    if (url) {
      config.url = url;
      config.type = type || 'http';
    }
    if (Object.keys(headers).length > 0) {
      config.headers = headers;
    }

    const name = serverName || (command ? command.split(/\s+/)[0] : url!);
    const result = await introspectServer(name, config);

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printResult(result, toolsOnly);
    }
    process.exit(result.error ? 1 : 0);
  }

  // Load configured servers
  const configured = await loadConfiguredServers(projectPath || process.cwd());

  if (Object.keys(configured).length === 0) {
    console.error('No MCP servers found in config. Use --command or --url to introspect an ad-hoc server.');
    process.exit(1);
  }

  // Filter to specific server or all
  let targets: Record<string, ServerConfig>;
  if (serverName) {
    if (!configured[serverName]) {
      console.error(`Server "${serverName}" not found. Available: ${Object.keys(configured).join(', ')}`);
      process.exit(1);
    }
    targets = { [serverName]: configured[serverName] };
  } else if (all) {
    targets = configured;
  } else {
    // Default: list available servers
    console.log('Configured MCP servers:');
    for (const [name, cfg] of Object.entries(configured)) {
      const t = cfg.type || (cfg.command ? 'stdio' : cfg.url ? 'http' : '?');
      console.log(`  ${name} (${t})`);
    }
    console.log('\nUse --server <name> or --all to introspect.');
    process.exit(0);
  }

  const results: IntrospectResult[] = [];
  for (const [name, config] of Object.entries(targets)) {
    if (!jsonOutput) {
      process.stdout.write(`Connecting to ${name}...`);
    }
    const result = await introspectServer(name, config);
    results.push(result);
    if (!jsonOutput) {
      process.stdout.write('\r\x1b[K'); // clear line
      printResult(result, toolsOnly);
    }
  }

  if (jsonOutput) {
    console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2));
  }

  console.log('');
  process.exit(results.some(r => r.error) ? 1 : 0);
}

main();
