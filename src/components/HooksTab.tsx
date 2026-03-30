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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground">{hook.name}</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-100">
                      {hook.type}
                    </span>
                    {hook.riskLevel && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                        hook.riskLevel === 'high'
                          ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-100'
                          : hook.riskLevel === 'medium'
                            ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-100'
                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-100'
                      }`}>
                        {hook.riskLevel} risk
                      </span>
                    )}
                    {hook.contextImpact && hook.contextImpact !== 'none' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-100">
                        {hook.contextImpact === 'injects' ? 'injects context' : 'modifies output'}
                      </span>
                    )}
                  </div>
                  {hook.description ? (
                    <p className="text-xs text-muted-foreground mt-1">{hook.description}</p>
                  ) : (
                    <p className="text-xs font-mono text-muted-foreground mt-1">{hook.command}</p>
                  )}
                  {hook.origin && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Origin: {hook.origin}
                    </p>
                  )}
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
      <div className="flex items-center gap-2 mb-4 px-1">
        <div className="group relative">
          <svg className="w-4 h-4 text-muted-foreground cursor-help" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          <div className="absolute left-0 top-6 z-50 hidden group-hover:block w-72 p-3 rounded-lg bg-popover border border-border shadow-lg text-xs text-popover-foreground">
            <p className="font-semibold mb-1">Analyze your hooks</p>
            <p className="text-muted-foreground">Ask your agent to run:</p>
            <code className="block mt-1 text-[11px] font-mono bg-muted px-2 py-1 rounded break-all">
              bun run scan --dump-hooks -p .
            </code>
            <p className="text-muted-foreground mt-1">Then pipe the analysis into:</p>
            <code className="block mt-1 text-[11px] font-mono bg-muted px-2 py-1 rounded break-all">
              bun run scan --write-enrichments
            </code>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {hooks.filter(h => h.enrichedAt).length}/{hooks.length} hooks analyzed
        </span>
      </div>
      {renderGroup(globalHooks, 'Global', 'text-blue-500')}
      {renderGroup(localHooks, 'App Level', 'text-green-500')}
    </div>
  );
}
