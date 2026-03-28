'use client';

import { useState } from 'react';
import type { KnownProject } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

  const sorted = [...projects].sort((a, b) => a.path.localeCompare(b.path));
  const knownPaths = new Set(sorted.map((p) => p.path));
  const extraPaths = browsedPaths.filter((p) => !knownPaths.has(p));

  const handleChange = async (val: string) => {
    if (val === '__browse__') {
      await handleBrowse();
      return;
    }
    onSelectProject(val === '__global__' ? null : val);
  };

  const browseViaPrompt = () => {
    const path = window.prompt('Enter the absolute path to your project folder:');
    if (path && path.trim()) {
      const trimmed = path.trim();
      if (!knownPaths.has(trimmed) && !browsedPaths.includes(trimmed)) {
        setBrowsedPaths((prev) => [...prev, trimmed]);
      }
      onSelectProject(trimmed);
    }
  };

  const handleBrowse = async () => {
    if (browsing) return;
    setBrowsing(true);
    try {
      const res = await fetch('/api/browse', { method: 'POST' });
      const data = await res.json();
      if (data.error || data.cancelled) {
        browseViaPrompt();
        return;
      }
      if (data.path) {
        if (!knownPaths.has(data.path) && !browsedPaths.includes(data.path)) {
          setBrowsedPaths((prev) => [...prev, data.path]);
        }
        onSelectProject(data.path);
      }
    } catch {
      browseViaPrompt();
    } finally {
      setBrowsing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedProject ?? '__global__'}
        onValueChange={handleChange}
        disabled={loading}
      >
        <SelectTrigger className="flex-1 h-10 bg-background/50 border-border/60 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.06-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
            </svg>
            <SelectValue placeholder="Select a project" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__global__">Global View</SelectItem>
          {sorted.map((p) => (
            <SelectItem key={p.path} value={p.path}>
              {p.path}
            </SelectItem>
          ))}
          {extraPaths.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
    </div>
  );
}
