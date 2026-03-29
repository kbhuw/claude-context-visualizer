'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import type { KnownProject, ConductorProject } from '@/lib/types';

// Mild color palette for project cards (bg, border, text accent)
const CARD_COLORS = [
  { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800/50', accent: 'text-blue-600 dark:text-blue-400' },
  { bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200 dark:border-violet-800/50', accent: 'text-violet-600 dark:text-violet-400' },
  { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800/50', accent: 'text-emerald-600 dark:text-emerald-400' },
  { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800/50', accent: 'text-amber-600 dark:text-amber-400' },
  { bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-800/50', accent: 'text-rose-600 dark:text-rose-400' },
  { bg: 'bg-cyan-50 dark:bg-cyan-950/30', border: 'border-cyan-200 dark:border-cyan-800/50', accent: 'text-cyan-600 dark:text-cyan-400' },
];

interface ProjectSelectorProps {
  projects: KnownProject[];
  conductorProjects: ConductorProject[];
  selectedProject: string | null;
  onSelectProject: (path: string | null) => void;
  loading: boolean;
}

export default function ProjectSelector({
  projects,
  conductorProjects,
  selectedProject,
  onSelectProject,
  loading,
}: ProjectSelectorProps) {
  const [browsedPaths, setBrowsedPaths] = useState<string[]>([]);
  const [browsing, setBrowsing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Turn a full path into a friendly display name. */
  const friendlyName = (fullPath: string): string => {
    const home = fullPath.replace(/^\/Users\/[^/]+/, '~');
    const parts = home.split('/').filter(Boolean);
    const skip = new Set(['~', 'Documents', 'conductor', 'repos', 'workspaces', '.paperclip', 'instances', 'default']);
    const meaningful = parts.filter(p => !skip.has(p));
    if (meaningful.length === 0) return fullPath;
    const show = meaningful.slice(-Math.min(3, meaningful.length));
    return show.join(' / ');
  };

  // Find which conductor project the current selection belongs to
  const activeProject = useMemo(() => {
    if (!selectedProject) return null;
    return conductorProjects.find(cp =>
      cp.mainRepo === selectedProject ||
      cp.worktrees.some(wt => wt.path === selectedProject)
    ) ?? null;
  }, [selectedProject, conductorProjects]);

  // Auto-expand the active project's card
  useEffect(() => {
    if (activeProject) setExpanded(activeProject.name);
  }, [activeProject]);

  const handleSelect = (path: string | null) => {
    setShowPicker(false);
    onSelectProject(path);
  };

  const addAndSelect = (folderPath: string) => {
    const knownPaths = new Set(projects.map((p) => p.path));
    if (!knownPaths.has(folderPath) && !browsedPaths.includes(folderPath)) {
      setBrowsedPaths((prev) => [...prev, folderPath]);
    }
    setShowPicker(false);
    onSelectProject(folderPath);
  };

  const handleBrowse = async () => {
    if (browsing) return;
    setBrowsing(true);
    try {
      const res = await fetch('/api/browse', { method: 'POST' });
      const data = await res.json();
      if (!data.error && !data.cancelled && data.path) {
        addAndSelect(data.path);
        return;
      }
    } catch {
      // fall through
    } finally {
      setBrowsing(false);
    }
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
        const res = await fetch('/api/browse/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: dirHandle.name }),
        });
        const data = await res.json();
        if (data.path) { addAndSelect(data.path); return; }
      } catch { /* cancelled */ }
    }
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const firstPath = files[0].webkitRelativePath;
    if (firstPath) {
      const folderName = firstPath.split('/')[0];
      const path = window.prompt(
        `Selected folder: "${folderName}"\nEnter the full absolute path:`,
        folderName,
      );
      if (path?.trim()) addAndSelect(path.trim());
    }
    e.target.value = '';
  };

  // Compact current-selection bar
  const selectionBar = (
    <button
      onClick={() => !loading && setShowPicker(!showPicker)}
      disabled={loading}
      className="flex h-10 w-full items-center justify-between rounded-lg border border-border/60 bg-background/50 px-3 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="flex items-center gap-2 min-w-0">
        <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.06-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
        </svg>
        <span className="truncate font-medium">
          {selectedProject ? friendlyName(selectedProject) : 'Global View'}
        </span>
        {activeProject && (
          <span className="text-xs text-muted-foreground">
            {activeProject.name}
          </span>
        )}
      </div>
      <svg className={`h-4 w-4 opacity-50 flex-shrink-0 transition-transform ${showPicker ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

  return (
    <div>
      {selectionBar}

      {showPicker && (
        <div className="mt-3 space-y-2">
          {/* Project cards grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {/* Global View card */}
            <button
              onClick={() => handleSelect(null)}
              className={`group relative rounded-lg border p-3 text-left transition-all hover:shadow-sm ${
                !selectedProject
                  ? 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 shadow-sm ring-1 ring-slate-300/50 dark:ring-slate-600/50'
                  : 'border-slate-200 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/20 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.97.633-3.794 1.708-5.282" />
                </svg>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Global</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-500">Settings only</p>
            </button>

            {/* Conductor project cards */}
            {conductorProjects.map((cp, idx) => {
              const color = CARD_COLORS[idx % CARD_COLORS.length];
              const isActive = activeProject?.name === cp.name;
              const isExpanded = expanded === cp.name;
              return (
                <button
                  key={cp.name}
                  onClick={() => setExpanded(isExpanded ? null : cp.name)}
                  className={`group relative rounded-lg border p-3 text-left transition-all hover:shadow-sm ${
                    isActive
                      ? `${color.border} ${color.bg} shadow-sm ring-1 ring-current/10`
                      : `${color.border} ${color.bg} hover:shadow-sm`
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <svg className={`w-4 h-4 ${color.accent}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.06-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                    </svg>
                    <span className="text-sm font-medium truncate">{cp.name}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {cp.worktrees.length} worktree{cp.worktrees.length !== 1 ? 's' : ''}
                  </p>
                  <svg className={`absolute top-3 right-3 w-3 h-3 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              );
            })}

            {/* "Other" card — just opens file picker */}
            <button
              onClick={handleBrowse}
              disabled={browsing}
              className="group relative rounded-lg border border-dashed border-border/60 p-3 text-left transition-all hover:border-foreground/30 hover:shadow-sm bg-card disabled:opacity-50"
            >
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.06-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                </svg>
                <span className="text-sm font-medium">Other</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Browse for folder</p>
            </button>
          </div>

          {/* Expanded worktree list for selected project */}
          {expanded && (() => {
            const cpIdx = conductorProjects.findIndex(p => p.name === expanded);
            const cp = conductorProjects[cpIdx];
            if (!cp) return null;
            const color = CARD_COLORS[cpIdx % CARD_COLORS.length];
            return (
              <div className={`rounded-lg border ${color.border} overflow-hidden`}>
                <div className={`px-3 py-2 border-b ${color.border} ${color.bg}`}>
                  <span className={`text-xs font-medium uppercase tracking-wider ${color.accent}`}>{cp.name}</span>
                </div>
                <div className="divide-y divide-border/30">
                  {/* Main repo */}
                  {cp.mainRepo && (
                    <button
                      onClick={() => handleSelect(cp.mainRepo!)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors hover:bg-accent ${
                        selectedProject === cp.mainRepo ? 'bg-accent' : ''
                      }`}
                    >
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold uppercase tracking-wide flex-shrink-0 ${color.bg} ${color.accent} border ${color.border}`}>
                        main
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{friendlyName(cp.mainRepo)}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{cp.mainRepo}</div>
                      </div>
                      {selectedProject === cp.mainRepo && (
                        <svg className={`w-4 h-4 ${color.accent} flex-shrink-0`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </button>
                  )}
                  {/* Worktrees */}
                  {cp.worktrees.map((wt) => (
                    <button
                      key={wt.path}
                      onClick={() => handleSelect(wt.path)}
                      className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors hover:bg-accent ${
                        selectedProject === wt.path ? 'bg-accent' : ''
                      }`}
                    >
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium flex-shrink-0 w-[3.25rem] text-center">
                        wt
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm truncate">{wt.name}</div>
                      </div>
                      {selectedProject === wt.path && (
                        <svg className={`w-4 h-4 ${color.accent} flex-shrink-0`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        /* @ts-expect-error webkitdirectory is non-standard but widely supported */
        webkitdirectory=""
        className="hidden"
        onChange={handleFileInputChange}
        suppressHydrationWarning
      />
    </div>
  );
}
