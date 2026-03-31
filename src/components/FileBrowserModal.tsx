'use client';

import { useState, useEffect, useCallback } from 'react';
import { Folder, FileText, ChevronRight, ArrowUp, X, Home, Globe, FolderOpen } from 'lucide-react';
import type { MarkdownFile } from '@/lib/types';

interface DirEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

interface FileBrowserModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (filePath: string) => void;
  initialDir?: string;
  markdownFiles?: MarkdownFile[];
}

export default function FileBrowserModal({ open, onClose, onSelect, initialDir, markdownFiles }: FileBrowserModalProps) {
  const [mode, setMode] = useState<'scanned' | 'browse'>('scanned');
  const [currentDir, setCurrentDir] = useState(initialDir || '~/.claude');
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDir = useCallback(async (dir: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ls?dir=${encodeURIComponent(dir)}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setCurrentDir(data.dir);
      setEntries(data.items);
    } catch {
      setError('Failed to load directory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && mode === 'browse') {
      loadDir(initialDir || '~/.claude');
    }
  }, [open, mode, initialDir, loadDir]);

  // Reset to scanned mode when reopening
  useEffect(() => {
    if (open && markdownFiles && markdownFiles.length > 0) {
      setMode('scanned');
    } else if (open) {
      setMode('browse');
    }
  }, [open, markdownFiles]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const globalFiles = markdownFiles?.filter((f) => f.scope === 'global') || [];
  const localFiles = markdownFiles?.filter((f) => f.scope === 'local') || [];
  const hasScannedFiles = globalFiles.length > 0 || localFiles.length > 0;

  const parentDir = currentDir.split('/').slice(0, -1).join('/') || '/';
  const segments = currentDir.split('/').filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-lg shadow-xl w-[480px] max-h-[60vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold">Select file to @include</span>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-accent"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode toggle */}
        {hasScannedFiles && (
          <div className="flex items-center gap-1 px-4 py-2 border-b border-border">
            <button
              type="button"
              onClick={() => setMode('scanned')}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                mode === 'scanned'
                  ? 'bg-primary/15 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              Scanned Files
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('browse');
                loadDir(initialDir || '~/.claude');
              }}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                mode === 'browse'
                  ? 'bg-primary/15 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              Browse
            </button>
          </div>
        )}

        {/* Scanned files view */}
        {mode === 'scanned' && (
          <div className="flex-1 overflow-auto py-1">
            {localFiles.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-green-500">
                  <FolderOpen size={12} />
                  Local
                </div>
                {localFiles.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => {
                      onSelect(file.path);
                      onClose();
                    }}
                    className="w-full text-left px-4 py-1.5 text-[13px] flex items-center gap-2 hover:bg-accent hover:text-foreground transition-colors text-foreground"
                  >
                    <FileText size={14} className="text-green-500 flex-shrink-0" />
                    <span className="truncate">{file.relativePath}</span>
                  </button>
                ))}
              </div>
            )}
            {globalFiles.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-blue-500">
                  <Globe size={12} />
                  Global
                </div>
                {globalFiles.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => {
                      onSelect(file.path);
                      onClose();
                    }}
                    className="w-full text-left px-4 py-1.5 text-[13px] flex items-center gap-2 hover:bg-accent hover:text-foreground transition-colors text-foreground"
                  >
                    <FileText size={14} className="text-blue-500 flex-shrink-0" />
                    <span className="truncate">{file.relativePath}</span>
                  </button>
                ))}
              </div>
            )}
            {!hasScannedFiles && (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                No scanned files available
              </div>
            )}
          </div>
        )}

        {/* Browse view */}
        {mode === 'browse' && (
          <>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-border text-[12px] text-muted-foreground overflow-x-auto">
              <button
                type="button"
                onClick={() => loadDir('~')}
                className="hover:text-foreground p-0.5 rounded hover:bg-accent flex-shrink-0"
                title="Home"
              >
                <Home size={13} />
              </button>
              {segments.map((seg, i) => {
                const segPath = '/' + segments.slice(0, i + 1).join('/');
                return (
                  <span key={segPath} className="flex items-center gap-1 flex-shrink-0">
                    <ChevronRight size={11} className="opacity-40" />
                    <button
                      type="button"
                      onClick={() => loadDir(segPath)}
                      className="hover:text-foreground hover:underline"
                    >
                      {seg}
                    </button>
                  </span>
                );
              })}
            </div>

            {/* File list */}
            <div className="flex-1 overflow-auto py-1">
              {/* Go up */}
              <button
                type="button"
                onClick={() => loadDir(parentDir)}
                className="w-full text-left px-4 py-1.5 text-[13px] flex items-center gap-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <ArrowUp size={14} />
                <span>..</span>
              </button>

              {loading && (
                <div className="px-4 py-8 text-center text-muted-foreground text-sm">Loading...</div>
              )}

              {error && (
                <div className="px-4 py-8 text-center text-red-500 text-sm">{error}</div>
              )}

              {!loading && !error && entries.map((entry) => (
                <button
                  key={entry.path}
                  type="button"
                  onClick={() => {
                    if (entry.isDirectory) {
                      loadDir(entry.path);
                    } else {
                      onSelect(entry.path);
                      onClose();
                    }
                  }}
                  className="w-full text-left px-4 py-1.5 text-[13px] flex items-center gap-2 hover:bg-accent hover:text-foreground transition-colors text-foreground"
                >
                  {entry.isDirectory ? (
                    <Folder size={14} className="text-blue-500 flex-shrink-0" />
                  ) : (
                    <FileText size={14} className="text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="truncate">{entry.name}</span>
                  {entry.isDirectory && <ChevronRight size={12} className="ml-auto opacity-40 flex-shrink-0" />}
                </button>
              ))}

              {!loading && !error && entries.length === 0 && (
                <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                  No .md files or folders here
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
