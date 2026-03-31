export interface ConfigSource {
  scope: 'global' | 'local' | 'custom';
  name: string;
  path: string;
  found: boolean;
}

export interface McpServer {
  name: string;
  scope: 'global' | 'local' | 'custom';
  source: string;
  sourcePath?: string;
  type: string;
  url?: string;
  config: Record<string, unknown>;
}

export interface Plugin {
  name: string;
  scope: 'global' | 'local' | 'custom';
  source: string;
  version: string;
  installPath: string;
  marketplace: string;
  skills: string[];
  hooks: string[];
  agents: string[];
  commands: string[];
  mcpServers: string[];
}

export interface Skill {
  name: string;
  scope: 'global' | 'local' | 'custom';
  source: string;
  description?: string;
  filePath: string;
  size?: number; // total size in bytes of the skill directory or file
  lines?: number; // total lines of code across all files
  tokens?: number; // estimated token count (~1 token per 4 chars)
  alsoInAgents?: boolean; // true if this skill also exists in ~/.agents/skills/ (which is not read by Claude Code)
}

export interface Hook {
  name: string;
  scope: 'global' | 'local' | 'custom';
  source: string;
  sourcePath?: string;
  type: string;
  command: string;
  event?: string;
  matcher?: string;
  // Enrichment fields (populated from ~/.claude/hook-enrichments.json)
  description?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  contextImpact?: 'none' | 'injects' | 'modifies';
  origin?: string;
  tags?: string[];
  enrichedAt?: string;
}

export interface Agent {
  name: string;
  scope: 'global' | 'local';
  source: string;
  description?: string;
  model?: string;
  filePath: string;
}

export interface Command {
  name: string;
  scope: 'global' | 'local';
  source: string;
  description?: string;
  filePath: string;
}

export interface ProjectContext {
  projectPath: string | null;
  sources: ConfigSource[];
  mcpServers: McpServer[];
  plugins: Plugin[];
  skills: Skill[];
  hooks: Hook[];
  agents: Agent[];
  commands: Command[];
  claudeMd: string | null;
  markdownFiles: MarkdownFile[];
}

export interface MarkdownFile {
  path: string;
  name: string;
  scope: 'global' | 'local';
  relativePath: string;
}

export interface KnownProject {
  path: string;
  lastActive?: string;
  group?: 'conductor-repo' | 'conductor-worktree' | 'other';
}

/** A Conductor project: main repo + worktrees */
export interface ConductorProject {
  name: string;
  mainRepo: string | null;  // resolved from worktree .git pointers or conductor/repos/
  worktrees: { name: string; path: string }[];
}
