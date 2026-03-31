#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

const pkgDir = path.resolve(__dirname, "..");
const args = process.argv.slice(2);

// `ccv scan ...` → forward to CLI via tsx
if (args[0] === "scan") {
  const cliPath = path.join(pkgDir, "src", "cli.ts");
  const child = spawn(
    path.join(pkgDir, "node_modules", ".bin", "tsx"),
    [cliPath, ...args.slice(1)],
    { stdio: "inherit", cwd: process.cwd() }
  );
  child.on("exit", (code) => process.exit(code ?? 1));
  return;
}

// Parse --port / -p flag (default 3000)
let port = "3000";
for (let i = 0; i < args.length; i++) {
  if ((args[i] === "--port" || args[i] === "-p") && args[i + 1]) {
    port = args[i + 1];
    break;
  }
}

const nextBin = path.join(pkgDir, "node_modules", ".bin", "next");

console.log(`\nClaude Context Visualizer`);
console.log(`Starting on http://localhost:${port}\n`);

const child = spawn(nextBin, ["dev", "--port", port], {
  stdio: "inherit",
  cwd: pkgDir,
});

child.on("exit", (code) => process.exit(code ?? 0));

// Forward signals for clean shutdown
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    child.kill(sig);
  });
}
