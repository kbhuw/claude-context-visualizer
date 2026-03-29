'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ExternalLink, X, ChevronRight, FileText, Plug, AlertCircle, Copy, FolderOpen, Check, MoreVertical } from 'lucide-react';
import type { ProjectContext } from '@/lib/types';

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
}

interface McpCapabilities {
  tools: McpTool[];
  resources: McpResource[];
  prompts: McpPrompt[];
  error?: string;
}

interface DetailPanelProps {
  item: Record<string, unknown> | null;
  type: string;
  onClose: () => void;
  onNavigate?: (type: string, item: Record<string, unknown>) => void;
  context?: ProjectContext | null;
  mcpCapabilitiesCache?: Record<string, McpCapabilities>;
  onMcpRefresh?: (serverName: string) => void;
  preventOverlayClose?: boolean;
}

function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token for English/code
  return Math.round(text.length / 4);
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/50 border border-border">
      <span className="text-[10px] text-muted-foreground uppercase">{label}</span>
      <span className="text-xs font-semibold text-foreground">{value}</span>
    </div>
  );
}

function SubItemPill({
  label,
  color,
  onClick,
}: {
  label: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full transition-all duration-150 hover:opacity-80 hover:scale-[1.02] ${color}`}
    >
      {label}
      {onClick && <ChevronRight className="w-2.5 h-2.5" />}
    </button>
  );
}

function DetailMenu({ filePath, onCopyPath, copiedPath }: {
  filePath: string;
  onCopyPath: () => void;
  copiedPath: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative flex-shrink-0" ref={menuRef}>
      <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} className="w-7 h-7">
        <MoreVertical className="w-4 h-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-md shadow-md py-1 min-w-[220px]">
          <div className="px-3 py-1.5 text-[11px] text-muted-foreground font-mono break-all border-b border-border mb-1">
            {filePath}
          </div>
          <button
            onClick={() => { onCopyPath(); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors flex items-center gap-2"
          >
            {copiedPath ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedPath ? 'Copied!' : 'Copy path'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function DetailPanel({ item, type, onClose, onNavigate, context, mcpCapabilitiesCache, onMcpRefresh, preventOverlayClose }: DetailPanelProps) {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [showRawConfig, setShowRawConfig] = useState(false);
  const [mcpCapabilities, setMcpCapabilities] = useState<McpCapabilities | null>(null);
  const [loadingMcp, setLoadingMcp] = useState(false);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [expandedContribution, setExpandedContribution] = useState<string | null>(null);
  const [expandedContribTool, setExpandedContribTool] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState(false);

  useEffect(() => {
    if (!item) {
      setFileContent(null);
      setShowRawConfig(false);
      setMcpCapabilities(null);
      setLoadingMcp(false);
      setExpandedTool(null);
      setExpandedContribution(null);
      setExpandedContribTool(null);
      setCopiedPath(false);
      return;
    }

    const filePath =
      (item.filePath as string) ||
      (item.installPath as string) ||
      (item.path as string) ||
      (item.sourcePath as string);

    if (filePath) {
      setLoadingFile(true);
      fetch(`/api/file?path=${encodeURIComponent(filePath)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.content) setFileContent(data.content);
          else setFileContent(null);
        })
        .catch(() => setFileContent(null))
        .finally(() => setLoadingFile(false));
    } else {
      setFileContent(null);
    }
  }, [item]);

  // Load MCP capabilities from cache when panel opens
  useEffect(() => {
    if (item && type === 'mcpServer') {
      const serverName = item.name as string;
      const cached = mcpCapabilitiesCache?.[serverName];
      if (cached) {
        setMcpCapabilities(cached);
        setLoadingMcp(false);
      } else if (!mcpCapabilities && !loadingMcp) {
        handleIntrospect();
      }
    }
  }, [item, type, mcpCapabilitiesCache]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleIntrospect = useCallback(async () => {
    if (!item) return;
    const serverName = item.name as string;

    // If we have a parent refresh callback, use it (updates cache + state)
    if (onMcpRefresh) {
      setLoadingMcp(true);
      setMcpCapabilities(null);
      setExpandedTool(null);
      onMcpRefresh(serverName);
      return;
    }

    // Fallback: direct fetch
    const config = item.config as Record<string, unknown>;
    const serverType = (item.type as string) || 'stdio';

    setLoadingMcp(true);
    setMcpCapabilities(null);
    setExpandedTool(null);
    try {
      const res = await fetch('/api/mcp-introspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, type: serverType }),
      });
      const data = await res.json();
      setMcpCapabilities(data);
    } catch (err) {
      setMcpCapabilities({
        tools: [],
        resources: [],
        prompts: [],
        error: err instanceof Error ? err.message : 'Failed to connect',
      });
    } finally {
      setLoadingMcp(false);
    }
  }, [item, onMcpRefresh]);

  const handleOpenInFinder = async () => {
    const filePath =
      (item?.filePath as string) ||
      (item?.installPath as string) ||
      (item?.path as string) ||
      (item?.source as string);
    if (!filePath) return;
    try {
      await fetch('/api/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath }),
      });
    } catch {
      // silently fail
    }
  };

  const handleCopyPath = () => {
    const filePath =
      (item?.filePath as string) ||
      (item?.installPath as string) ||
      (item?.path as string) ||
      (item?.source as string);
    if (!filePath) return;
    navigator.clipboard.writeText(filePath).then(() => {
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    });
  };

  // Resolve a contribution name to its full object from context
  const resolveContribution = (contType: string, contName: string): Record<string, unknown> | null => {
    if (!context) return null;
    if (contType === 'skill') return (context.skills.find(s => s.name === contName) as unknown as Record<string, unknown>) || null;
    if (contType === 'hook') return (context.hooks.find(h => h.name === contName) as unknown as Record<string, unknown>) || null;
    if (contType === 'mcpServer') return (context.mcpServers.find(s => s.name === contName) as unknown as Record<string, unknown>) || null;
    if (contType === 'command') return (context.commands?.find(c => c.name === contName) as unknown as Record<string, unknown>) || null;
    // "other" - try command first, then treat as agent
    if (contType === 'other') {
      const cmd = context.commands?.find(c => c.name === contName);
      if (cmd) return { ...cmd, _resolvedType: 'command' } as unknown as Record<string, unknown>;
      return { name: contName, _resolvedType: 'agent' } as Record<string, unknown>;
    }
    return null;
  };

  const name = (item?.name as string) || 'Unknown';
  const scope = item?.scope as string;
  const description = item?.description as string | undefined;

  // Compute stats from file content
  const lineCount = fileContent ? fileContent.split('\n').length : null;
  const tokenCount = fileContent ? estimateTokens(fileContent) : null;

  // Plugin sub-items
  const pluginSkills = (item?.skills as string[]) || [];
  const pluginHooks = (item?.hooks as string[]) || [];
  const pluginAgents = (item?.agents as string[]) || [];
  const pluginCommands = (item?.commands as string[]) || [];
  const pluginMcpServers = (item?.mcpServers as string[]) || [];
  const isPlugin = type === 'plugin';

  // Hook-specific
  const isHook = type === 'hook';
  const hookEvent = item?.event as string | undefined;
  const hookMatcher = item?.matcher as string | undefined;
  const hookCommand = item?.command as string | undefined;

  // MCP server config
  const isMcpServer = type === 'mcpServer';
  const serverConfig = item?.config as Record<string, unknown> | undefined;

  const pluginOther = [...pluginAgents, ...pluginCommands];
  const subSections = isPlugin
    ? [
        { label: 'MCP Servers', items: pluginMcpServers, color: 'bg-green-50 text-green-600', type: 'mcpServer' },
        { label: 'Skills', items: pluginSkills, color: 'bg-pink-50 text-pink-600', type: 'skill' },
        { label: 'Hooks', items: pluginHooks, color: 'bg-amber-50 text-amber-600', type: 'hook' },
        { label: 'Other', items: pluginOther, color: 'bg-secondary text-muted-foreground', type: 'other' },
      ]
    : [];

  const filePath =
    (item?.filePath as string) ||
    (item?.installPath as string) ||
    (item?.path as string) ||
    (item?.sourcePath as string) ||
    '';

  return (
    <Sheet open={item !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" preventOverlayClose={preventOverlayClose}>
        <SheetHeader>
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0 w-7 h-7">
              <X className="w-4 h-4" />
            </Button>
            <SheetTitle>{name}</SheetTitle>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase flex-shrink-0 ${
                scope === 'global'
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-100'
                  : scope === 'local'
                    ? 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-100'
                    : 'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-100'
              }`}
            >
              {scope}
            </span>
            {isPlugin && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-100 flex-shrink-0">
                plugin
              </span>
            )}
            {isPlugin && !!item?.version && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-secondary text-muted-foreground flex-shrink-0">
                v{String(item.version)}
              </span>
            )}
            {!isPlugin && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-secondary text-muted-foreground flex-shrink-0">
                {type}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {filePath && (
              <>
                <Button variant="outline" size="sm" onClick={handleOpenInFinder} className="gap-1.5 h-7 text-xs">
                  <FolderOpen className="w-3 h-3" />
                  Open in Finder
                </Button>
                <DetailMenu
                  filePath={filePath}
                  onCopyPath={handleCopyPath}
                  copiedPath={copiedPath}
                />
              </>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Header info */}
          <div className={`px-5 py-4 space-y-3 ${!isPlugin ? 'border-b border-border' : ''}`}>
            {/* Description */}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}

            {/* Stats (non-plugin) */}
            {!isPlugin && (lineCount !== null || tokenCount !== null) && (
              <div className="flex items-center gap-2 flex-wrap">
                {lineCount !== null && <StatBadge label="Lines" value={formatNumber(lineCount)} />}
                {tokenCount !== null && <StatBadge label="~Tokens" value={formatNumber(tokenCount)} />}
              </div>
            )}
          </div>

          {/* MCP Server details */}
          {isMcpServer && serverConfig && (
            <div className="px-5 py-4 border-b border-border space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Server Configuration
              </h3>
              <div className="space-y-1.5">
                {!!serverConfig.type && (
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">Type</span>
                    <span className="text-sm font-mono text-foreground">{String(serverConfig.type)}</span>
                  </div>
                )}
                {!!serverConfig.command && (
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">Command</span>
                    <span className="text-sm font-mono text-foreground break-all">{String(serverConfig.command)}</span>
                  </div>
                )}
                {!!serverConfig.args && Array.isArray(serverConfig.args) && (
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">Args</span>
                    <span className="text-sm font-mono text-foreground break-all">{(serverConfig.args as string[]).join(' ')}</span>
                  </div>
                )}
                {!!serverConfig.url && (
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">URL</span>
                    <span className="text-sm font-mono text-foreground break-all">{String(serverConfig.url)}</span>
                  </div>
                )}
                {!!serverConfig.env && typeof serverConfig.env === 'object' && (
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">Env</span>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(serverConfig.env as Record<string, unknown>).map((key) => (
                        <span key={key} className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-foreground font-mono">
                          {key}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hook Configuration */}
          {isHook && (
            <div className="px-5 py-4 border-b border-border space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Hook Configuration
              </h3>
              <div className="space-y-1.5">
                {hookEvent && (
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">Event</span>
                    <span className="text-sm font-mono text-foreground">
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-100 text-xs font-semibold">
                        {hookEvent}
                      </span>
                    </span>
                  </div>
                )}
                {hookMatcher && (
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">Matcher</span>
                    <span className="text-sm font-mono text-foreground break-all">{hookMatcher}</span>
                  </div>
                )}
                {hookCommand && (
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">Command</span>
                    <span className="text-sm font-mono text-foreground break-all">{hookCommand}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">Source</span>
                  <span className="text-sm text-foreground">{item?.source as string}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[11px] text-muted-foreground w-16 flex-shrink-0">Scope</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                    scope === 'global'
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-100'
                      : 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-100'
                  }`}>
                    {scope}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* MCP Introspection */}
          {isMcpServer && (
            <div className="px-5 py-4 border-b border-border space-y-3">
              {/* Auto-introspection happens on open — no manual button needed */}

              {loadingMcp && (
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connecting to server...
                </div>
              )}

              {mcpCapabilities?.error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-destructive">{mcpCapabilities.error}</div>
                </div>
              )}

              {mcpCapabilities && !mcpCapabilities.error && (
                <div className="space-y-4">
                  {/* Summary badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {mcpCapabilities.tools.length > 0 && (
                      <StatBadge label="Tools" value={String(mcpCapabilities.tools.length)} />
                    )}
                    {mcpCapabilities.resources.length > 0 && (
                      <StatBadge label="Resources" value={String(mcpCapabilities.resources.length)} />
                    )}
                    {mcpCapabilities.prompts.length > 0 && (
                      <StatBadge label="Prompts" value={String(mcpCapabilities.prompts.length)} />
                    )}
                  </div>

                  {/* Tools */}
                  {mcpCapabilities.tools.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Tools ({mcpCapabilities.tools.length})
                      </h3>
                      <div className="space-y-1">
                        {mcpCapabilities.tools.map((tool) => (
                          <div key={tool.name} className="border border-border rounded-lg overflow-hidden">
                            <button
                              onClick={() => setExpandedTool(expandedTool === tool.name ? null : tool.name)}
                              className="w-full text-left px-3 py-2 hover:bg-accent/50 transition-colors flex items-start gap-2"
                            >
                              <ChevronRight
                                className={`w-3 h-3 flex-shrink-0 mt-0.5 transition-transform duration-150 ${
                                  expandedTool === tool.name ? 'rotate-90' : ''
                                }`}
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-semibold font-mono text-foreground">{tool.name}</div>
                                {tool.description && (
                                  <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                                    {tool.description}
                                  </div>
                                )}
                              </div>
                            </button>
                            {expandedTool === tool.name && tool.inputSchema && (
                              <div className="px-3 pb-2 border-t border-border bg-accent/30">
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-2 mb-1">
                                  Input Schema
                                </div>
                                <pre className="text-[11px] font-mono text-foreground whitespace-pre-wrap overflow-auto max-h-64">
                                  {JSON.stringify(tool.inputSchema, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resources */}
                  {mcpCapabilities.resources.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Resources ({mcpCapabilities.resources.length})
                      </h3>
                      <div className="space-y-1">
                        {mcpCapabilities.resources.map((resource) => (
                          <div key={resource.uri} className="px-3 py-2 border border-border rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold font-mono text-foreground">{resource.name}</span>
                              {resource.mimeType && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                                  {resource.mimeType}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{resource.uri}</div>
                            {resource.description && (
                              <div className="text-[11px] text-muted-foreground mt-0.5">{resource.description}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prompts */}
                  {mcpCapabilities.prompts.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Prompts ({mcpCapabilities.prompts.length})
                      </h3>
                      <div className="space-y-1">
                        {mcpCapabilities.prompts.map((prompt) => (
                          <div key={prompt.name} className="px-3 py-2 border border-border rounded-lg">
                            <div className="text-xs font-semibold font-mono text-foreground">{prompt.name}</div>
                            {prompt.description && (
                              <div className="text-[11px] text-muted-foreground mt-0.5">{prompt.description}</div>
                            )}
                            {prompt.arguments && prompt.arguments.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {prompt.arguments.map((arg) => (
                                  <span
                                    key={arg.name}
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                      arg.required
                                        ? 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-100'
                                        : 'bg-secondary text-muted-foreground'
                                    }`}
                                  >
                                    {arg.name}{arg.required ? '*' : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Re-inspect button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleIntrospect}
                    className="w-full text-xs text-muted-foreground"
                  >
                    Re-inspect
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Plugin contributions - expandable inline */}
          {isPlugin && subSections.some(s => s.items.length > 0) && (
            <div className="px-5 py-4 border-b border-border space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Contributions
              </h3>
              {subSections
                .filter((s) => s.items.length > 0)
                .map((section) => (
                  <div key={section.label}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      {section.label} ({section.items.length})
                    </div>
                    <div className="space-y-1">
                      {section.items.map((subItem) => {
                        const contKey = `${section.type}:${subItem}`;
                        const isExpanded = expandedContribution === contKey;
                        const resolved = isExpanded ? resolveContribution(section.type, subItem) : null;
                        return (
                          <div key={subItem} className="border border-border rounded-lg overflow-hidden">
                            <button
                              onClick={() => setExpandedContribution(isExpanded ? null : contKey)}
                              className={`w-full text-left px-3 py-2 hover:bg-accent/50 transition-colors flex items-center gap-2 ${section.color} bg-opacity-10`}
                            >
                              <ChevronRight
                                className={`w-3 h-3 flex-shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
                              />
                              <span className="text-xs font-medium">{subItem}</span>
                            </button>
                            {isExpanded && (
                              <div className="px-3 py-2 border-t border-border bg-accent/20 space-y-2">
                                {resolved ? (
                                  <>
                                    {/* Skill details */}
                                    {section.type === 'skill' && (
                                      <>
                                        {!!resolved.description && (
                                          <div className="text-[11px] text-muted-foreground">{String(resolved.description)}</div>
                                        )}
                                        {!!resolved.filePath && (
                                          <div className="text-[10px] font-mono text-muted-foreground break-all">{String(resolved.filePath)}</div>
                                        )}
                                      </>
                                    )}
                                    {/* Hook details */}
                                    {section.type === 'hook' && (
                                      <>
                                        {!!resolved.type && (
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-muted-foreground">Event:</span>
                                            <span className="text-[11px] font-mono text-foreground">{String(resolved.type)}</span>
                                          </div>
                                        )}
                                        {!!resolved.command && (
                                          <div className="flex items-start gap-2">
                                            <span className="text-[10px] text-muted-foreground">Command:</span>
                                            <span className="text-[11px] font-mono text-foreground break-all">{String(resolved.command)}</span>
                                          </div>
                                        )}
                                      </>
                                    )}
                                    {/* MCP Server details — full primitive view with tools */}
                                    {section.type === 'mcpServer' && (() => {
                                      const cachedCaps = mcpCapabilitiesCache?.[subItem];
                                      return (
                                        <>
                                          {!!resolved.type && (
                                            <div className="flex items-center gap-2">
                                              <span className="text-[10px] text-muted-foreground">Type:</span>
                                              <span className="text-[11px] font-mono text-foreground">{String(resolved.type)}</span>
                                            </div>
                                          )}
                                          {!!(resolved.config as Record<string, unknown>)?.command && (
                                            <div className="flex items-start gap-2">
                                              <span className="text-[10px] text-muted-foreground">Command:</span>
                                              <span className="text-[11px] font-mono text-foreground break-all">{String((resolved.config as Record<string, unknown>).command)}</span>
                                            </div>
                                          )}
                                          {!!(resolved.config as Record<string, unknown>)?.url && (
                                            <div className="flex items-start gap-2">
                                              <span className="text-[10px] text-muted-foreground">URL:</span>
                                              <span className="text-[11px] font-mono text-foreground break-all">{String((resolved.config as Record<string, unknown>).url)}</span>
                                            </div>
                                          )}
                                          {/* Tools — full expandable list */}
                                          {cachedCaps && !cachedCaps.error && cachedCaps.tools.length > 0 && (
                                            <div className="mt-2">
                                              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                                Tools ({cachedCaps.tools.length})
                                              </div>
                                              <div className="space-y-1">
                                                {cachedCaps.tools.map((tool) => {
                                                  const toolKey = `${subItem}:${tool.name}`;
                                                  const isToolExpanded = expandedContribTool === toolKey;
                                                  return (
                                                    <div key={tool.name} className="border border-border rounded overflow-hidden">
                                                      <button
                                                        onClick={(e) => { e.stopPropagation(); setExpandedContribTool(isToolExpanded ? null : toolKey); }}
                                                        className="w-full text-left px-2 py-1.5 hover:bg-accent/50 transition-colors flex items-start gap-1.5"
                                                      >
                                                        <ChevronRight className={`w-2.5 h-2.5 flex-shrink-0 mt-0.5 transition-transform duration-150 ${isToolExpanded ? 'rotate-90' : ''}`} />
                                                        <div className="min-w-0">
                                                          <div className="text-[11px] font-semibold font-mono text-foreground">{tool.name}</div>
                                                          {tool.description && (
                                                            <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{tool.description}</div>
                                                          )}
                                                        </div>
                                                      </button>
                                                      {isToolExpanded && tool.inputSchema && (
                                                        <div className="px-2 pb-1.5 border-t border-border bg-accent/30">
                                                          <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mt-1.5 mb-1">Input Schema</div>
                                                          <pre className="text-[10px] font-mono text-foreground whitespace-pre-wrap overflow-auto max-h-48">
                                                            {JSON.stringify(tool.inputSchema, null, 2)}
                                                          </pre>
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          )}
                                          {/* Resources */}
                                          {cachedCaps && !cachedCaps.error && cachedCaps.resources.length > 0 && (
                                            <div className="mt-2">
                                              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                                Resources ({cachedCaps.resources.length})
                                              </div>
                                              <div className="space-y-1">
                                                {cachedCaps.resources.map((resource) => (
                                                  <div key={resource.uri} className="px-2 py-1 border border-border rounded">
                                                    <div className="text-[11px] font-semibold font-mono text-foreground">{resource.name}</div>
                                                    <div className="text-[10px] font-mono text-muted-foreground">{resource.uri}</div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          {cachedCaps && cachedCaps.error && (
                                            <div className="flex items-start gap-1.5 mt-1 text-[10px] text-destructive">
                                              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                              {cachedCaps.error}
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}
                                    {/* Other (agents/commands) details */}
                                    {section.type === 'other' && (
                                      <>
                                        {resolved._resolvedType === 'command' && (
                                          <>
                                            <div className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-cyan-50 text-cyan-600 inline-block">command</div>
                                            {!!resolved.description && (
                                              <div className="text-[11px] text-muted-foreground mt-1">{String(resolved.description)}</div>
                                            )}
                                          </>
                                        )}
                                        {resolved._resolvedType === 'agent' && (
                                          <div className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-indigo-50 text-indigo-600 inline-block">agent</div>
                                        )}
                                      </>
                                    )}
                                  </>
                                ) : (
                                  <div className="text-[11px] text-muted-foreground italic">
                                    {section.type === 'agent' ? 'Agent contributed by this plugin' : 'Details not available'}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* File Content - prominent, shown first (not for plugins) */}
          {!isPlugin && loadingFile && (
            <div className="px-5 py-8 text-center">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading file content...
              </div>
            </div>
          )}
          {!isPlugin && fileContent && !loadingFile && (
            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {isHook ? 'Script Source' : 'File Content'}
                </h3>
              </div>
              <div className="bg-accent/50 border border-border rounded-lg p-3 overflow-auto">
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">
                  {fileContent}
                </pre>
              </div>
            </div>
          )}

          {/* Raw Config - collapsed by default, compact */}
          <div className="px-5 py-3">
            <button
              onClick={() => setShowRawConfig(!showRawConfig)}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              <ChevronRight
                className={`w-2.5 h-2.5 transition-transform duration-150 ${showRawConfig ? 'rotate-90' : ''}`}
              />
              <span className="font-medium uppercase tracking-wider">Raw Config</span>
            </button>
            {showRawConfig && (
              <div className="mt-1.5 bg-accent/30 border border-border rounded p-2 overflow-x-auto max-h-48">
                <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap">
                  {JSON.stringify(item, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
