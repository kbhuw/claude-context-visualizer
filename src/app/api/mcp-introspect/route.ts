import { NextRequest, NextResponse } from 'next/server';
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
  tools: McpTool[];
  resources: McpResource[];
  prompts: McpPrompt[];
  error?: string;
}

type Transport = StdioClientTransport | SSEClientTransport | StreamableHTTPClientTransport;

async function tryConnect(config: Record<string, unknown>, serverType: string): Promise<{ client: Client; transport: Transport }> {
  const headers = config?.headers as Record<string, string> | undefined;

  // For URL-based servers, try HTTP first then SSE
  if (config?.url) {
    const url = new URL(config.url as string);
    const requestInit = headers ? { headers } : undefined;

    // Determine order based on declared type
    const tryOrder: Array<'http' | 'sse'> =
      serverType === 'sse' ? ['sse', 'http'] : ['http', 'sse'];

    let lastError: Error | null = null;
    for (const method of tryOrder) {
      const client = new Client(
        { name: 'context-visualizer', version: '1.0.0' },
        { capabilities: {} },
      );
      let transport: Transport;
      try {
        if (method === 'http') {
          transport = new StreamableHTTPClientTransport(url, { requestInit });
        } else {
          transport = new SSEClientTransport(url, { requestInit });
        }
        await client.connect(transport);
        return { client, transport };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        try { await client.close(); } catch { /* ignore */ }
      }
    }
    throw lastError || new Error('Failed to connect via HTTP and SSE');
  }

  // Stdio servers
  if (config?.command) {
    const command = config.command as string;
    const args = (config.args as string[]) || [];
    const env = config.env as Record<string, string> | undefined;

    const client = new Client(
      { name: 'context-visualizer', version: '1.0.0' },
      { capabilities: {} },
    );
    const transport = new StdioClientTransport({
      command,
      args,
      env: env ? { ...process.env, ...env } as Record<string, string> : undefined,
    });
    await client.connect(transport);
    return { client, transport };
  }

  throw new Error('Cannot connect: no command or URL configured');
}

export async function POST(request: NextRequest): Promise<NextResponse<IntrospectResult>> {
  let client: Client | null = null;

  try {
    const body = await request.json();
    const config = body.config as Record<string, unknown>;
    const serverType = (body.type as string) || (config?.type as string) || 'stdio';

    const connection = await tryConnect(config, serverType);
    client = connection.client;

    const [toolsResult, resourcesResult, promptsResult] = await Promise.allSettled([
      client.listTools().catch(() => ({ tools: [] })),
      client.listResources().catch(() => ({ resources: [] })),
      client.listPrompts().catch(() => ({ prompts: [] })),
    ]);

    const tools = toolsResult.status === 'fulfilled' ? (toolsResult.value.tools || []) : [];
    const resources = resourcesResult.status === 'fulfilled' ? (resourcesResult.value.resources || []) : [];
    const prompts = promptsResult.status === 'fulfilled' ? (promptsResult.value.prompts || []) : [];

    // Collect partial errors from list operations
    const listErrors: string[] = [];
    if (toolsResult.status === 'rejected') listErrors.push(`Tools: ${toolsResult.reason}`);
    if (resourcesResult.status === 'rejected') listErrors.push(`Resources: ${resourcesResult.reason}`);
    if (promptsResult.status === 'rejected') listErrors.push(`Prompts: ${promptsResult.reason}`);

    return NextResponse.json({
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
      ...(listErrors.length > 0 ? { error: listErrors.join('; ') } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      tools: [],
      resources: [],
      prompts: [],
      error: message,
    });
  } finally {
    try {
      if (client) await client.close();
    } catch {
      // ignore cleanup errors
    }
  }
}
