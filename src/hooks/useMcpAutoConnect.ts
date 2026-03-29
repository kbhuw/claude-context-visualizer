'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { McpServer } from '@/lib/types';
import {
  getCachedCapabilities,
  setCachedCapabilities,
  type McpCapabilities,
} from '@/lib/mcp-cache';

const EMPTY_CAPS: Record<string, McpCapabilities> = {};
const EMPTY_LOADING: Set<string> = new Set();

interface McpConnectionStatus {
  /** Map of server name → capabilities (from cache or fresh fetch) */
  capabilities: Record<string, McpCapabilities>;
  /** Set of server names currently being introspected */
  loading: Set<string>;
  /** Whether any server is still loading */
  isLoading: boolean;
  /** Re-introspect a specific server (bypasses cache) */
  refresh: (serverName: string, server: McpServer) => Promise<void>;
}

async function introspectOne(server: McpServer): Promise<McpCapabilities> {
  try {
    const res = await fetch('/api/mcp-introspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: server.config,
        type: server.type || 'stdio',
      }),
    });
    return await res.json();
  } catch (err) {
    return {
      tools: [],
      resources: [],
      prompts: [],
      error: err instanceof Error ? err.message : 'Failed to connect',
    };
  }
}

/**
 * Auto-connects to all MCP servers when the list changes.
 * Results are cached in sessionStorage so they survive tab switches.
 */
export function useMcpAutoConnect(servers: McpServer[]): McpConnectionStatus {
  const [capabilities, setCapabilities] = useState<Record<string, McpCapabilities>>(EMPTY_CAPS);
  const [loading, setLoading] = useState<Set<string>>(EMPTY_LOADING);
  const abortRef = useRef(0); // generation counter to discard stale updates

  // Stabilise the dependency – only re-run when server names actually change
  const serverKey = useMemo(() => servers.map(s => s.name).sort().join('\0'), [servers]);

  useEffect(() => {
    if (!servers.length) {
      setCapabilities(prev => (Object.keys(prev).length === 0 ? prev : EMPTY_CAPS));
      setLoading(prev => (prev.size === 0 ? prev : EMPTY_LOADING));
      return;
    }

    const generation = ++abortRef.current;
    const initial: Record<string, McpCapabilities> = {};
    const toFetch: McpServer[] = [];

    // Check cache first
    for (const server of servers) {
      const cached = getCachedCapabilities(server.name);
      if (cached) {
        initial[server.name] = cached;
      } else {
        toFetch.push(server);
      }
    }

    setCapabilities(initial);

    if (toFetch.length === 0) {
      setLoading(prev => (prev.size === 0 ? prev : EMPTY_LOADING));
      return;
    }

    setLoading(new Set(toFetch.map(s => s.name)));

    // Introspect uncached servers in parallel
    for (const server of toFetch) {
      introspectOne(server).then(caps => {
        if (abortRef.current !== generation) return; // stale
        setCachedCapabilities(server.name, caps);
        setCapabilities(prev => ({ ...prev, [server.name]: caps }));
        setLoading(prev => {
          const next = new Set(prev);
          next.delete(server.name);
          return next;
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey]);

  const refresh = useCallback(async (serverName: string, server: McpServer) => {
    setLoading(prev => new Set(prev).add(serverName));
    const caps = await introspectOne(server);
    setCachedCapabilities(serverName, caps);
    setCapabilities(prev => ({ ...prev, [serverName]: caps }));
    setLoading(prev => {
      const next = new Set(prev);
      next.delete(serverName);
      return next;
    });
  }, []);

  return {
    capabilities,
    loading,
    isLoading: loading.size > 0,
    refresh,
  };
}
