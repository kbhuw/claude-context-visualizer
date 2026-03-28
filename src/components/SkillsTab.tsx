'use client';

import type { Skill } from '@/lib/types';

interface SkillsTabProps {
  skills: Skill[];
  onSelectItem: (item: Record<string, unknown>) => void;
}

export default function SkillsTab({ skills, onSelectItem }: SkillsTabProps) {
  const globalSkills = skills.filter((s) => s.scope === 'global');
  const localSkills = skills.filter((s) => s.scope === 'local');

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
              className="w-full text-left bg-white border border-[#e5e5e5] rounded-lg p-4 hover:border-[#d4d4d4] transition-colors duration-150"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[#1a1a1a]">{skill.name}</h3>
                  {skill.description && (
                    <p className="text-xs text-[#666] mt-1">{skill.description}</p>
                  )}
                  <p className="text-xs text-[#999] mt-1">Source: {skill.source}</p>
                  <p className="text-xs font-mono text-[#999] mt-0.5 truncate">{skill.filePath}</p>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase flex-shrink-0 ${
                    skill.scope === 'global'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-green-50 text-green-600'
                  }`}
                >
                  {skill.scope}
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
      <div className="text-center py-12 text-[#999] text-sm">
        No skills configured
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderGroup(globalSkills, 'Global', 'text-blue-500')}
      {renderGroup(localSkills, 'Local', 'text-green-500')}
    </div>
  );
}
