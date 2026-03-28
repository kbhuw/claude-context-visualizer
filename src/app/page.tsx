'use client';

import { useEffect, useState, useCallback } from 'react';
import type { KnownProject, ProjectContext, ConfigSource } from '@/lib/types';
import ProjectSelector from '@/components/ProjectSelector';
import SourcesPanel from '@/components/SourcesPanel';
import TabNav from '@/components/TabNav';
import OverviewTab from '@/components/OverviewTab';
import McpServersTab from '@/components/McpServersTab';
import PluginsTab from '@/components/PluginsTab';
import SkillsTab from '@/components/SkillsTab';
import HooksTab from '@/components/HooksTab';
import ClaudeMdTab from '@/components/ClaudeMdTab';
import MarkdownsTab from '@/components/MarkdownsTab';
import DetailPanel from '@/components/DetailPanel';
import ThemeToggle from '@/components/ThemeToggle';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [customSources, setCustomSources] = useState<string[]>([]);

  // Fetch known projects on mount
  useEffect(() => {
    fetch('/api/projects')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setProjects(data))
      .catch(() => setProjects([]));
  }, []);

  // Fetch context when project changes
  const fetchContext = useCallback(async (projectPath: string | null, extraSources: string[] = []) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (projectPath) params.set('project', projectPath);
      for (const src of extraSources) {
        params.append('customSource', src);
      }
      const url = `/api/context?${params.toString()}`;
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
    fetchContext(selectedProject, customSources);
  }, [selectedProject, customSources, fetchContext]);

  const handleAddSource = (sourcePath: string) => {
    if (!customSources.includes(sourcePath)) {
      setCustomSources((prev) => [...prev, sourcePath]);
    }
  };

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
    markdowns: context?.markdownFiles?.length ?? 0,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-foreground tracking-tight">
              Claude Context Visualizer
            </h1>
            <ThemeToggle />
          </div>
          <ProjectSelector
            projects={projects}
            selectedProject={selectedProject}
            onSelectProject={handleSelectProject}
            loading={loading}
          />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
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
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Content */}
        {context && !loading && (
          <>
            {/* Sources Panel */}
            <SourcesPanel
              sources={context.sources}
              onAddSource={handleAddSource}
              onSelectSource={(source: ConfigSource) => {
                handleSelectItem('source', {
                  name: source.name,
                  scope: source.scope,
                  source: source.scope,
                  path: source.path,
                  found: source.found,
                });
              }}
            />

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

              {activeTab === 'markdowns' && (
                <MarkdownsTab markdownFiles={context.markdownFiles ?? []} />
              )}
            </div>
          </>
        )}

        {/* Empty state when no context and no loading */}
        {!context && !loading && !error && (
          <div className="text-center py-20">
            <div className="text-muted-foreground text-sm">
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
        onNavigate={(navType, navItem) => {
          // Find the full item from context by name and type
          if (!context) return;
          let found: Record<string, unknown> | undefined;
          if (navType === 'skill') {
            found = context.skills.find(s => s.name === navItem.name) as unknown as Record<string, unknown>;
          } else if (navType === 'hook') {
            found = context.hooks.find(h => h.name === navItem.name) as unknown as Record<string, unknown>;
          } else if (navType === 'mcpServer') {
            found = context.mcpServers.find(s => s.name === navItem.name) as unknown as Record<string, unknown>;
          } else if (navType === 'command') {
            found = context.commands?.find(c => c.name === navItem.name) as unknown as Record<string, unknown>;
          }
          handleSelectItem(navType, found || navItem);
        }}
      />
    </div>
  );
}
