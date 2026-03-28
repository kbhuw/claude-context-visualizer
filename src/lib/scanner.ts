import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  ConfigSource,
  McpServer,
  Plugin,
  Skill,
  Hook,
  Command,
  MarkdownFile,
  ProjectContext,
} from './types';

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    // Also check it's not a broken symlink
    await fs.stat(filePath);
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

/**
 * Resolve @include directives in CLAUDE.md content.
 * Supports `@path/to/file.md` on its own line — resolves relative to the base directory.
 * Recursively resolves nested includes, with a depth limit to prevent cycles.
 */
async function resolveIncludes(content: string, baseDir: string, depth = 0): Promise<string> {
  if (depth > 5) return content; // prevent infinite recursion

  const lines = content.split('\n');
  const resolved: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match lines that are just @filepath (with optional leading whitespace)
    const match = trimmed.match(/^@(.+)$/);
    if (match) {
      const includePath = path.resolve(baseDir, match[1]);
      try {
        const includeContent = await fs.readFile(includePath, 'utf-8');
        const includeDir = path.dirname(includePath);
        const nestedResolved = await resolveIncludes(includeContent, includeDir, depth + 1);
        resolved.push(nestedResolved);
      } catch {
        // Keep the original line if file can't be read
        resolved.push(line);
      }
    } else {
      resolved.push(line);
    }
  }

  return resolved.join('\n');
}

/** Read a skill from a directory or .md file, returning parsed metadata */
async function readSkillEntry(
  entryPath: string,
  entryName: string,
  scope: 'global' | 'local',
  source: string,
): Promise<Skill | null> {
  try {
    const stat = await fs.stat(entryPath);
    if (stat.isDirectory()) {
      // Prefer SKILL.md, then any .md file
      const files = await listDir(entryPath);
      const skillMd = files.find(f => f === 'SKILL.md');
      const anyMd = files.find(f => f.endsWith('.md'));
      const mdFile = skillMd || anyMd;

      if (mdFile) {
        const mdPath = path.join(entryPath, mdFile);
        const content = await fs.readFile(mdPath, 'utf-8');
        const fm = parseFrontmatter(content);
        return {
          name: fm.name || entryName,
          scope,
          source,
          description: fm.description,
          filePath: mdPath,
        };
      }
      return { name: entryName, scope, source, filePath: entryPath };
    } else if (entryName.endsWith('.md')) {
      const content = await fs.readFile(entryPath, 'utf-8');
      const fm = parseFrontmatter(content);
      return {
        name: fm.name || entryName.replace(/\.md$/, ''),
        scope,
        source,
        description: fm.description,
        filePath: entryPath,
      };
    }
    return null;
  } catch {
    // broken symlink or unreadable
    return null;
  }
}

/** Read a command from a directory or .md file */
async function readCommandEntry(
  entryPath: string,
  entryName: string,
  scope: 'global' | 'local',
  source: string,
): Promise<Command[]> {
  const commands: Command[] = [];
  try {
    const stat = await fs.stat(entryPath);
    if (stat.isDirectory()) {
      const files = await listDir(entryPath);
      for (const f of files) {
        if (!f.endsWith('.md')) continue;
        const mdPath = path.join(entryPath, f);
        try {
          const content = await fs.readFile(mdPath, 'utf-8');
          const fm = parseFrontmatter(content);
          commands.push({
            name: `${entryName}:${f.replace(/\.md$/, '')}`,
            scope,
            source,
            description: fm.description,
            filePath: mdPath,
          });
        } catch {
          // skip unreadable
        }
      }
      if (commands.length === 0) {
        commands.push({ name: entryName, scope, source, filePath: entryPath });
      }
    } else if (entryName.endsWith('.md')) {
      // Single .md file command
      try {
        const content = await fs.readFile(entryPath, 'utf-8');
        const fm = parseFrontmatter(content);
        commands.push({
          name: fm.name || entryName.replace(/\.md$/, ''),
          scope,
          source,
          description: fm.description,
          filePath: entryPath,
        });
      } catch {
        // skip
      }
    }
  } catch {
    // skip
  }
  return commands;
}

async function scanPluginDir(
  installPath: string,
  pluginName: string,
  scope: 'global' | 'local'
): Promise<{ skills: Skill[]; hooks: Hook[]; agents: string[]; commands: Command[]; mcpServers: McpServer[] }> {
  const skills: Skill[] = [];
  const hooks: Hook[] = [];
  const agents: string[] = [];
  const commands: Command[] = [];
  const mcpServers: McpServer[] = [];

  // Scan skills/
  const skillsDir = path.join(installPath, 'skills');
  const skillEntries = await listDir(skillsDir);
  for (const entry of skillEntries) {
    const skill = await readSkillEntry(
      path.join(skillsDir, entry),
      entry,
      scope,
      pluginName,
    );
    if (skill) skills.push(skill);
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
      if (stat.isDirectory()) {
        agents.push(entry);
      } else if (entry.endsWith('.md')) {
        agents.push(entry.replace(/\.md$/, ''));
      }
    } catch {
      // skip
    }
  }

  // Scan commands/
  const commandsDir = path.join(installPath, 'commands');
  const commandEntries = await listDir(commandsDir);
  for (const entry of commandEntries) {
    const cmds = await readCommandEntry(
      path.join(commandsDir, entry),
      entry,
      scope,
      pluginName,
    );
    commands.push(...cmds);
  }

  // Check .mcp.json for MCP servers
  const mcpJsonPath = path.join(installPath, '.mcp.json');
  const mcpJson = await readJsonFile(mcpJsonPath) as Record<string, unknown> | null;
  if (mcpJson && typeof mcpJson === 'object') {
    for (const [name, cfg] of Object.entries(mcpJson)) {
      const serverCfg = (cfg && typeof cfg === 'object') ? cfg as Record<string, unknown> : {};
      mcpServers.push({
        name,
        scope,
        source: `Plugin: ${pluginName}`,
        type: (serverCfg.type as string) || (serverCfg.command ? 'stdio' : 'unknown'),
        url: serverCfg.url as string | undefined,
        config: serverCfg,
      });
    }
  }

  // Check package.json for mcpServers
  const pkgPath = path.join(installPath, 'package.json');
  const pkg = await readJsonFile(pkgPath) as Record<string, unknown> | null;
  if (pkg && typeof pkg === 'object' && pkg.mcpServers && typeof pkg.mcpServers === 'object') {
    for (const [name, cfg] of Object.entries(pkg.mcpServers as Record<string, unknown>)) {
      const serverCfg = (cfg && typeof cfg === 'object') ? cfg as Record<string, unknown> : {};
      mcpServers.push({
        name,
        scope,
        source: `Plugin: ${pluginName}`,
        type: (serverCfg.type as string) || (serverCfg.command ? 'stdio' : 'unknown'),
        url: serverCfg.url as string | undefined,
        config: serverCfg,
      });
    }
  }

  return { skills, hooks, agents, commands, mcpServers };
}

function extractHooks(
  hooksObj: Record<string, unknown>,
  scope: 'global' | 'local' | 'custom',
  source: string,
): Hook[] {
  const hooks: Hook[] = [];
  for (const [eventName, hookDef] of Object.entries(hooksObj)) {
    if (Array.isArray(hookDef)) {
      for (const h of hookDef) {
        if (h && typeof h === 'object') {
          const hookItem = h as Record<string, unknown>;
          hooks.push({
            name: eventName,
            scope,
            source,
            type: (hookItem.type as string) || 'command',
            command: (hookItem.command as string) || JSON.stringify(h),
          });
        }
      }
    } else if (hookDef && typeof hookDef === 'object') {
      const hookItem = hookDef as Record<string, unknown>;
      hooks.push({
        name: eventName,
        scope,
        source,
        type: (hookItem.type as string) || 'command',
        command: (hookItem.command as string) || JSON.stringify(hookDef),
      });
    }
  }
  return hooks;
}

/** Collect .md files from a directory (non-recursive) */
async function collectMdFiles(
  dirPath: string,
  scope: 'global' | 'local',
  baseDir: string,
): Promise<MarkdownFile[]> {
  const files: MarkdownFile[] = [];
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const fullPath = path.join(dirPath, entry.name);
        files.push({
          path: fullPath,
          name: entry.name,
          scope,
          relativePath: path.relative(baseDir, fullPath),
        });
      }
    }
  } catch {
    // directory doesn't exist or unreadable
  }
  return files;
}

/** Recursively collect .md files, skipping node_modules and hidden dirs (except .claude) */
async function collectMdFilesRecursive(
  dirPath: string,
  scope: 'global' | 'local',
  baseDir: string,
): Promise<MarkdownFile[]> {
  const files: MarkdownFile[] = [];
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const name = entry.name;
        if (name === 'node_modules' || name === '.git' || name === '.superpowers') continue;
        if (name.startsWith('.') && name !== '.claude') continue;
        files.push(...await collectMdFilesRecursive(path.join(dirPath, name), scope, baseDir));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const fullPath = path.join(dirPath, entry.name);
        files.push({
          path: fullPath,
          name: entry.name,
          scope,
          relativePath: path.relative(baseDir, fullPath),
        });
      }
    }
  } catch {
    // skip
  }
  return files;
}

export async function scanContext(projectPath: string | null, customSources: string[] = []): Promise<ProjectContext> {
  const home = os.homedir();
  const sources: ConfigSource[] = [];
  const mcpServers: McpServer[] = [];
  const plugins: Plugin[] = [];
  const allSkills: Skill[] = [];
  const allHooks: Hook[] = [];
  const allCommands: Command[] = [];
  let claudeMd: string | null = null;
  const markdownFiles: MarkdownFile[] = [];

  // Collect global .md files from ~/.claude/
  const globalClaudeDir = path.join(home, '.claude');
  markdownFiles.push(...await collectMdFiles(globalClaudeDir, 'global', globalClaudeDir));

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

  if (globalSettings?.hooks && typeof globalSettings.hooks === 'object') {
    allHooks.push(...extractHooks(globalSettings.hooks as Record<string, unknown>, 'global', 'Global Settings'));
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
  // Supports both v1 (flat array) and v2 ({ version: 2, plugins: { "name@registry": [...] } })
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

    // Normalize to a flat list of plugin entries
    let pluginEntries: Array<Record<string, unknown>> = [];

    if (Array.isArray(pluginsData)) {
      // v1 format: flat array
      pluginEntries = pluginsData.filter(p => p && typeof p === 'object');
    } else if (pluginsData && typeof pluginsData === 'object') {
      const pd = pluginsData as Record<string, unknown>;
      if (pd.plugins && typeof pd.plugins === 'object') {
        // v2 format: { version: 2, plugins: { "name@registry": [entries] } }
        const pluginsMap = pd.plugins as Record<string, unknown>;
        for (const [qualifiedName, entries] of Object.entries(pluginsMap)) {
          if (Array.isArray(entries)) {
            // Use the most recent entry (last in the array, or highest version)
            const entry = entries[entries.length - 1];
            if (entry && typeof entry === 'object') {
              const e = entry as Record<string, unknown>;
              // Extract plugin name from "name@registry" format
              const shortName = qualifiedName.split('@')[0];
              pluginEntries.push({
                ...e,
                name: e.name || shortName,
                _qualifiedName: qualifiedName,
              });
            }
          }
        }
      }
    }

    for (const pluginEntry of pluginEntries) {
      const pluginName = (pluginEntry.name as string) || 'unknown';
      const installPath = (pluginEntry.installPath as string) || '';
      const version = (pluginEntry.version as string) || '';
      const marketplace = (pluginEntry.marketplace as string) || (pluginEntry._qualifiedName as string)?.split('@')[1] || '';

      // Read plugin.json metadata if available
      let pluginMeta: Record<string, unknown> | null = null;
      if (installPath) {
        pluginMeta = await readJsonFile(path.join(installPath, '.claude-plugin', 'plugin.json')) as Record<string, unknown> | null;
      }

      const scanned = installPath ? await scanPluginDir(installPath, pluginName, 'global') : {
        skills: [], hooks: [], agents: [], commands: [], mcpServers: [],
      };

      allSkills.push(...scanned.skills);
      allHooks.push(...scanned.hooks);
      allCommands.push(...scanned.commands);
      mcpServers.push(...scanned.mcpServers);

      plugins.push({
        name: pluginMeta?.name as string || pluginName,
        scope: 'global',
        source: 'Plugins',
        version: pluginMeta?.version as string || version,
        installPath,
        marketplace,
        skills: scanned.skills.map(s => s.name),
        hooks: scanned.hooks.map(h => h.name),
        agents: scanned.agents,
        commands: scanned.commands.map(c => c.name),
        mcpServers: scanned.mcpServers.map(s => s.name),
      });
    }
  }

  // 4. Global Skills Directory (~/.claude/skills/)
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
      const skill = await readSkillEntry(
        path.join(skillsDirPath, entry),
        entry,
        'global',
        'Skills Directory',
      );
      if (skill) allSkills.push(skill);
    }
  }

  // 4b. Global Commands Directory (~/.claude/commands/)
  const globalCommandsDirPath = path.join(home, '.claude', 'commands');
  const globalCommandsDirFound = await fileExists(globalCommandsDirPath);
  sources.push({
    scope: 'global',
    name: 'Global Commands',
    path: globalCommandsDirPath,
    found: globalCommandsDirFound,
  });

  if (globalCommandsDirFound) {
    const entries = await listDir(globalCommandsDirPath);
    for (const entry of entries) {
      const cmds = await readCommandEntry(
        path.join(globalCommandsDirPath, entry),
        entry,
        'global',
        'Global Commands',
      );
      allCommands.push(...cmds);
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
        allHooks.push(...extractHooks(projectSettings.hooks as Record<string, unknown>, 'local', 'Project Settings'));
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
        const rawContent = await fs.readFile(claudeMdPath, 'utf-8');
        claudeMd = await resolveIncludes(rawContent, projectPath);
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

    // 8. Project-local skills (<project>/.claude/skills/)
    const localSkillsDir = path.join(projectPath, '.claude', 'skills');
    const localSkillsDirFound = await fileExists(localSkillsDir);
    sources.push({
      scope: 'local',
      name: 'Project Skills',
      path: localSkillsDir,
      found: localSkillsDirFound,
    });

    if (localSkillsDirFound) {
      const entries = await listDir(localSkillsDir);
      for (const entry of entries) {
        const skill = await readSkillEntry(
          path.join(localSkillsDir, entry),
          entry,
          'local',
          'Project Skills',
        );
        if (skill) allSkills.push(skill);
      }
    }

    // 9. Project-local commands (<project>/.claude/commands/)
    const localCommandsDir = path.join(projectPath, '.claude', 'commands');
    const localCommandsDirFound = await fileExists(localCommandsDir);
    sources.push({
      scope: 'local',
      name: 'Project Commands',
      path: localCommandsDir,
      found: localCommandsDirFound,
    });

    if (localCommandsDirFound) {
      const entries = await listDir(localCommandsDir);
      for (const entry of entries) {
        const cmds = await readCommandEntry(
          path.join(localCommandsDir, entry),
          entry,
          'local',
          'Project Commands',
        );
        allCommands.push(...cmds);
      }
    }

    // Collect local .md files from project root, .claude/, docs/, .skills/
    markdownFiles.push(...await collectMdFiles(projectPath, 'local', projectPath));
    markdownFiles.push(...await collectMdFilesRecursive(path.join(projectPath, '.claude'), 'local', projectPath));
    markdownFiles.push(...await collectMdFilesRecursive(path.join(projectPath, 'docs'), 'local', projectPath));
    markdownFiles.push(...await collectMdFilesRecursive(path.join(projectPath, '.skills'), 'local', projectPath));
  }

  // --- Custom sources ---
  for (const customPath of customSources) {
    const found = await fileExists(customPath);
    const sourceName = path.basename(customPath);
    sources.push({
      scope: 'custom',
      name: sourceName,
      path: customPath,
      found,
    });

    if (!found) continue;

    const data = await readJsonFile(customPath) as Record<string, unknown> | null;
    if (!data) continue;

    const sourceLabel = `Custom: ${sourceName}`;

    const serversObj = (data.mcpServers as Record<string, Record<string, unknown>> | undefined) || null;
    if (serversObj && typeof serversObj === 'object') {
      for (const [name, cfg] of Object.entries(serversObj)) {
        if (typeof cfg !== 'object' || cfg === null) continue;
        mcpServers.push({
          name,
          scope: 'custom',
          source: sourceLabel,
          type: (cfg.type as string) || 'unknown',
          url: cfg.url as string | undefined,
          config: cfg,
        });
      }
    }

    if (data.hooks && typeof data.hooks === 'object') {
      allHooks.push(...extractHooks(data.hooks as Record<string, unknown>, 'custom', sourceLabel));
    }
  }

  return {
    projectPath,
    sources,
    mcpServers,
    plugins,
    skills: allSkills,
    hooks: allHooks,
    commands: allCommands,
    claudeMd,
    markdownFiles,
  };
}
