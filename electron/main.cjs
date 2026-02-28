const { app, BrowserWindow, shell, dialog } = require("electron");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const fs = require("fs");

const isDev = !app.isPackaged;
const DEV_URL = process.env.ELECTRON_DEV_URL || "http://localhost:9002";
const PROD_URL = process.env.ELECTRON_START_URL || null;
const ICON_CANDIDATES = [
  path.join(__dirname, "assets", "icon.ico"),
  path.join(process.cwd(), "electron", "assets", "icon.ico"),
  path.join(process.cwd(), "src", "app", "favicon.ico"),
];

let mainWindow = null;
let localServerProcess = null;
let localServerPort = null;
let logFilePath = null;
const DESKTOP_HOST = "127.0.0.1";
const DESKTOP_PORT = Number(process.env.ELECTRON_DESKTOP_PORT || 47651);

function resolveAppIconPath() {
  for (const candidate of ICON_CANDIDATES) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // ignore path checks
    }
  }
  return undefined;
}

function logLine(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    if (logFilePath) {
      fs.appendFileSync(logFilePath, line, "utf8");
    }
  } catch {
    // ignore logging write errors
  }
  console.log(message);
}

function waitForHttpReady(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const ping = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for local server: ${url}`));
          return;
        }
        setTimeout(ping, 350);
      });
    };
    ping();
  });
}

async function startBundledServer() {
  const extraResourcesStandaloneDir = path.join(process.resourcesPath, ".next-desktop", "standalone");
  const unpackedStandaloneDir = path.join(process.resourcesPath, "app.asar.unpacked", ".next-desktop", "standalone");
  const standaloneDir = fs.existsSync(extraResourcesStandaloneDir) ? extraResourcesStandaloneDir : unpackedStandaloneDir;
  const serverScript = path.join(standaloneDir, "server.js");
  const nodeRuntime = path.join(process.resourcesPath, "electron", "node-runtime", process.platform === "win32" ? "node.exe" : "node");
  const hasBundledNode = fs.existsSync(nodeRuntime);

  localServerPort = DESKTOP_PORT;
  const env = {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(localServerPort),
    HOSTNAME: DESKTOP_HOST,
  };

  const command = hasBundledNode ? nodeRuntime : process.execPath;
  logLine(`Starting bundled server with command: ${command}`);
  logLine(`Standalone dir: ${standaloneDir}`);
  logLine(`Server script exists: ${fs.existsSync(serverScript)}`);
  logLine(`Bundled node exists: ${hasBundledNode}`);
  const spawnEnv = hasBundledNode ? env : { ...env, ELECTRON_RUN_AS_NODE: "1" };
  localServerProcess = spawn(command, [serverScript], {
    cwd: standaloneDir,
    env: spawnEnv,
    stdio: "pipe",
    windowsHide: true,
  });

  localServerProcess.stdout?.on("data", (chunk) => {
    logLine(`[server stdout] ${String(chunk).trim()}`);
  });
  localServerProcess.stderr?.on("data", (chunk) => {
    logLine(`[server stderr] ${String(chunk).trim()}`);
  });

  localServerProcess.on("exit", (code) => {
    logLine(`Bundled Next server exited with code ${code}`);
  });

  const localUrl = `http://${DESKTOP_HOST}:${localServerPort}`;
  await waitForHttpReady(localUrl);
  logLine(`Bundled server ready on ${localUrl}`);
  return localUrl;
}

async function createWindow() {
  const resolvedIcon = resolveAppIconPath();
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    icon: resolvedIcon,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    logLine(`did-fail-load code=${errorCode} desc=${errorDescription} url=${validatedURL}`);
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    logLine(`render-process-gone reason=${details.reason} exitCode=${details.exitCode}`);
  });
  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    logLine(`[renderer console] level=${level} ${sourceId}:${line} ${message}`);
  });
  mainWindow.webContents.on("did-finish-load", () => {
    logLine(`did-finish-load url=${mainWindow?.webContents.getURL() || ""}`);
  });

  try {
    let startUrl = DEV_URL;
    if (!isDev) {
      startUrl = await startBundledServer();
    }
    logLine(`Loading URL: ${startUrl}`);
    await mainWindow.loadURL(startUrl);
  } catch (error) {
    logLine(`Initial load failed: ${error instanceof Error ? error.message : String(error)}`);
    if (!isDev && PROD_URL) {
      logLine(`Trying fallback URL: ${PROD_URL}`);
      await mainWindow.loadURL(PROD_URL);
    } else {
      await dialog.showMessageBox({
        type: "error",
        title: "Failed to start desktop app",
        message:
          "The local desktop server could not start. Rebuild the app or set ELECTRON_START_URL as fallback.",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else if (process.env.ELECTRON_DEBUG === "1") {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId("com.studio.desktop");
  logFilePath = path.join(app.getPath("userData"), "desktop.log");
  logLine(`App starting. isDev=${isDev} userData=${app.getPath("userData")}`);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (localServerProcess && !localServerProcess.killed) {
    localServerProcess.kill();
    localServerProcess = null;
  }
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (localServerProcess && !localServerProcess.killed) {
    localServerProcess.kill();
    localServerProcess = null;
  }
});
