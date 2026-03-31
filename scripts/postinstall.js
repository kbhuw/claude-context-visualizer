#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const skillSrc = path.join(__dirname, "..", "skill", "SKILL.md");
const skillName = "context-visualizer";

// Detect if this is a global install
const isGlobal =
  process.env.npm_config_global === "true" ||
  process.env.npm_config_global === "1";

let destDir;
if (isGlobal) {
  // Global install → ~/.claude/skills/context-visualizer/
  const home = process.env.HOME || process.env.USERPROFILE;
  destDir = path.join(home, ".claude", "skills", skillName);
} else {
  // Local install → .claude/skills/context-visualizer/ (relative to project root)
  // npm_config_local_prefix is the project root during local installs
  const projectRoot =
    process.env.INIT_CWD ||
    process.env.npm_config_local_prefix ||
    process.cwd();
  destDir = path.join(projectRoot, ".claude", "skills", skillName);
}

try {
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(skillSrc, path.join(destDir, "SKILL.md"));
  const scope = isGlobal ? "global" : "local";
  console.log(
    `  context-visualizer skill installed (${scope}): ${destDir}/SKILL.md`
  );
} catch (err) {
  // Don't fail the install if skill copy fails
  console.warn(`  warning: could not install context-visualizer skill: ${err.message}`);
}
