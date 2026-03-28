'use client';

interface TabNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts: Record<string, number>;
}

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'mcpServers', label: 'MCP Servers' },
  { id: 'plugins', label: 'Plugins' },
  { id: 'skills', label: 'Skills' },
  { id: 'hooks', label: 'Hooks' },
  { id: 'claudeMd', label: 'CLAUDE.md' },
];

export default function TabNav({ activeTab, onTabChange, counts }: TabNavProps) {
  return (
    <div className="flex gap-1 border-b border-[#e5e5e5] overflow-x-auto">
      {tabs.map((tab) => {
        const count = counts[tab.id];
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors duration-150 -mb-px ${
              isActive
                ? 'border-[#1a1a1a] text-[#1a1a1a]'
                : 'border-transparent text-[#666] hover:text-[#1a1a1a] hover:border-[#d4d4d4]'
            }`}
          >
            {tab.label}
            {count !== undefined && count > 0 && (
              <span
                className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full ${
                  isActive
                    ? 'bg-[#1a1a1a] text-white'
                    : 'bg-[#f0f0f0] text-[#666]'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
