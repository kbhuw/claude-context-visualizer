import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  ConfigSource,
  McpServer,
  Plugin,
  Skill,
  Hook,
  ProjectContext,
} from './types';

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(filePath: string): Promise<unknown | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function parseFrontmatter(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const parts = content.split('---');
  if (parts.length < 3) return result;
  const frontmatter = parts[1].trim();
  for (const line of frontmatter.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    result[key] = value;
  }
  return result;
}

async function listDir(dirPath: string): Promise<string[]> {
  try {
    return await fs.readdir(dirPath);
  } catch {
    return [];
  }
}

async function scanPluginDir(
  installPath: string,
  pluginName: string,
  scope: 'global' | 'local'
): Promise<{ skills: Skill[]; hooks: Hook[]; agents: string[]; commands: string[]; mcpServers: string[] }> {
  const skills: Skill[] = [];
  const hooks: Hook[] = [];
  const agents: string[] = [];
  const commands: string[] = [];
  const mcpServers: string[] = [];

  // Scan skills/
  const skillsDir = path.join(installPath, 'skills');
  const skillEntries = await listDir(skillsDir);
  for (const entry of skillEntries) {
    const entryPath = path.join(skillsDir, entry);
    try {
      const stat = await fs.stat(entryPath);
      if (stat.isDirectory()) {
        // Look for .md files inside the skill directory
        const mdFiles = (await listDir(entryPath)).filter(f => f.endsWith('.md'));
        if (mdFiles.length > 0) {
          const mdPath = path.join(entryPath, mdFiles[0]);
          const content = await fs.readFile(mdPath, 'utf-8');
          const fm = parseFrontmatter(content);
          skills.push({
            name: fm.name || entry,
            scope,
            source: pluginName,
            description: fm.description,
            filePath: mdPath,
          });
        } else {
          skills.push({
            name: entry,
            scope,
            source: pluginName,
            filePath: entryPath,
          });
        }
      } else if (entry.endsWith('.md')) {
        const content = await fs.readFile(entryPath, 'utf-8');
        const fm = parseFrontmatter(content);
        skills.push({
          name: fm.name || entry.replace(/\.md$/, ''),
          scope,
          source: pluginName,
          description: fm.description,
          filePath: entryPath,
        });
      }
    } catch {
      // skip unreadable entries
    }
  }

  // Scan hooks/
  const hooksDir = path.join(installPath, 'hooks');
  const hookEntries = await listDir(hooksDir);
  for (const entry of hookEntries) {
    hooks.push({
      name: entry,
      scope,
      source: pluginName,
      type: 'command',
      command: path.join(hooksDir, entry),
    });
  }

  // Scan agents/
  const agentsDir = path.join(installPath, 'agents');
  const agentEntries = await listDir(agentsDir);
  for (const entry of agentEntries) {
    try {
      const stat = await fs.stat(path.join(agentsDir, entry));
      if (stat.isDirectory()) agents.push(entry);
    } catch {
      // skip
    }
  }

  // Scan commands/
  const commandsDir = path.join(installPath, 'commands');
  const commandEntries = await listDir(commandsDir);
  for (const entry of commandEntries) {
    try {
      const stat = await fs.stat(path.join(commandsDir, entry));
      if (stat.isDirectory()) commands.push(entry);
    } catch {
      // skip
    }
  }

  // Check package.json for mcpServers
  const pkgPath = path.join(installPath, 'package.json');
  const pkg = await readJsonFile(pkgPath) as Record<string, unknown> | null;
  if (pkg && typeof pkg === 'object' && pkg.mcpServers && typeof pkg.mcpServers === 'object') {
    mcpServers.push(...Object.keys(pkg.mcpServers as Record<string, unknown>));
  }

  return { skills, hooks, agents, commands, mcpServers };
}

export async function scanContext(projectPath: string | null): Promise<ProjectContext> {
  const home = os.homedir();
  const sources: ConfigSource[] = [];
  const mcpServers: McpServer[] = [];
  const plugins: Plugin[] = [];
  const allSkills: Skill[] = [];
  const allHooks: Hook[] = [];
  let claudeMd: string | null = null;

  // 1. Global Settings (~/.claude/settings.json)
  const globalSettingsPath = path.join(home, '.claude', 'settings.json');
  const globalSettingsFound = await fileExists(globalSettingsPath);
  sources.push({
    scope: 'global',
    name: 'Global Settings',
    path: globalSettingsPath,
    found: globalSettingsFound,
  });

  const globalSettings = globalSettingsFound
    ? (await readJsonFile(globalSettingsPath) as Record<string, unknown> | null)
    : null;

  if (globalSettings) {
    // Extract hooks from global settings
    if (globalSettings.hooks && typeof globalSettings.hooks === 'object') {
      const hooksObj = globalSettings.hooks as Record<string, unknown>;
      for (const [eventName, hookDef] of Object.entries(hooksObj)) {
        if (Array.isArray(hookDef)) {
          for (const h of hookDef) {
            if (h && typeof h === 'object') {
              const hookItem = h as Record<string, unknown>;
              allHooks.push({
                name: eventName,
                scope: 'global',
                source: 'Global Settings',
                type: (hookItem.type as string) || 'command',
                command: (hookItem.command as string) || JSON.stringify(h),
              });
            }
          }
        } else if (hookDef && typeof hookDef === 'object') {
          const hookItem = hookDef as Record<string, unknown>;
          allHooks.push({
            name: eventName,
            scope: 'global',
            source: 'Global Settings',
            type: (hookItem.type as string) || 'command',
            command: (hookItem.command as string) || JSON.stringify(hookDef),
          });
        }
      }
    }
  }

  // 2. Client State (~/.claude.json)
  const clientStatePath = path.join(home, '.claude.json');
  const clientStateFound = await fileExists(clientStatePath);
  sources.push({
    scope: 'global',
    name: 'Client State',
    path: clientStatePath,
    found: clientStateFound,
  });

  const clientState = clientStateFound
    ? (await readJsonFile(clientStatePath) as Record<string, unknown> | null)
    : null;

  if (clientState) {
    // Global MCP servers
    if (clientState.mcpServers && typeof clientState.mcpServers === 'object') {
      const servers = clientState.mcpServers as Record<string, Record<string, unknown>>;
      for (const [name, cfg] of Object.entries(servers)) {
        mcpServers.push({
          name,
          scope: 'global',
          source: 'Client State',
          type: (cfg.type as string) || 'unknown',
          url: cfg.url as string | undefined,
          config: cfg,
        });
      }
    }

    // Project-specific MCP servers from client state
    if (projectPath && clientState.projects && typeof clientState.projects === 'object') {
      const projects = clientState.projects as Record<string, Record<string, unknown>>;
      const projectConfig = projects[projectPath];
      if (projectConfig?.mcpServers && typeof projectConfig.mcpServers === 'object') {
        const servers = projectConfig.mcpServers as Record<string, Record<string, unknown>>;
        for (const [name, cfg] of Object.entries(servers)) {
          mcpServers.push({
            name,
            scope: 'local',
            source: 'Client State (Project)',
            type: (cfg.type as string) || 'unknown',
            url: cfg.url as string | undefined,
            config: cfg,
          });
        }
      }
    }
  }

  // 3. Plugins (~/.claude/plugins/installed_plugins.json)
  const pluginsPath = path.join(home, '.claude', 'plugins', 'installed_plugins.json');
  const pluginsFound = await fileExists(pluginsPath);
  sources.push({
    scope: 'global',
    name: 'Plugins',
    path: pluginsPath,
    found: pluginsFound,
  });

  if (pluginsFound) {
    const pluginsData = await readJsonFile(pluginsPath);
    if (Array.isArray(pluginsData)) {
      for (const p of pluginsData) {
        if (!p || typeof p !== 'object') continue;
        const pluginEntry = p as Record<string, unknown>;
        const pluginName = (pluginEntry.name as string) || 'unknown';
        const installPath = (pluginEntry.installPath as string) || '';
        const version = (pluginEntry.version as string) || '';
        const marketplace = (pluginEntry.marketplace as string) || '';

        // Check if this plugin is enabled in global settings
        const enabledPlugins = globalSettings?.enabledPlugins as Record<string, unknown> | undefined;
        const isEnabled = enabledPlugins ? pluginName in enabledPlugins || Object.values(enabledPlugins).some(v => v === pluginName) : true;

        if (!isEnabled) continue;

        const scanned = installPath ? await scanPluginDir(installPath, pluginName, 'global') : {
          skills: [], hooks: [], agents: [], commands: [], mcpServers: [],
        };

        allSkills.push(...scanned.skills);
        allHooks.push(...scanned.hooks);

        plugins.push({
          name: pluginName,
          scope: 'global',
          source: 'Plugins',
          version,
          installPath,
          marketplace,
          skills: scanned.skills.map(s => s.name),
          hooks: scanned.hooks.map(h => h.name),
          agents: scanned.agents,
          commands: scanned.commands,
          mcpServers: scanned.mcpServers,
        });
      }
    }
  }

  // 4. Skills Directory (~/.claude/skills/)
  const skillsDirPath = path.join(home, '.claude', 'skills');
  const skillsDirFound = await fileExists(skillsDirPath);
  sources.push({
    scope: 'global',
    name: 'Skills Directory',
    path: skillsDirPath,
    found: skillsDirFound,
  });

  if (skillsDirFound) {
    const skillEntries = await listDir(skillsDirPath);
    for (const entry of skillEntries) {
      const entryPath = path.join(skillsDirPath, entry);
      try {
        const stat = await fs.stat(entryPath);
        if (stat.isDirectory() || entry.endsWith('.md')) {
          let name = entry.replace(/\.md$/, '');
          let description: string | undefined;

          if (entry.endsWith('.md')) {
            const content = await fs.readFile(entryPath, 'utf-8');
            const fm = parseFrontmatter(content);
            if (fm.name) name = fm.name;
            if (fm.description) description = fm.description;
          } else {
            // Check for .md files inside directory
            const mdFiles = (await listDir(entryPath)).filter(f => f.endsWith('.md'));
            if (mdFiles.length > 0) {
              const content = await fs.readFile(path.join(entryPath, mdFiles[0]), 'utf-8');
              const fm = parseFrontmatter(content);
              if (fm.name) name = fm.name;
              if (fm.description) description = fm.description;
            }
          }

          allSkills.push({
            name,
            scope: 'global',
            source: 'Skills Directory',
            description,
            filePath: entryPath,
          });
        }
      } catch {
        // skip unreadable entries
      }
    }
  }

  // --- Local sources (only when projectPath is provided) ---
  if (projectPath) {
    // 5. Project Settings (<project>/.claude/settings.local.json)
    const projectSettingsPath = path.join(projectPath, '.claude', 'settings.local.json');
    const projectSettingsFound = await fileExists(projectSettingsPath);
    sources.push({
      scope: 'local',
      name: 'Project Settings',
      path: projectSettingsPath,
      found: projectSettingsFound,
    });

    if (projectSettingsFound) {
      const projectSettings = await readJsonFile(projectSettingsPath) as Record<string, unknown> | null;
      if (projectSettings?.hooks && typeof projectSettings.hooks === 'object') {
        const hooksObj = projectSettings.hooks as Record<string, unknown>;
        for (const [eventName, hookDef] of Object.entries(hooksObj)) {
          if (Array.isArray(hookDef)) {
            for (const h of hookDef) {
              if (h && typeof h === 'object') {
                const hookItem = h as Record<string, unknown>;
                allHooks.push({
                  name: eventName,
                  scope: 'local',
                  source: 'Project Settings',
                  type: (hookItem.type as string) || 'command',
                  command: (hookItem.command as string) || JSON.stringify(h),
                });
              }
            }
          } else if (hookDef && typeof hookDef === 'object') {
            const hookItem = hookDef as Record<string, unknown>;
            allHooks.push({
              name: eventName,
              scope: 'local',
              source: 'Project Settings',
              type: (hookItem.type as string) || 'command',
              command: (hookItem.command as string) || JSON.stringify(hookDef),
            });
          }
        }
      }
    }

    // 6. CLAUDE.md
    const claudeMdPath = path.join(projectPath, 'CLAUDE.md');
    const claudeMdFound = await fileExists(claudeMdPath);
    sources.push({
      scope: 'local',
      name: 'CLAUDE.md',
      path: claudeMdPath,
      found: claudeMdFound,
    });

    if (claudeMdFound) {
      try {
        claudeMd = await fs.readFile(claudeMdPath, 'utf-8');
      } catch {
        claudeMd = null;
      }
    }

    // 7. MCP Config (<project>/.mcp.json)
    const mcpConfigPath = path.join(projectPath, '.mcp.json');
    const mcpConfigFound = await fileExists(mcpConfigPath);
    sources.push({
      scope: 'local',
      name: 'MCP Config',
      path: mcpConfigPath,
      found: mcpConfigFound,
    });

    if (mcpConfigFound) {
      const mcpConfig = await readJsonFile(mcpConfigPath) as Record<string, unknown> | null;
      if (mcpConfig) {
        // MCP config may have a top-level mcpServers key or be flat
        const serversObj = (mcpConfig.mcpServers as Record<string, Record<string, unknown>> | undefined) || mcpConfig;
        for (const [name, cfg] of Object.entries(serversObj)) {
          if (name === 'mcpServers' || typeof cfg !== 'object' || cfg === null) continue;
          const serverCfg = cfg as Record<string, unknown>;
          mcpServers.push({
            name,
            scope: 'local',
            source: 'MCP Config',
            type: (serverCfg.type as string) || 'unknown',
            url: serverCfg.url as string | undefined,
            config: serverCfg,
          });
        }
      }
    }
  }

  return {
    projectPath,
    sources,
    mcpServers,
    plugins,
    skills: allSkills,
    hooks: allHooks,
    claudeMd,
  };
}
