'use client';

import type { Hook } from '@/lib/types';

interface HooksTabProps {
  hooks: Hook[];
  onSelectItem: (item: Record<string, unknown>) => void;
}

export default function HooksTab({ hooks, onSelectItem }: HooksTabProps) {
  const globalHooks = hooks.filter((h) => h.scope === 'global');
  const localHooks = hooks.filter((h) => h.scope === 'local');

  const renderGroup = (items: Hook[], label: string, labelColor: string) => {
    if (items.length === 0) return null;
    return (
      <div>
        <div className={`text-[10px] font-semibold uppercase tracking-wider ${labelColor} mb-2`}>
          {label} ({items.length})
        </div>
        <div className="space-y-2">
          {items.map((hook, i) => (
            <button
              key={`${hook.name}-${i}`}
              onClick={() => onSelectItem(hook as unknown as Record<string, unknown>)}
              className="w-full text-left bg-card border border-border rounded-lg p-4 hover:border-ring/50 transition-colors duration-150"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{hook.name}</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-100">
                      {hook.type}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground mt-1">{hook.command}</p>
                  <p className="text-xs text-muted-foreground mt-1">Source: {hook.source}</p>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase flex-shrink-0 ${
                    hook.scope === 'global'
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-100'
                      : 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-100'
                  }`}
                >
                  {hook.scope === 'local' ? 'app' : hook.scope}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (hooks.length === 0) {
    return (
      <div className="text-center py-12 text-[#999] text-sm">
        No hooks configured
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderGroup(globalHooks, 'Global', 'text-blue-500')}
      {renderGroup(localHooks, 'App Level', 'text-green-500')}
    </div>
  );
}
