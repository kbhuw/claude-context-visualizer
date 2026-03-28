'use client';

import { useState } from 'react';
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
  const [customPath, setCustomPath] = useState('');

  const sorted = [...projects].sort((a, b) => a.path.localeCompare(b.path));

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPath.trim()) {
      onSelectProject(customPath.trim());
      setCustomPath('');
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 min-w-0">
        <label className="block text-xs font-medium text-[#666] mb-1.5">
          Project
        </label>
        <select
          value={selectedProject ?? '__global__'}
          onChange={(e) => {
            const val = e.target.value;
            onSelectProject(val === '__global__' ? null : val);
          }}
          disabled={loading}
          className="w-full h-9 px-3 text-sm bg-white border border-[#e5e5e5] rounded-lg text-[#1a1a1a] outline-none focus:border-[#999] transition-colors duration-150 appearance-none cursor-pointer disabled:opacity-50"
        >
          <option value="__global__">Global View</option>
          {sorted.map((p) => (
            <option key={p.path} value={p.path}>
              {p.path}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={handleCustomSubmit} className="flex gap-2 sm:flex-shrink-0">
        <input
          type="text"
          placeholder="Custom path..."
          value={customPath}
          onChange={(e) => setCustomPath(e.target.value)}
          className="h-9 px-3 text-sm bg-white border border-[#e5e5e5] rounded-lg text-[#1a1a1a] outline-none focus:border-[#999] transition-colors duration-150 placeholder:text-[#999] w-full sm:w-56"
        />
        <button
          type="submit"
          disabled={!customPath.trim() || loading}
          className="h-9 px-4 text-sm font-medium bg-[#1a1a1a] text-white rounded-lg hover:bg-[#333] transition-colors duration-150 disabled:opacity-40 whitespace-nowrap"
        >
          Load
        </button>
      </form>

      <button
        onClick={() => onSelectProject(null)}
        disabled={loading || selectedProject === null}
        className="h-9 px-4 text-sm font-medium border border-[#e5e5e5] rounded-lg hover:bg-white transition-colors duration-150 disabled:opacity-40 whitespace-nowrap"
      >
        Global View
      </button>
    </div>
  );
}
