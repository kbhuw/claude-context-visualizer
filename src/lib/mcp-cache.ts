/**
 * Session-storage cache for MCP introspection results.
 * Keys are prefixed with "mcp:" followed by the server name.
 */

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
}

export interface McpCapabilities {
  tools: McpTool[];
  resources: McpResource[];
  prompts: McpPrompt[];
  error?: string;
}

const PREFIX = 'mcp:';

export function getCachedCapabilities(serverName: string): McpCapabilities | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PREFIX + serverName);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedCapabilities(serverName: string, caps: McpCapabilities): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(PREFIX + serverName, JSON.stringify(caps));
  } catch {
    // storage full — ignore
  }
}

export function getAllCachedServers(): Record<string, McpCapabilities> {
  if (typeof window === 'undefined') return {};
  const result: Record<string, McpCapabilities> = {};
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(PREFIX)) {
        const name = key.slice(PREFIX.length);
        const raw = sessionStorage.getItem(key);
        if (raw) result[name] = JSON.parse(raw);
      }
    }
  } catch {
    // ignore
  }
  return result;
}

export function clearMcpCache(): void {
  if (typeof window === 'undefined') return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(PREFIX)) keysToRemove.push(key);
  }
  keysToRemove.forEach(k => sessionStorage.removeItem(k));
}
