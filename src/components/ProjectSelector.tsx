'use client';

import { useState, useRef, useEffect } from 'react';
import type { KnownProject } from '@/lib/types';

interface ProjectSelectorProps {
  projects: KnownProject[];
  selectedProject: string | null;
  onSelectProject: (path: string | null) => void;
  loading: boolean;
}

export default function ProjectSelector({
  projects,
  selectedProject,
  onSelectProject,
  loading,
}: ProjectSelectorProps) {
  const [browsedPaths, setBrowsedPaths] = useState<string[]>([]);
  const [browsing, setBrowsing] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sorted = [...projects].sort((a, b) => a.path.localeCompare(b.path));
  const knownPaths = new Set(sorted.map((p) => p.path));
  const extraPaths = browsedPaths.filter((p) => !knownPaths.has(p));

  /** Turn a full path into a friendly display name.
   *  e.g. "/Users/kush/conductor/workspaces/puffle-app/kyoto-v4" → "puffle-app / kyoto-v4"
   *       "/Users/kush/Documents/puffle/jam" → "puffle / jam"
   *       "/Users/kush/clawd" → "clawd"
   */
  const friendlyName = (fullPath: string): string => {
    const home = fullPath.replace(/^\/Users\/[^/]+/, '~');
    const parts = home.split('/').filter(Boolean);
    // Drop common prefixes: ~, Documents, conductor/repos, conductor/workspaces
    const skip = new Set(['~', 'Documents', 'conductor', 'repos', 'workspaces', '.paperclip', 'instances', 'default']);
    const meaningful = parts.filter(p => !skip.has(p));
    if (meaningful.length === 0) return fullPath;
    // Show last 2-3 meaningful segments
    const show = meaningful.slice(-Math.min(3, meaningful.length));
    return show.join(' / ');
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (val: string) => {
    setOpen(false);
    onSelectProject(val === '__global__' ? null : val);
  };

  const addAndSelect = (folderPath: string) => {
    if (!knownPaths.has(folderPath) && !browsedPaths.includes(folderPath)) {
      setBrowsedPaths((prev) => [...prev, folderPath]);
    }
    onSelectProject(folderPath);
  };

  const handleBrowse = async () => {
    if (browsing) return;
    setBrowsing(true);
    try {
      // Try native macOS folder picker first (works when not in a sandboxed browser)
      const res = await fetch('/api/browse', { method: 'POST' });
      const data = await res.json();
      if (!data.error && !data.cancelled && data.path) {
        addAndSelect(data.path);
        return;
      }
    } catch {
      // API failed — fall through to browser file picker
    } finally {
      setBrowsing(false);
    }
    // Fallback: use browser directory picker (File System Access API or webkitdirectory input)
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
        // The handle only gives us the folder name, not the absolute path.
        // We need to resolve via the server.
        const res = await fetch('/api/browse/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: dirHandle.name }),
        });
        const data = await res.json();
        if (data.path) {
          addAndSelect(data.path);
          return;
        }
      } catch {
        // User cancelled or API not available
      }
    }
    // Final fallback: webkitdirectory input
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    // webkitRelativePath gives us "folderName/..." — extract the absolute path from the first file
    const firstPath = files[0].webkitRelativePath;
    if (firstPath) {
      // The browser only gives relative paths. Fall back to prompt for the absolute path.
      const folderName = firstPath.split('/')[0];
      const path = window.prompt(
        `Selected folder: "${folderName}"\nEnter the full absolute path to this folder:`,
        folderName,
      );
      if (path?.trim()) {
        addAndSelect(path.trim());
      }
    }
    // Reset so the same folder can be re-selected
    e.target.value = '';
  };

  const displayValue = selectedProject ? friendlyName(selectedProject) : 'Global View';

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1" ref={dropdownRef}>
        <button
          onClick={() => !loading && setOpen(!open)}
          disabled={loading}
          className="flex h-10 w-full items-center justify-between rounded-lg border border-border/60 bg-background/50 px-3 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.06-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
            </svg>
            <span className="truncate">{displayValue}</span>
          </div>
          <svg className="h-4 w-4 opacity-50 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md py-1 max-h-80 overflow-auto">
            <button
              onClick={() => handleSelect('__global__')}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors ${
                !selectedProject ? 'bg-accent font-medium' : ''
              }`}
            >
              Global View
            </button>
            {sorted.map((p) => (
              <button
                key={p.path}
                onClick={() => handleSelect(p.path)}
                className={`w-full text-left px-3 py-2 hover:bg-accent transition-colors ${
                  selectedProject === p.path ? 'bg-accent font-medium' : ''
                }`}
              >
                <div className="text-sm truncate">{friendlyName(p.path)}</div>
                <div className="text-[11px] text-muted-foreground truncate">{p.path}</div>
              </button>
            ))}
            {extraPaths.map((p) => (
              <button
                key={p}
                onClick={() => handleSelect(p)}
                className={`w-full text-left px-3 py-2 hover:bg-accent transition-colors ${
                  selectedProject === p ? 'bg-accent font-medium' : ''
                }`}
              >
                <div className="text-sm truncate">{friendlyName(p)}</div>
                <div className="text-[11px] text-muted-foreground truncate">{p}</div>
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={handleBrowse}
        disabled={loading || browsing}
        className="h-10 w-10 flex-shrink-0 inline-flex items-center justify-center rounded-md border border-border/60 bg-background/50 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
        title="Browse for folder"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19-2.12-2.12a1.5 1.5 0 0 0-1.06-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
        </svg>
      </button>
      {/* Hidden input for webkitdirectory fallback */}
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
