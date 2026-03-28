export interface ConfigSource {
  scope: 'global' | 'local' | 'custom';
  name: string;
  path: string;
  found: boolean;
}

export interface McpServer {
  name: string;
  scope: 'global' | 'local';
  source: string;
  type: string;
  url?: string;
  config: Record<string, unknown>;
}

export interface Plugin {
  name: string;
  scope: 'global' | 'local';
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
  scope: 'global' | 'local';
  source: string;
  description?: string;
  filePath: string;
}

export interface Hook {
  name: string;
  scope: 'global' | 'local';
  source: string;
  type: string;
  command: string;
}

export interface ProjectContext {
  projectPath: string | null;
  sources: ConfigSource[];
  mcpServers: McpServer[];
  plugins: Plugin[];
  skills: Skill[];
  hooks: Hook[];
  claudeMd: string | null;
}

export interface KnownProject {
  path: string;
  lastActive?: string;
}
