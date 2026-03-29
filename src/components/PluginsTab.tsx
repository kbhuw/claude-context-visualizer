'use client';

import type { Plugin } from '@/lib/types';

interface PluginsTabProps {
  plugins: Plugin[];
  onSelectItem: (item: Record<string, unknown>) => void;
}

export default function PluginsTab({ plugins, onSelectItem }: PluginsTabProps) {
  const globalPlugins = plugins.filter((p) => p.scope === 'global');
  const localPlugins = plugins.filter((p) => p.scope === 'local');

  const renderGroup = (items: Plugin[], label: string, labelColor: string) => {
    if (items.length === 0) return null;
    return (
      <div>
        <div className={`text-[10px] font-semibold uppercase tracking-wider ${labelColor} mb-2`}>
          {label} ({items.length})
        </div>
        <div className="space-y-2">
          {items.map((plugin, i) => {
            const contributionCount =
              plugin.mcpServers.length +
              plugin.skills.length +
              plugin.hooks.length +
              plugin.agents.length +
              plugin.commands.length;

            return (
              <button
                key={`${plugin.name}-${i}`}
                onClick={() => onSelectItem(plugin as unknown as Record<string, unknown>)}
                className="w-full text-left bg-card border border-border rounded-lg p-4 hover:border-ring/50 transition-colors duration-150"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{plugin.name}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-secondary text-muted-foreground">
                        v{plugin.version}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {contributionCount} contribution{contributionCount !== 1 ? 's' : ''}
                      {plugin.mcpServers.length > 0 && ` · ${plugin.mcpServers.length} MCP server${plugin.mcpServers.length !== 1 ? 's' : ''}`}
                      {plugin.skills.length > 0 && ` · ${plugin.skills.length} skill${plugin.skills.length !== 1 ? 's' : ''}`}
                      {plugin.hooks.length > 0 && ` · ${plugin.hooks.length} hook${plugin.hooks.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase flex-shrink-0 ${
                      plugin.scope === 'global'
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-100'
                        : 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-100'
                    }`}
                  >
                    {plugin.scope === 'local' ? 'app' : plugin.scope}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (plugins.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No plugins installed
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderGroup(globalPlugins, 'Global', 'text-blue-500')}
      {renderGroup(localPlugins, 'App Level', 'text-green-500')}
    </div>
  );
}
