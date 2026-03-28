'use client';

import type { Plugin } from '@/lib/types';

interface PluginsTabProps {
  plugins: Plugin[];
  onSelectItem: (item: Record<string, unknown>) => void;
  onSelectSubItem?: (type: string, name: string) => void;
}

function PillTag({
  label,
  color,
  onClick,
}: {
  label: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full transition-opacity duration-150 hover:opacity-80 ${color}`}
    >
      {label}
    </button>
  );
}

function PluginCard({
  plugin,
  onSelectItem,
  onSelectSubItem,
}: {
  plugin: Plugin;
  onSelectItem: (item: Record<string, unknown>) => void;
  onSelectSubItem?: (type: string, name: string) => void;
}) {
  const initials = plugin.name
    .split(/[-_\s]/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const subSections = [
    { label: 'Skills', items: plugin.skills, color: 'bg-pink-50 text-pink-600', type: 'skill' },
    { label: 'Hooks', items: plugin.hooks, color: 'bg-amber-50 text-amber-600', type: 'hook' },
    { label: 'Agents', items: plugin.agents, color: 'bg-indigo-50 text-indigo-600', type: 'agent' },
    { label: 'Commands', items: plugin.commands, color: 'bg-cyan-50 text-cyan-600', type: 'command' },
    { label: 'MCP Servers', items: plugin.mcpServers, color: 'bg-green-50 text-green-600', type: 'mcpServer' },
  ];

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => onSelectItem(plugin as unknown as Record<string, unknown>)}
        className="w-full text-left p-4 hover:bg-accent transition-colors duration-150"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{plugin.name}</h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-secondary text-muted-foreground">
                v{plugin.version}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                  plugin.scope === 'global'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-100'
                    : 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-100'
                }`}
              >
                {plugin.scope}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{plugin.marketplace}</p>
          </div>
        </div>
      </button>

      <div className="px-4 pb-4 space-y-3">
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div><span className="text-foreground font-medium">Install path:</span> {plugin.installPath || 'N/A'}</div>
        </div>
        {subSections
          .filter((s) => s.items.length > 0)
          .map((section) => (
            <div key={section.label}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {section.label}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {section.items.map((item) => (
                  <PillTag
                    key={item}
                    label={item}
                    color={section.color}
                    onClick={() => onSelectSubItem?.(section.type, item)}
                  />
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default function PluginsTab({ plugins, onSelectItem, onSelectSubItem }: PluginsTabProps) {
  if (plugins.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No plugins installed
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {plugins.map((plugin, i) => (
        <PluginCard
          key={`${plugin.name}-${i}`}
          plugin={plugin}
          onSelectItem={onSelectItem}
          onSelectSubItem={onSelectSubItem}
        />
      ))}
    </div>
  );
}
