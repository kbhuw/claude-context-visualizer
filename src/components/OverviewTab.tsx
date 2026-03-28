'use client';

import type { McpServer, Plugin, Skill, Hook } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface OverviewTabProps {
  mcpServers: McpServer[];
  plugins: Plugin[];
  skills: Skill[];
  hooks: Hook[];
  onSelectItem: (type: string, item: Record<string, unknown>) => void;
}

const sourceColors: Record<string, string> = {
  'Global Settings': 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-100',
  'Client State': 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-100',
  'Plugin': 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-100',
  'MCP Config': 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-100',
  'Skills Dir': 'bg-pink-50 text-pink-600 dark:bg-pink-950 dark:text-pink-100',
  'Custom': 'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-100',
};

function getSourceBadgeClass(source: string): string {
  for (const [key, cls] of Object.entries(sourceColors)) {
    if (source.toLowerCase().includes(key.toLowerCase())) return cls;
  }
  return 'bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-100';
}

interface CardSection {
  title: string;
  color: string;
  dotColor: string;
  items: { name: string; scope: 'global' | 'local' | 'custom'; source: string; raw: Record<string, unknown> }[];
  type: string;
}

function OverviewCard({
  section,
  onSelectItem,
}: {
  section: CardSection;
  onSelectItem: (type: string, item: Record<string, unknown>) => void;
}) {
  const globalItems = section.items.filter((i) => i.scope === 'global');
  const localItems = section.items.filter((i) => i.scope === 'local');
  const customItems = section.items.filter((i) => i.scope === 'custom');

  const renderItems = (items: typeof section.items, label: string, labelColor: string) => {
    if (items.length === 0) return null;

    return (
      <div>
        <div className={`text-[10px] font-semibold uppercase tracking-wider ${labelColor} mb-1.5`}>
          {label}
        </div>
        <div className="space-y-1">
          {items.map((item, i) => (
            <button
              key={`${item.name}-${i}`}
              onClick={() => onSelectItem(section.type, item.raw)}
              className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors duration-150 text-left"
            >
              <span className="text-foreground truncate">{item.name}</span>
              <Badge className={`flex-shrink-0 ${getSourceBadgeClass(item.source)}`}>
                {item.source}
              </Badge>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${section.dotColor}`} />
        <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
        <span className="text-xs text-muted-foreground">{section.items.length}</span>
      </div>
      <div className="space-y-3 max-h-72 overflow-y-auto">
        {renderItems(globalItems, 'Global', 'text-blue-500')}
        {renderItems(localItems, 'App Level', 'text-green-500')}
        {renderItems(customItems, 'Custom', 'text-orange-500')}
        {section.items.length === 0 && (
          <p className="text-xs text-muted-foreground italic">None configured</p>
        )}
      </div>
    </div>
  );
}

export default function OverviewTab({
  mcpServers,
  plugins,
  skills,
  hooks,
  onSelectItem,
}: OverviewTabProps) {
  const sections: CardSection[] = [
    {
      title: 'MCP Servers',
      color: 'blue',
      dotColor: 'bg-blue-500',
      type: 'mcpServer',
      items: mcpServers.map((s) => ({ name: s.name, scope: s.scope, source: s.source, raw: s as unknown as Record<string, unknown> })),
    },
    {
      title: 'Plugins',
      color: 'purple',
      dotColor: 'bg-purple-500',
      type: 'plugin',
      items: plugins.map((p) => ({ name: p.name, scope: p.scope, source: p.source, raw: p as unknown as Record<string, unknown> })),
    },
    {
      title: 'Skills',
      color: 'pink',
      dotColor: 'bg-pink-500',
      type: 'skill',
      items: skills.map((s) => ({ name: s.name, scope: s.scope, source: s.source, raw: s as unknown as Record<string, unknown> })),
    },
    {
      title: 'Hooks',
      color: 'amber',
      dotColor: 'bg-amber-500',
      type: 'hook',
      items: hooks.map((h) => ({ name: h.name, scope: h.scope, source: h.source, raw: h as unknown as Record<string, unknown> })),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sections.map((section) => (
        <OverviewCard key={section.title} section={section} onSelectItem={onSelectItem} />
      ))}
    </div>
  );
}
