'use client';

import type { McpServer, Plugin, Skill, Hook } from '@/lib/types';

interface OverviewTabProps {
  mcpServers: McpServer[];
  plugins: Plugin[];
  skills: Skill[];
  hooks: Hook[];
  onSelectItem: (type: string, item: Record<string, unknown>) => void;
}

const sourceColors: Record<string, string> = {
  'Global Settings': 'bg-blue-50 text-blue-600',
  'Client State': 'bg-amber-50 text-amber-600',
  'Plugin': 'bg-purple-50 text-purple-600',
  'MCP Config': 'bg-green-50 text-green-600',
  'Skills Dir': 'bg-pink-50 text-pink-600',
};

function getSourceBadgeClass(source: string): string {
  for (const [key, cls] of Object.entries(sourceColors)) {
    if (source.toLowerCase().includes(key.toLowerCase())) return cls;
  }
  return 'bg-gray-50 text-gray-600';
}

interface CardSection {
  title: string;
  color: string;
  dotColor: string;
  items: { name: string; scope: 'global' | 'local'; source: string; raw: Record<string, unknown> }[];
  type: string;
}

const MAX_ITEMS = 5;

function OverviewCard({
  section,
  onSelectItem,
}: {
  section: CardSection;
  onSelectItem: (type: string, item: Record<string, unknown>) => void;
}) {
  const globalItems = section.items.filter((i) => i.scope === 'global');
  const localItems = section.items.filter((i) => i.scope === 'local');

  const renderItems = (items: typeof section.items, label: string, labelColor: string) => {
    if (items.length === 0) return null;
    const visible = items.slice(0, MAX_ITEMS);
    const remaining = items.length - MAX_ITEMS;

    return (
      <div>
        <div className={`text-[10px] font-semibold uppercase tracking-wider ${labelColor} mb-1.5`}>
          {label}
        </div>
        <div className="space-y-1">
          {visible.map((item, i) => (
            <button
              key={`${item.name}-${i}`}
              onClick={() => onSelectItem(section.type, item.raw)}
              className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-[#fafafa] transition-colors duration-150 text-left"
            >
              <span className="text-[#1a1a1a] truncate">{item.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${getSourceBadgeClass(item.source)}`}>
                {item.source}
              </span>
            </button>
          ))}
          {remaining > 0 && (
            <div className="text-xs text-[#999] pl-2">+{remaining} more...</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-[#e5e5e5] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${section.dotColor}`} />
        <h3 className="text-sm font-semibold text-[#1a1a1a]">{section.title}</h3>
        <span className="text-xs text-[#999]">{section.items.length}</span>
      </div>
      <div className="space-y-3">
        {renderItems(globalItems, 'Global', 'text-blue-500')}
        {renderItems(localItems, 'Local', 'text-green-500')}
        {section.items.length === 0 && (
          <p className="text-xs text-[#999] italic">None configured</p>
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
