'use client';

import type { McpServer } from '@/lib/types';

interface McpServersTabProps {
  servers: McpServer[];
  onSelectItem: (item: Record<string, unknown>) => void;
}

export default function McpServersTab({ servers, onSelectItem }: McpServersTabProps) {
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
          {items.map((server, i) => (
            <button
              key={`${server.name}-${i}`}
              onClick={() => onSelectItem(server as unknown as Record<string, unknown>)}
              className="w-full text-left bg-white border border-[#e5e5e5] rounded-lg p-4 hover:border-[#d4d4d4] transition-colors duration-150"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#1a1a1a]">{server.name}</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-gray-100 text-[#666]">
                      {server.type}
                    </span>
                  </div>
                  {server.url && (
                    <p className="text-xs font-mono text-[#999] mt-1 truncate">{server.url}</p>
                  )}
                  <p className="text-xs text-[#666] mt-1">Source: {server.source}</p>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase flex-shrink-0 ${
                    server.scope === 'global'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-green-50 text-green-600'
                  }`}
                >
                  {server.scope}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (servers.length === 0) {
    return (
      <div className="text-center py-12 text-[#999] text-sm">
        No MCP servers configured
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderGroup(globalServers, 'Global', 'text-blue-500')}
      {renderGroup(localServers, 'Local', 'text-green-500')}
    </div>
  );
}
