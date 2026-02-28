const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const distDirArg = process.argv[2] || ".next-local";
const nextDir = path.join(root, distDirArg);
const standaloneDir = path.join(nextDir, "standalone");
const standaloneNextDir = path.join(standaloneDir, distDirArg);
const standaloneStaticDir = path.join(standaloneNextDir, "static");
const sourceStaticDir = path.join(nextDir, "static");
const sourcePublicDir = path.join(root, "public");
const targetPublicDir = path.join(standaloneDir, "public");
const nodeRuntimeDir = path.join(root, "electron", "node-runtime");
const nodeRuntimeBinary = path.join(
  nodeRuntimeDir,
  process.platform === "win32" ? "node.exe" : "node"
);

if (!fs.existsSync(path.join(standaloneDir, "server.js"))) {
  throw new Error(`Standalone build is missing in ${distDirArg}. Run the desktop build first.`);
}

fs.mkdirSync(standaloneNextDir, { recursive: true });

if (fs.existsSync(sourceStaticDir)) {
  fs.rmSync(standaloneStaticDir, { recursive: true, force: true });
  fs.cpSync(sourceStaticDir, standaloneStaticDir, { recursive: true });
}

if (fs.existsSync(sourcePublicDir)) {
  fs.rmSync(targetPublicDir, { recursive: true, force: true });
  fs.cpSync(sourcePublicDir, targetPublicDir, { recursive: true });
}

fs.mkdirSync(nodeRuntimeDir, { recursive: true });
fs.copyFileSync(process.execPath, nodeRuntimeBinary);

console.log(`Prepared standalone assets for Electron packaging from ${distDirArg}.`);
console.log(`Bundled Node runtime: ${nodeRuntimeBinary}`);
