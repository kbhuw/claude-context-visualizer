'use client';

import { useEffect, useState, useCallback } from 'react';
import type { KnownProject, ProjectContext } from '@/lib/types';
import ProjectSelector from '@/components/ProjectSelector';
import SourcesPanel from '@/components/SourcesPanel';
import TabNav from '@/components/TabNav';
import OverviewTab from '@/components/OverviewTab';
import McpServersTab from '@/components/McpServersTab';
import PluginsTab from '@/components/PluginsTab';
import SkillsTab from '@/components/SkillsTab';
import HooksTab from '@/components/HooksTab';
import ClaudeMdTab from '@/components/ClaudeMdTab';
import DetailPanel from '@/components/DetailPanel';

export default function Home() {
  const [projects, setProjects] = useState<KnownProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [context, setContext] = useState<ProjectContext | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail panel state
  const [detailItem, setDetailItem] = useState<Record<string, unknown> | null>(null);
  const [detailType, setDetailType] = useState('');

  // Fetch known projects on mount
  useEffect(() => {
    fetch('/api/projects')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setProjects(data))
      .catch(() => setProjects([]));
  }, []);

  // Fetch context when project changes
  const fetchContext = useCallback(async (projectPath: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const url = projectPath
        ? `/api/context?project=${encodeURIComponent(projectPath)}`
        : '/api/context';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load context (${res.status})`);
      const data = await res.json();
      setContext(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load context');
      setContext(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContext(selectedProject);
  }, [selectedProject, fetchContext]);

  const handleSelectProject = (path: string | null) => {
    setSelectedProject(path);
    setDetailItem(null);
  };

  const handleSelectItem = (type: string, item: Record<string, unknown>) => {
    setDetailType(type);
    setDetailItem(item);
  };

  const counts: Record<string, number> = {
    mcpServers: context?.mcpServers.length ?? 0,
    plugins: context?.plugins.length ?? 0,
    skills: context?.skills.length ?? 0,
    hooks: context?.hooks.length ?? 0,
    claudeMd: context?.claudeMd ? 1 : 0,
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="bg-white border-b border-[#e5e5e5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
          <h1 className="text-lg font-semibold text-[#1a1a1a] tracking-tight">
            Claude Context Visualizer
          </h1>
          <p className="text-sm text-[#666] mt-0.5">
            Inspect and explore your Claude Code configuration across all sources
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Project Selector */}
        <ProjectSelector
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={handleSelectProject}
          loading={loading}
        />

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-sm text-[#666]">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading context...
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Content */}
        {context && !loading && (
          <>
            {/* Sources Panel */}
            <SourcesPanel sources={context.sources} />

            {/* Tabs */}
            <TabNav activeTab={activeTab} onTabChange={setActiveTab} counts={counts} />

            {/* Tab Content */}
            <div className="pt-1">
              {activeTab === 'overview' && (
                <OverviewTab
                  mcpServers={context.mcpServers}
                  plugins={context.plugins}
                  skills={context.skills}
                  hooks={context.hooks}
                  onSelectItem={handleSelectItem}
                />
              )}

              {activeTab === 'mcpServers' && (
                <McpServersTab
                  servers={context.mcpServers}
                  onSelectItem={(item) => handleSelectItem('mcpServer', item)}
                />
              )}

              {activeTab === 'plugins' && (
                <PluginsTab
                  plugins={context.plugins}
                  onSelectItem={(item) => handleSelectItem('plugin', item)}
                  onSelectSubItem={(type, name) =>
                    handleSelectItem(type, { name, type } as Record<string, unknown>)
                  }
                />
              )}

              {activeTab === 'skills' && (
                <SkillsTab
                  skills={context.skills}
                  onSelectItem={(item) => handleSelectItem('skill', item)}
                />
              )}

              {activeTab === 'hooks' && (
                <HooksTab
                  hooks={context.hooks}
                  onSelectItem={(item) => handleSelectItem('hook', item)}
                />
              )}

              {activeTab === 'claudeMd' && (
                <ClaudeMdTab content={context.claudeMd} />
              )}
            </div>
          </>
        )}

        {/* Empty state when no context and no loading */}
        {!context && !loading && !error && (
          <div className="text-center py-20">
            <div className="text-[#999] text-sm">
              Select a project or use Global View to get started
            </div>
          </div>
        )}
      </main>

      {/* Detail Panel */}
      <DetailPanel
        item={detailItem}
        type={detailType}
        onClose={() => setDetailItem(null)}
      />
    </div>
  );
}
