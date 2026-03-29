'use client';

import type { Skill } from '@/lib/types';

interface SkillsTabProps {
  skills: Skill[];
  onSelectItem: (item: Record<string, unknown>) => void;
}

export default function SkillsTab({ skills, onSelectItem }: SkillsTabProps) {
  const sourceOrder = (s: Skill) => s.source === 'Global Skills' || s.source === 'Local Skills' ? 0 : s.source === 'Global Agents' || s.source === 'Local Agents' ? 99 : 50;
  const globalSkills = skills.filter((s) => s.scope === 'global').sort((a, b) => sourceOrder(a) - sourceOrder(b));
  const localSkills = skills.filter((s) => s.scope === 'local').sort((a, b) => sourceOrder(a) - sourceOrder(b));

  const renderGroup = (items: Skill[], label: string, labelColor: string) => {
    if (items.length === 0) return null;
    return (
      <div>
        <div className={`text-[10px] font-semibold uppercase tracking-wider ${labelColor} mb-2`}>
          {label} ({items.length})
        </div>
        <div className="space-y-2">
          {items.map((skill, i) => (
            <button
              key={`${skill.name}-${i}`}
              onClick={() => onSelectItem(skill as unknown as Record<string, unknown>)}
              className={`w-full text-left bg-card border rounded-lg p-4 hover:border-ring/50 transition-colors duration-150 ${
                skill.source === 'Global Skills' ? 'border-green-300 dark:border-green-800'
                : skill.source === 'Local Skills' ? 'border-green-200 dark:border-green-900'
                : (skill.source === 'Global Agents' || skill.source === 'Local Agents') ? 'border-red-300 dark:border-red-800'
                : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className={`text-sm font-semibold ${
                    skill.source === 'Global Skills' ? 'text-green-700 dark:text-green-400'
                    : skill.source === 'Local Skills' ? 'text-green-500 dark:text-green-300'
                    : 'text-foreground'
                  }`}>
                    {skill.name}
                    {skill.alsoInAgents && (
                      <span className="ml-2 text-[10px] font-normal text-amber-600 dark:text-amber-400">also in ~/.agents/</span>
                    )}
                  </h3>
                  {skill.description && (
                    <p className="text-xs text-muted-foreground mt-1">{skill.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Source: {skill.source}
                    {(skill.source === 'Global Agents' || skill.source === 'Local Agents') && (
                      <span className="ml-2 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 px-1.5 py-0.5 rounded">
                        NOT INVOCABLE — ~/.agents/skills/ is not read by Claude Code
                      </span>
                    )}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5 truncate">{skill.filePath}</p>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase flex-shrink-0 ${
                    (skill.source === 'Global Agents' || skill.source === 'Local Agents')
                      ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
                    : skill.source === 'Global Skills'
                      ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                    : skill.source === 'Local Skills'
                      ? 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-200'
                    : skill.scope === 'global'
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-100'
                      : 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-100'
                  }`}
                >
                  {(skill.source === 'Global Agents' || skill.source === 'Local Agents') ? '⚠ agents' : skill.scope === 'local' ? 'app' : skill.scope}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (skills.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No skills configured
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderGroup(globalSkills, 'Global', 'text-blue-500')}
      {renderGroup(localSkills, 'App Level', 'text-green-500')}
    </div>
  );
}
