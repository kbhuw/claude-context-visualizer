'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { MarkdownFile } from '@/lib/types';
import MarkdownEditor from './MarkdownEditor';
import {
  FileText,
  X,
  PanelLeftClose,
  PanelLeft,
  GitBranch,
  ExternalLink,
  FolderPlus,
} from 'lucide-react';

interface MarkdownsTabProps {
  markdownFiles: MarkdownFile[];
  extraMdDirs: string[];
  onAddMdDir: (dir: string) => void;
  onRemoveMdDir: (dir: string) => void;
  openFilePath?: string | null;
  onOpenFileHandled?: () => void;
}

interface PaneState {
  file: MarkdownFile | null;
  content: string;
}

/** Check if a file belongs to a worktree based on its path */
function isWorktreeFile(file: MarkdownFile): boolean {
  return file.path.includes('/worktree') || file.relativePath.includes('/worktree');
}

/** Extract the worktree name from a file path (segment after worktree/worktrees) */
function getWorktreeName(filePath: string): string | null {
  const parts = filePath.split('/');
  for (let i = 0; i < parts.length - 1; i++) {
    if (parts[i] === 'worktrees' || parts[i] === 'worktree') {
      return parts[i + 1] || null;
    }
  }
  return null;
}

/** Check if a worktree path is from Conductor */
function isConductorWorktree(filePath: string): boolean {
  // Conductor worktrees live under conductor/workspaces paths
  return filePath.includes('/conductor/');
}

interface WorktreeInfo {
  name: string;
  source: 'conductor' | 'other';
}

export default function MarkdownsTab({ markdownFiles, extraMdDirs, onAddMdDir, onRemoveMdDir, openFilePath, onOpenFileHandled }: MarkdownsTabProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [worktreeEnabled, setWorktreeEnabled] = useState(false);
  const [selectedWorktree, setSelectedWorktree] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [leftPane, setLeftPane] = useState<PaneState>({ file: null, content: '' });
  const [rightPane, setRightPane] = useState<PaneState>({ file: null, content: '' });
  const [focusedPane, setFocusedPane] = useState<'left' | 'right'>('left');
  const [splitActive, setSplitActive] = useState(false);
  const restoredFromUrl = useRef(false);

  // Extract all worktrees, categorized
  const worktrees = useMemo(() => {
    const seen = new Map<string, WorktreeInfo>();
    for (const f of markdownFiles) {
      if (!isWorktreeFile(f)) continue;
      const name = getWorktreeName(f.path);
      if (name && !seen.has(name)) {
        seen.set(name, {
          name,
          source: isConductorWorktree(f.path) ? 'conductor' : 'other',
        });
      }
    }
    return Array.from(seen.values());
  }, [markdownFiles]);

  const conductorWorktrees = worktrees.filter((w) => w.source === 'conductor');
  const otherWorktrees = worktrees.filter((w) => w.source === 'other');
  const hasWorktrees = worktrees.length > 0;

  // Filter files
  const filteredFiles = markdownFiles.filter((f) => {
    if (!worktreeEnabled) return !isWorktreeFile(f);
    if (selectedWorktree) {
      // Show non-worktree files + files from the selected worktree
      if (!isWorktreeFile(f)) return true;
      return getWorktreeName(f.path) === selectedWorktree;
    }
    return true;
  });

  // Critical files shown in their own top section, matched by name (case-insensitive)
  const CRITICAL_NAMES = new Set([
    'CLAUDE.MD',
    'GLOBAL-CLAUDE.MD',
    'GLOBAL-SKILLS.MD',
    'AGENTS.MD',
    'PUFFLE-APP-PERSONAL-CLAUDE.MD',
  ]);

  const isCritical = (file: MarkdownFile) =>
    CRITICAL_NAMES.has(file.name.toUpperCase()) ||
    file.name.toUpperCase().includes('OVERRIDE');

  // Order critical files in the defined priority
  const criticalOrder = (file: MarkdownFile): number => {
    const name = file.name.toUpperCase();
    const order = [...CRITICAL_NAMES];
    const idx = order.indexOf(name);
    return idx >= 0 ? idx : order.length;
  };

  const criticalFiles = [...filteredFiles]
    .filter(isCritical)
    .sort((a, b) => criticalOrder(a) - criticalOrder(b));

  const globalFiles = filteredFiles.filter((f) => f.scope === 'global' && !isCritical(f));
  const localFiles = filteredFiles.filter((f) => f.scope === 'local' && !isCritical(f));

  const updateUrlParams = useCallback((left: MarkdownFile | null, right: MarkdownFile | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (left) {
      params.set('file', left.relativePath);
    } else {
      params.delete('file');
    }
    if (right) {
      params.set('file2', right.relativePath);
    } else {
      params.delete('file2');
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const loadFileContent = useCallback(async (file: MarkdownFile): Promise<string> => {
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(file.path)}`);
      if (!res.ok) return '';
      const data = await res.json();
      return data.content || '';
    } catch {
      return '';
    }
  }, []);

  const openFile = useCallback(async (file: MarkdownFile) => {
    const content = await loadFileContent(file);
    const targetPane = focusedPane;

    if (targetPane === 'left') {
      setLeftPane({ file, content });
      updateUrlParams(file, rightPane.file);
    } else {
      setRightPane({ file, content });
      updateUrlParams(leftPane.file, file);
    }
  }, [focusedPane, loadFileContent, updateUrlParams, leftPane.file, rightPane.file]);

  const openInSplit = useCallback(async (file: MarkdownFile) => {
    const content = await loadFileContent(file);
    setRightPane({ file, content });
    setSplitActive(true);
    setFocusedPane('right');
    updateUrlParams(leftPane.file, file);
  }, [loadFileContent, updateUrlParams, leftPane.file]);

  const closePane = useCallback((pane: 'left' | 'right') => {
    if (pane === 'right') {
      setRightPane({ file: null, content: '' });
      setSplitActive(false);
      setFocusedPane('left');
      updateUrlParams(leftPane.file, null);
    } else if (splitActive) {
      // Move right to left
      setLeftPane(rightPane);
      setRightPane({ file: null, content: '' });
      setSplitActive(false);
      setFocusedPane('left');
      updateUrlParams(rightPane.file, null);
    }
  }, [splitActive, rightPane, updateUrlParams, leftPane.file]);

  // Restore files from URL params on load, or auto-open first file
  useEffect(() => {
    if (restoredFromUrl.current || markdownFiles.length === 0) return;
    restoredFromUrl.current = true;

    const fileParam = searchParams.get('file');
    const file2Param = searchParams.get('file2');

    const leftFile = fileParam
      ? markdownFiles.find((f) => f.relativePath === fileParam)
      : null;
    const rightFile = file2Param
      ? markdownFiles.find((f) => f.relativePath === file2Param)
      : null;

    if (leftFile) {
      loadFileContent(leftFile).then((content) => setLeftPane({ file: leftFile, content }));
    } else if (markdownFiles.length > 0) {
      // Prefer critical files as default (CLAUDE.md first), then first local, then first file
      const criticalDefault = markdownFiles
        .filter(isCritical)
        .sort((a, b) => criticalOrder(a) - criticalOrder(b))[0];
      const first = criticalDefault || markdownFiles.find((f) => f.scope === 'local') || markdownFiles[0];
      loadFileContent(first).then((content) => setLeftPane({ file: first, content }));
    }

    if (rightFile) {
      loadFileContent(rightFile).then((content) => {
        setRightPane({ file: rightFile, content });
        setSplitActive(true);
      });
    }
  }, [markdownFiles]); // eslint-disable-line react-hooks/exhaustive-deps

  // Open a file by path (triggered from external navigation, e.g. edit skill button)
  useEffect(() => {
    if (!openFilePath) return;
    const file = markdownFiles.find((f) => f.path === openFilePath);
    if (file) {
      loadFileContent(file).then((content) => {
        setLeftPane({ file, content });
        setFocusedPane('left');
        updateUrlParams(file, rightPane.file);
      });
    } else {
      // File not in the sidebar list — create a temporary MarkdownFile entry and open it
      const name = openFilePath.split('/').pop() || openFilePath;
      const tempFile: MarkdownFile = {
        path: openFilePath,
        name,
        scope: openFilePath.includes('/.claude/') && !openFilePath.includes('/projects/') ? 'global' : 'local',
        relativePath: name,
      };
      loadFileContent(tempFile).then((content) => {
        setLeftPane({ file: tempFile, content });
        setFocusedPane('left');
      });
    }
    onOpenFileHandled?.();
  }, [openFilePath]); // eslint-disable-line react-hooks/exhaustive-deps

  function FileListItem({ file, isActive }: { file: MarkdownFile; isActive: boolean }) {
    return (
      <button
        type="button"
        onClick={() => openFile(file)}
        onContextMenu={(e) => {
          e.preventDefault();
          openInSplit(file);
        }}
        className={`w-full text-left px-2.5 py-1.5 rounded text-[12px] flex items-center gap-2 transition-colors duration-100 ${
          isActive
            ? 'bg-primary/10 text-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`}
        title={`Click to open • Right-click to open in split`}
      >
        <FileText size={13} className="flex-shrink-0 opacity-60" />
        <span className="truncate">{file.relativePath}</span>
      </button>
    );
  }

  function FileGroup({ label, files, color }: { label: string; files: MarkdownFile[]; color: string }) {
    if (files.length === 0) return null;
    return (
      <div className="mb-3">
        <div className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 mb-1 ${color}`}>
          {label}
        </div>
        <div className="space-y-0.5">
          {files.map((file) => (
            <FileListItem
              key={file.path}
              file={file}
              isActive={
                leftPane.file?.path === file.path || rightPane.file?.path === file.path
              }
            />
          ))}
        </div>
      </div>
    );
  }

  function EditorPane({
    pane,
    paneKey,
    showClose,
  }: {
    pane: PaneState;
    paneKey: 'left' | 'right';
    showClose: boolean;
  }) {
    if (!pane.file) {
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          {paneKey === 'right' ? (
            <span>Right-click a file to open here</span>
          ) : (
            <span>Select a file to start editing</span>
          )}
        </div>
      );
    }

    const scopeColor = pane.file.scope === 'global' ? 'text-blue-500' : 'text-green-500';

    return (
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          focusedPane === paneKey ? 'ring-1 ring-primary/30' : ''
        }`}
        onClick={() => setFocusedPane(paneKey)}
      >
        {/* Pane header */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 border-b border-border">
          <FileText size={13} className={scopeColor} />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              // Reveal file in Finder
              fetch('/api/open', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: pane.file!.path }),
              });
            }}
            className="text-[12px] font-medium truncate flex-1 text-left hover:underline flex items-center gap-1 group"
            title={`Open in Finder: ${pane.file.path}`}
          >
            <span className="truncate">{pane.file.relativePath}</span>
            <ExternalLink size={11} className="flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
          </button>
          {!splitActive && paneKey === 'left' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSplitActive(true);
                setFocusedPane('right');
              }}
              className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded border border-border hover:bg-accent transition-colors"
              title="Open split view"
            >
              Split
            </button>
          )}
          {showClose && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closePane(paneKey);
              }}
              className="text-muted-foreground hover:text-foreground p-0.5 rounded hover:bg-accent transition-colors"
              title="Close pane"
            >
              <X size={13} />
            </button>
          )}
        </div>
        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <MarkdownEditor
            key={pane.file.path}
            filePath={pane.file.path}
            initialContent={pane.content}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Worktree toggle bar */}
      {hasWorktrees && (
        <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-2.5">
          <div className="flex items-center gap-2">
            <GitBranch size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Worktrees</span>
          </div>

          {/* Toggle switch */}
          <button
            type="button"
            onClick={() => {
              setWorktreeEnabled(!worktreeEnabled);
              if (worktreeEnabled) setSelectedWorktree(null);
            }}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              worktreeEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                worktreeEnabled ? 'translate-x-4' : 'translate-x-1'
              }`}
            />
          </button>

          {/* Worktree picker — visible when toggled on */}
          {worktreeEnabled && (
            <div className="flex items-center gap-2 ml-2 flex-wrap">
              {conductorWorktrees.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mr-1">Conductor</span>
                  {conductorWorktrees.map((w) => (
                    <button
                      key={w.name}
                      type="button"
                      onClick={() => setSelectedWorktree(selectedWorktree === w.name ? null : w.name)}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                        selectedWorktree === w.name
                          ? 'bg-primary/15 text-primary border-primary/30'
                          : 'text-muted-foreground border-border hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      {w.name}
                    </button>
                  ))}
                </div>
              )}
              {otherWorktrees.length > 0 && (
                <div className="flex items-center gap-1">
                  {conductorWorktrees.length > 0 && (
                    <div className="w-px h-4 bg-border mx-1" />
                  )}
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mr-1">Other</span>
                  {otherWorktrees.map((w) => (
                    <button
                      key={w.name}
                      type="button"
                      onClick={() => setSelectedWorktree(selectedWorktree === w.name ? null : w.name)}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${
                        selectedWorktree === w.name
                          ? 'bg-primary/15 text-primary border-primary/30'
                          : 'text-muted-foreground border-border hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      {w.name}
                    </button>
                  ))}
                </div>
              )}
              {selectedWorktree && (
                <button
                  type="button"
                  onClick={() => setSelectedWorktree(null)}
                  className="text-[10px] text-muted-foreground hover:text-foreground ml-1"
                >
                  Show all
                </button>
              )}
            </div>
          )}
        </div>
      )}

    <div className="flex h-[calc(100vh-160px)] min-h-[500px] bg-card border border-border rounded-lg overflow-hidden">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="w-56 flex-shrink-0 border-r border-border flex flex-col bg-card">
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-2.5 py-2 border-b border-border">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Files
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-accent transition-colors"
                title="Collapse sidebar"
              >
                <PanelLeftClose size={14} />
              </button>
            </div>
          </div>

          {/* File list */}
          <div className="flex-1 overflow-auto py-2 px-1">
            <FileGroup label="Critical" files={criticalFiles} color="text-amber-500" />
            <FileGroup label="Local" files={localFiles} color="text-green-500" />
            <FileGroup label="Global" files={globalFiles} color="text-blue-500" />
            {filteredFiles.length === 0 && (
              <div className="text-center text-muted-foreground text-[12px] py-8">
                No .md files found
              </div>
            )}
          </div>

          {/* Extra directories */}
          <div className="border-t border-border px-2.5 py-2 space-y-1">
            {extraMdDirs.map((dir) => (
              <div key={dir} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="truncate flex-1" title={dir}>{dir.split('/').pop()}</span>
                <button
                  type="button"
                  onClick={() => onRemoveMdDir(dir)}
                  className="hover:text-foreground p-0.5 rounded hover:bg-accent"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const dir = prompt('Directory path to scan for .md files:');
                if (dir?.trim()) onAddMdDir(dir.trim());
              }}
              className="w-full flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground px-1 py-1 rounded hover:bg-accent transition-colors"
            >
              <FolderPlus size={12} />
              Add directory
            </button>
          </div>
        </div>
      )}

      {/* Sidebar toggle when collapsed */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex-shrink-0 px-1.5 border-r border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Open sidebar"
        >
          <PanelLeft size={14} />
        </button>
      )}

      {/* Editor area */}
      <div className="flex-1 flex min-w-0">
        <EditorPane pane={leftPane} paneKey="left" showClose={splitActive} />
        {splitActive && (
          <>
            <div className="w-px bg-border flex-shrink-0" />
            <EditorPane pane={rightPane} paneKey="right" showClose />
          </>
        )}
      </div>

    </div>
    </div>
  );
}
