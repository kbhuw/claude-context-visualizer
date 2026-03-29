'use client';

import type { McpServer } from '@/lib/types';
import type { McpCapabilities } from '@/lib/mcp-cache';

interface McpServersTabProps {
  servers: McpServer[];
  onSelectItem: (item: Record<string, unknown>) => void;
  mcpCapabilities?: Record<string, McpCapabilities>;
  mcpLoading?: Set<string>;
}

export default function McpServersTab({ servers, onSelectItem, mcpCapabilities, mcpLoading }: McpServersTabProps) {
  const globalServers = servers.filter((s) => s.scope === 'global');
  const localServers = servers.filter((s) => s.scope === 'local');

  const renderGroup = (items: McpServer[], label: string, labelColor: string) => {
    if (items.length === 0) return null;
    return (
      <div>
        <div className={`text-[10px] font-semibold uppercase tracking-wider ${labelColor} mb-2`}>
          {label} ({items.length})
        </div>
        <div className="space-y-2">
          {items.map((server, i) => {
            const caps = mcpCapabilities?.[server.name];
            const isLoading = mcpLoading?.has(server.name);
            const hasError = caps?.error;
            const toolCount = caps?.tools.length ?? 0;
            const resourceCount = caps?.resources.length ?? 0;
            const promptCount = caps?.prompts.length ?? 0;

            return (
              <button
                key={`${server.name}-${i}`}
                onClick={() => onSelectItem(server as unknown as Record<string, unknown>)}
                className="w-full text-left bg-card border border-border rounded-lg p-4 hover:border-ring/50 transition-colors duration-150"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{server.name}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-secondary text-muted-foreground">
                        {server.type}
                      </span>
                      {/* Connection status indicator */}
                      {isLoading && (
                        <svg className="w-3 h-3 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      )}
                      {!isLoading && caps && !hasError && (
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Connected" />
                      )}
                      {!isLoading && hasError && (
                        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title={caps?.error} />
                      )}
                    </div>
                    {server.url && (
                      <p className="text-xs font-mono text-muted-foreground mt-1 truncate">{server.url}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Source: {server.source}</p>
                    {/* Show capability counts when available */}
                    {caps && !hasError && (toolCount > 0 || resourceCount > 0 || promptCount > 0) && (
                      <div className="flex items-center gap-2 mt-2">
                        {toolCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-foreground font-medium">
                            {toolCount} tool{toolCount !== 1 ? 's' : ''}
                          </span>
                        )}
                        {resourceCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-foreground font-medium">
                            {resourceCount} resource{resourceCount !== 1 ? 's' : ''}
                          </span>
                        )}
                        {promptCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-foreground font-medium">
                            {promptCount} prompt{promptCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase flex-shrink-0 ${
                      server.scope === 'global'
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-100'
                        : 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-100'
                    }`}
                  >
                    {server.scope === 'local' ? 'app' : server.scope}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (servers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No MCP servers configured
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderGroup(globalServers, 'Global', 'text-blue-500')}
      {renderGroup(localServers, 'App Level', 'text-green-500')}
    </div>
  );
}
