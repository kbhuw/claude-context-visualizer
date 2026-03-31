import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, rm, unlink, stat } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { homedir } from 'os';

const INSTALLED_PLUGINS_PATH = join(homedir(), '.claude', 'plugins', 'installed_plugins.json');
const CLIENT_STATE_PATH = join(homedir(), '.claude.json');
const SETTINGS_PATH = join(homedir(), '.claude', 'settings.json');

async function removePlugin(name: string) {
  // 1. Remove from installed_plugins.json
  try {
    const raw = await readFile(INSTALLED_PLUGINS_PATH, 'utf-8');
    const data = JSON.parse(raw);

    if (data.version === 2 && data.plugins) {
      const matchingKey = Object.keys(data.plugins).find(
        (key) => key.startsWith(name + '@') || key === name
      );
      if (matchingKey) {
        delete data.plugins[matchingKey];
        await writeFile(INSTALLED_PLUGINS_PATH, JSON.stringify(data, null, 2) + '\n');
      }
    } else if (Array.isArray(data)) {
      const idx = data.findIndex((p: { name: string }) => p.name === name);
      if (idx !== -1) {
        data.splice(idx, 1);
        await writeFile(INSTALLED_PLUGINS_PATH, JSON.stringify(data, null, 2) + '\n');
      }
    }
  } catch {
    // installed_plugins.json may not exist — that's fine
  }

  // 2. Remove from enabledPlugins in ~/.claude/settings.json
  //    This is the key step — if the plugin stays in enabledPlugins,
  //    Claude Code will re-install it on next launch.
  try {
    const raw = await readFile(SETTINGS_PATH, 'utf-8');
    const settings = JSON.parse(raw);

    if (settings.enabledPlugins && typeof settings.enabledPlugins === 'object') {
      const matchingKey = Object.keys(settings.enabledPlugins).find(
        (key) => key.startsWith(name + '@') || key === name
      );
      if (matchingKey) {
        delete settings.enabledPlugins[matchingKey];
        await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n');
      }
    }
  } catch {
    // settings.json may not exist — that's fine
  }

  // 3. Also clean up any MCP server entries contributed by this plugin from ~/.claude.json
  //    Plugin MCP servers can appear as "name", "plugin:name:*", or matching the plugin name
  try {
    const raw = await readFile(CLIENT_STATE_PATH, 'utf-8');
    const clientState = JSON.parse(raw);
    let modified = false;

    const isPluginServer = (serverName: string) =>
      serverName === name ||
      serverName.startsWith(`plugin:${name}:`);

    // Top-level mcpServers
    if (clientState.mcpServers && typeof clientState.mcpServers === 'object') {
      for (const serverName of Object.keys(clientState.mcpServers)) {
        if (isPluginServer(serverName)) {
          delete clientState.mcpServers[serverName];
          modified = true;
        }
      }
    }

    // Project-specific mcpServers
    if (clientState.projects && typeof clientState.projects === 'object') {
      for (const projectPath of Object.keys(clientState.projects)) {
        const proj = clientState.projects[projectPath];
        if (proj.mcpServers && typeof proj.mcpServers === 'object') {
          for (const serverName of Object.keys(proj.mcpServers)) {
            if (isPluginServer(serverName)) {
              delete proj.mcpServers[serverName];
              modified = true;
            }
          }
        }
        // Also clean up disabledMcpServers references
        if (Array.isArray(proj.disabledMcpServers)) {
          const before = proj.disabledMcpServers.length;
          proj.disabledMcpServers = proj.disabledMcpServers.filter(
            (s: string) => !isPluginServer(s)
          );
          if (proj.disabledMcpServers.length < before) modified = true;
        }
      }
    }

    if (modified) {
      await writeFile(CLIENT_STATE_PATH, JSON.stringify(clientState, null, 2) + '\n');
    }
  } catch {
    // ~/.claude.json may not exist — that's fine
  }
}

async function removeMcpServer(name: string, sourcePath: string) {
  if (!sourcePath) throw new Error('No source path for MCP server');

  const raw = await readFile(sourcePath, 'utf-8');
  const data = JSON.parse(raw);

  // Could be at top level mcpServers, or nested under projects[path].mcpServers
  let removed = false;

  if (data.mcpServers && data.mcpServers[name]) {
    delete data.mcpServers[name];
    removed = true;
  }

  // Check project-specific entries in ~/.claude.json
  if (data.projects) {
    for (const projectPath of Object.keys(data.projects)) {
      const proj = data.projects[projectPath];
      if (proj.mcpServers && proj.mcpServers[name]) {
        delete proj.mcpServers[name];
        removed = true;
      }
    }
  }

  // .mcp.json may have servers at top level (without mcpServers wrapper)
  if (!removed && sourcePath.endsWith('.mcp.json') && data[name]) {
    delete data[name];
    removed = true;
  }

  if (!removed) throw new Error(`MCP server "${name}" not found in ${sourcePath}`);

  await writeFile(sourcePath, JSON.stringify(data, null, 2) + '\n');
}

async function removeFileOrDir(filePath: string, type?: string) {
  if (!filePath) throw new Error('No file path provided');

  // Safety: only allow deletion under ~/.claude, ~/.agents, or project .claude directories
  const home = homedir();
  const allowed = [
    join(home, '.claude'),
    join(home, '.agents'),
  ];
  const isAllowed = allowed.some((prefix) => filePath.startsWith(prefix)) ||
    filePath.includes('/.claude/') ||
    filePath.includes('/.agents/');

  if (!isAllowed) {
    throw new Error('Cannot delete files outside of .claude or .agents directories');
  }

  // For skills, if filePath points to a file inside a skill directory (e.g. skills/foo/SKILL.md),
  // delete the parent directory instead of just the file
  let targetPath = filePath;
  if (type === 'skill') {
    const parentDir = dirname(filePath);
    const parentName = basename(parentDir);
    // If the parent is a skills directory container (not "skills" itself), delete the parent
    if (parentName !== 'skills' && parentName !== 'commands') {
      try {
        const parentStats = await stat(parentDir);
        if (parentStats.isDirectory()) {
          targetPath = parentDir;
        }
      } catch {
        // Parent doesn't exist, fall through to delete the file itself
      }
    }
  }

  const stats = await stat(targetPath);
  if (stats.isDirectory()) {
    await rm(targetPath, { recursive: true });
  } else {
    await unlink(targetPath);
  }
}

async function removeHook(event: string, command: string, sourcePath: string) {
  if (!sourcePath) throw new Error('No source path for hook');

  const raw = await readFile(sourcePath, 'utf-8');
  const data = JSON.parse(raw);

  if (!data.hooks || !data.hooks[event]) {
    throw new Error(`Hook event "${event}" not found in ${sourcePath}`);
  }

  const eventHooks = data.hooks[event];
  let removed = false;

  if (Array.isArray(eventHooks)) {
    // Simple format: array of hook objects directly
    // Or nested format: array of { matcher?, hooks: [...] }
    for (let i = eventHooks.length - 1; i >= 0; i--) {
      const entry = eventHooks[i];

      // Simple format: { type, command }
      if (entry.command === command) {
        eventHooks.splice(i, 1);
        removed = true;
        break;
      }

      // Nested format: { matcher?, hooks: [{ type, command }] }
      if (entry.hooks && Array.isArray(entry.hooks)) {
        const hookIdx = entry.hooks.findIndex(
          (h: { command: string }) => h.command === command
        );
        if (hookIdx !== -1) {
          entry.hooks.splice(hookIdx, 1);
          removed = true;
          // Remove the parent entry if no hooks left
          if (entry.hooks.length === 0) {
            eventHooks.splice(i, 1);
          }
          break;
        }
      }
    }
  }

  // Remove the event key if empty
  if (data.hooks[event].length === 0) {
    delete data.hooks[event];
  }

  // Remove hooks key if empty
  if (Object.keys(data.hooks).length === 0) {
    delete data.hooks;
  }

  if (!removed) throw new Error(`Hook not found in ${sourcePath}`);

  await writeFile(sourcePath, JSON.stringify(data, null, 2) + '\n');
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, name } = body;

    if (!type || !name) {
      return NextResponse.json({ error: 'type and name are required' }, { status: 400 });
    }

    switch (type) {
      case 'plugin':
        await removePlugin(name);
        break;

      case 'mcpServer': {
        const { sourcePath } = body;
        await removeMcpServer(name, sourcePath);
        break;
      }

      case 'skill':
      case 'command': {
        const { filePath } = body;
        await removeFileOrDir(filePath, type);
        break;
      }

      case 'hook': {
        const { event, command, sourcePath } = body;
        await removeHook(event, command, sourcePath);
        break;
      }

      case 'agent': {
        const { filePath } = body;
        await removeFileOrDir(filePath);
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, removed: name });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to remove item' },
      { status: 500 }
    );
  }
}
