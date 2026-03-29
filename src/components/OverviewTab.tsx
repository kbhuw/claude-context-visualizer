'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { McpServer, Plugin, Skill, Hook } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

interface OverviewTabProps {
  mcpServers: McpServer[];
  plugins: Plugin[];
  skills: Skill[];
  hooks: Hook[];
  commands: { name: string; scope: 'global' | 'local'; source: string; description?: string; filePath: string }[];
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

/** Group skills by their source (e.g., "superpowers", "frontend-design", "Skills Directory") */
function groupSkillsBySource(skills: Skill[]): Map<string, Skill[]> {
  const groups = new Map<string, Skill[]>();

  for (const skill of skills) {
    const formatted = skill.source
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    if (!groups.has(formatted)) {
      groups.set(formatted, []);
    }
    groups.get(formatted)!.push(skill);
  }

  return groups;
}

/** Collapsible skill group used in both the card and the modal */
function SkillGroup({
  groupName,
  skills,
  defaultExpanded,
  onSelectItem,
}: {
  groupName: string;
  skills: Skill[];
  defaultExpanded: boolean;
  onSelectItem: (type: string, item: Record<string, unknown>) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 py-1.5 px-1 text-left group rounded-md hover:bg-accent/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-foreground/70" />
        ) : (
          <ChevronRight className="w-4 h-4 text-foreground/70" />
        )}
        <span className="text-xs font-bold uppercase tracking-wider text-foreground/80 group-hover:text-foreground transition-colors">
          {groupName}
        </span>
        <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 leading-none">{skills.length}</span>
      </button>
      {expanded && (
        <div className="space-y-0.5 ml-6">
          {skills.map((skill, i) => (
            <button
              key={`${skill.name}-${i}`}
              onClick={() => onSelectItem('skill', skill as unknown as Record<string, unknown>)}
              className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors duration-150 text-left"
            >
              <span className="text-foreground truncate">{skill.name}</span>
              <Badge className={`flex-shrink-0 ${
                skill.scope === 'local'
                  ? 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-100'
                  : 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-100'
              }`}>
                {skill.scope === 'local' ? 'app' : 'global'}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Custom modal that doesn't use radix Dialog, so it can coexist with the side sheet */
function SkillsBrowseModal({
  open,
  onClose,
  sheetOpen,
  onCloseSheet,
  skills,
  onSelectItem,
}: {
  open: boolean;
  onClose: () => void;
  sheetOpen: boolean;
  onCloseSheet?: () => void;
  skills: Skill[];
  onSelectItem: (type: string, item: Record<string, unknown>) => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Escape: if sheet is open, close it first; otherwise close the modal
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (sheetOpen && onCloseSheet) {
          onCloseSheet();
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, sheetOpen, onClose, onCloseSheet]);

  if (!open) return null;

  const groups = groupSkillsBySource(skills);
  const sortedGroups = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop - only show when sheet is NOT open */}
      {!sheetOpen && (
        <div
          className="absolute inset-0 bg-black/50 animate-in fade-in-0 duration-200"
          onClick={onClose}
        />
      )}
      {/* Modal content - shifts left when sheet is open */}
      <div
        ref={contentRef}
        className={`absolute top-[50%] translate-y-[-50%] z-[61] w-full max-w-2xl max-h-[80vh] flex flex-col border bg-background rounded-lg shadow-xl transition-all duration-300 ease-in-out ${
          sheetOpen
            ? 'left-[calc(50%-360px)] translate-x-[-50%]'
            : 'left-[50%] translate-x-[-50%]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
              Skills
              <span className="text-sm font-normal text-muted-foreground">{skills.length}</span>
            </h2>
            <p className="text-sm text-muted-foreground">Browse all skills grouped by type. Click a skill to view details.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 space-y-2 px-6 pb-6 pr-5">
          {sortedGroups.map(([groupName, groupSkills]) => (
            <SkillGroup
              key={groupName}
              groupName={groupName}
              skills={groupSkills}
              defaultExpanded={true}
              onSelectItem={onSelectItem}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** The Skills card with collapsible type groups and a clickable header that opens a browse modal */
function SkillsCard({
  skills,
  onSelectItem,
  sheetOpen,
  onModalChange,
  onCloseSheet,
}: {
  skills: Skill[];
  onSelectItem: (type: string, item: Record<string, unknown>) => void;
  sheetOpen: boolean;
  onModalChange?: (open: boolean) => void;
  onCloseSheet?: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const updateModalOpen = useCallback((open: boolean) => {
    setModalOpen(open);
    onModalChange?.(open);
  }, [onModalChange]);
  const groups = groupSkillsBySource(skills);
  const sortedGroups = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  const handleModalSelectItem = useCallback((type: string, item: Record<string, unknown>) => {
    // Keep modal open, open the side sheet
    onSelectItem(type, item);
  }, [onSelectItem]);

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-4">
        <button
          onClick={() => updateModalOpen(true)}
          className="flex items-center gap-2 mb-3 w-full text-left group cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-pink-500" />
          <h3 className="text-sm font-semibold text-foreground group-hover:text-pink-500 transition-colors">Skills</h3>
          <span className="text-xs text-muted-foreground">{skills.length}</span>
        </button>
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {sortedGroups.map(([groupName, groupSkills]) => (
            <SkillGroup
              key={groupName}
              groupName={groupName}
              skills={groupSkills}
              defaultExpanded={false}
              onSelectItem={onSelectItem}
            />
          ))}
          {skills.length === 0 && (
            <p className="text-xs text-muted-foreground italic">None configured</p>
          )}
        </div>
      </div>

      <SkillsBrowseModal
        open={modalOpen}
        onClose={() => updateModalOpen(false)}
        sheetOpen={sheetOpen}
        onCloseSheet={onCloseSheet}
        skills={skills}
        onSelectItem={handleModalSelectItem}
      />
    </>
  );
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

type HooksGroupMode = 'event' | 'source';

const EVENT_ORDER = [
  'SessionStart',
  'PreToolUse',
  'UserPromptSubmit',
  'PostToolUse',
  'SubagentStart',
  'SubagentStop',
  'SessionEnd',
];

function HooksCard({
  hooks,
  onSelectItem,
}: {
  hooks: Hook[];
  onSelectItem: (type: string, item: Record<string, unknown>) => void;
}) {
  const [groupMode, setGroupMode] = useState<HooksGroupMode>('event');

  const groups = useMemo(() => {
    const map = new Map<string, Hook[]>();
    for (const hook of hooks) {
      const key = groupMode === 'event'
        ? (hook.event || hook.name || 'Unknown')
        : (hook.source || 'Unknown');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(hook);
    }
    // Sort: for event mode, use defined order; for source mode, alphabetical
    if (groupMode === 'event') {
      const sorted = new Map<string, Hook[]>();
      for (const ev of EVENT_ORDER) {
        if (map.has(ev)) sorted.set(ev, map.get(ev)!);
      }
      // Any events not in the predefined order go at the end
      for (const [key, val] of map) {
        if (!sorted.has(key)) sorted.set(key, val);
      }
      return sorted;
    }
    return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [hooks, groupMode]);

  /** Short label extracted from the command path */
  const commandLabel = (cmd: string) => {
    const match = cmd.match(/\/hooks\/([^"]+)/);
    return match ? match[1] : cmd;
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <h3 className="text-sm font-semibold text-foreground">Hooks</h3>
          <span className="text-xs text-muted-foreground">{hooks.length}</span>
        </div>
        {/* Group toggle */}
        <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
          <button
            onClick={() => setGroupMode('event')}
            className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
              groupMode === 'event'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            By Event
          </button>
          <button
            onClick={() => setGroupMode('source')}
            className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
              groupMode === 'source'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            By Source
          </button>
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {hooks.length === 0 && (
          <p className="text-xs text-muted-foreground italic">None configured</p>
        )}
        {Array.from(groups.entries()).map(([groupName, groupHooks]) => (
          <div key={groupName}>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-500 mb-1.5 flex items-center gap-1.5">
              {groupName}
              <span className="text-muted-foreground font-normal">({groupHooks.length})</span>
            </div>
            <div className="space-y-1">
              {groupHooks.map((hook, i) => (
                <button
                  key={`${hook.command}-${i}`}
                  onClick={() => onSelectItem('hook', hook as unknown as Record<string, unknown>)}
                  className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-accent transition-colors duration-150 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-foreground text-xs font-mono truncate block">
                      {commandLabel(hook.command)}
                    </span>
                    {hook.matcher && (
                      <span className="text-[10px] text-muted-foreground truncate block">
                        match: {hook.matcher}
                      </span>
                    )}
                  </div>
                  {/* Badge shows the "other" dimension — source when grouped by event, event when grouped by source */}
                  <Badge className={`flex-shrink-0 ${
                    groupMode === 'event'
                      ? getSourceBadgeClass(hook.source)
                      : 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-100'
                  }`}>
                    {groupMode === 'event' ? hook.source : (hook.event || hook.name)}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OverviewTab({
  mcpServers,
  plugins,
  skills,
  hooks,
  commands,
  onSelectItem,
  sheetOpen,
  onSkillsModalChange,
  onCloseSheet,
}: OverviewTabProps & { sheetOpen?: boolean; onSkillsModalChange?: (open: boolean) => void; onCloseSheet?: () => void }) {
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
      title: 'Commands',
      color: 'teal',
      dotColor: 'bg-teal-500',
      type: 'command',
      items: commands.map((c) => ({ name: c.name, scope: c.scope, source: c.source, raw: c as unknown as Record<string, unknown> })),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sections.map((section) => (
        <OverviewCard key={section.title} section={section} onSelectItem={onSelectItem} />
      ))}
      <HooksCard hooks={hooks} onSelectItem={onSelectItem} />
      <SkillsCard skills={skills} onSelectItem={onSelectItem} sheetOpen={!!sheetOpen} onModalChange={onSkillsModalChange} onCloseSheet={onCloseSheet} />
    </div>
  );
}
