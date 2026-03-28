'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MarkdownFile } from '@/lib/types';
import MarkdownEditor from './MarkdownEditor';
import {
  FileText,
  X,
  PanelLeftClose,
  PanelLeft,
  Filter,
} from 'lucide-react';

interface MarkdownsTabProps {
  markdownFiles: MarkdownFile[];
}

interface PaneState {
  file: MarkdownFile | null;
  content: string;
}

const CLAUDE_FILES = ['CLAUDE.md', 'AGENTS.md', 'GEMINI.md'];

function isClaudeFile(file: MarkdownFile): boolean {
  return CLAUDE_FILES.includes(file.name) || file.relativePath.startsWith('.claude/');
}

export default function MarkdownsTab({ markdownFiles }: MarkdownsTabProps) {
  const [filterClaude, setFilterClaude] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [leftPane, setLeftPane] = useState<PaneState>({ file: null, content: '' });
  const [rightPane, setRightPane] = useState<PaneState>({ file: null, content: '' });
  const [focusedPane, setFocusedPane] = useState<'left' | 'right'>('left');
  const [splitActive, setSplitActive] = useState(false);

  const filteredFiles = filterClaude
    ? markdownFiles.filter(isClaudeFile)
    : markdownFiles;

  const globalFiles = filteredFiles.filter((f) => f.scope === 'global');
  const localFiles = filteredFiles.filter((f) => f.scope === 'local');

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
    } else {
      setRightPane({ file, content });
    }
  }, [focusedPane, loadFileContent]);

  const openInSplit = useCallback(async (file: MarkdownFile) => {
    const content = await loadFileContent(file);
    setRightPane({ file, content });
    setSplitActive(true);
    setFocusedPane('right');
  }, [loadFileContent]);

  const closePane = useCallback((pane: 'left' | 'right') => {
    if (pane === 'right') {
      setRightPane({ file: null, content: '' });
      setSplitActive(false);
      setFocusedPane('left');
    } else if (splitActive) {
      // Move right to left
      setLeftPane(rightPane);
      setRightPane({ file: null, content: '' });
      setSplitActive(false);
      setFocusedPane('left');
    }
  }, [splitActive, rightPane]);

  // Auto-open first file
  useEffect(() => {
    if (!leftPane.file && markdownFiles.length > 0) {
      openFile(markdownFiles[0]);
    }
  }, [markdownFiles]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <span className="text-[12px] font-medium truncate flex-1">
            {pane.file.relativePath}
          </span>
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
    <div className="flex h-[calc(100vh-280px)] min-h-[500px] bg-card border border-border rounded-lg overflow-hidden">
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
                onClick={() => setFilterClaude(!filterClaude)}
                className={`text-[9px] px-2 py-0.5 rounded border transition-colors ${
                  filterClaude
                    ? 'bg-primary/15 text-primary border-primary/30'
                    : 'text-muted-foreground border-border hover:bg-accent'
                }`}
                title="Filter to Claude files only"
              >
                <Filter size={10} className="inline mr-1" />
                Claude
              </button>
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
            <FileGroup label="Global" files={globalFiles} color="text-blue-500" />
            <FileGroup label="Local" files={localFiles} color="text-green-500" />
            {filteredFiles.length === 0 && (
              <div className="text-center text-muted-foreground text-[12px] py-8">
                No .md files found
              </div>
            )}
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
  );
}
