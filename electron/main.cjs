const { app, BrowserWindow, shell, dialog, ipcMain, safeStorage } = require("electron");
const path = require("path");
const http = require("http");
const net = require("net");
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");

const loadBundledEnv = () => {
  const candidates = [
    path.join(__dirname, "env.json"),
    path.join(process.resourcesPath, "electron", "env.json"),
    path.join(process.resourcesPath, "app.asar.unpacked", "electron", "env.json"),
  ];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    try {
      const raw = fs.readFileSync(candidate, "utf8");
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") continue;
      Object.entries(parsed).forEach(([key, value]) => {
        if (!process.env[key] && typeof value === "string" && value.trim().length > 0) {
          process.env[key] = value.trim();
        }
      });
      return;
    } catch (error) {
      console.warn("Failed to load bundled desktop env:", error?.message || error);
    }
  }
};

loadBundledEnv();

const isDev = !app.isPackaged;
const DEV_URL = process.env.ELECTRON_DEV_URL || "http://localhost:9002";
const PROD_URL = process.env.ELECTRON_START_URL || null;
const FORCE_REMOTE = process.env.ELECTRON_FORCE_REMOTE === "1";
const AUTH_BASE_URL = process.env.ELECTRON_AUTH_BASE_URL || "https://vdock.vercel.app";
const APP_DISPLAY_NAME = "Dock";
const ICON_CANDIDATES = [
  path.join(__dirname, "assets", "icon.ico"),
  path.join(process.cwd(), "electron", "assets", "icon.ico"),
];

let mainWindow = null;
let localServerProcess = null;
let localServerPort = null;
let logFilePath = null;
const DESKTOP_HOST = "127.0.0.1";
const DESKTOP_PORT = Number(process.env.ELECTRON_DESKTOP_PORT || 47651);
const SECURE_AUTH_FILE = "secure-auth.json";
const KOKORO_CONTAINER_NAME = "studio-kokoro-tts";
const KOKORO_DOCKER_IMAGE = process.env.ELECTRON_KOKORO_DOCKER_IMAGE || "";
const KOKORO_DOCKER_IMAGE_CPU = process.env.ELECTRON_KOKORO_DOCKER_IMAGE_CPU || "ghcr.io/remsky/kokoro-fastapi-cpu:latest";
const KOKORO_DOCKER_IMAGE_GPU = process.env.ELECTRON_KOKORO_DOCKER_IMAGE_GPU || "ghcr.io/remsky/kokoro-fastapi-gpu:latest";
const KOKORO_FORCE_CPU = process.env.ELECTRON_KOKORO_FORCE_CPU === "1";
const KOKORO_FORCE_GPU = process.env.ELECTRON_KOKORO_FORCE_GPU === "1";
const KOKORO_AUTO_START = process.env.ELECTRON_KOKORO_AUTO_START !== "0";
const KOKORO_AUTO_START_BASE_URL = process.env.ELECTRON_KOKORO_BASE_URL || "http://127.0.0.1:8880";
let kokoroAutoStartAttempted = false;
let kokoroManagedByApp = false;
let kokoroWarmingStartedAt = 0;

const XTTS_AUTO_START = process.env.ELECTRON_XTTS_AUTO_START !== "0";
const XTTS_AUTO_START_BASE_URL = process.env.ELECTRON_XTTS_BASE_URL || "http://127.0.0.1:8020";
const XTTS_START_COMMAND = process.env.ELECTRON_XTTS_START_COMMAND || "";
const XTTS_DOCKER_IMAGE = process.env.ELECTRON_XTTS_DOCKER_IMAGE || "daswer123/xtts-api-server:latest";
const XTTS_DOCKER_CONTAINER_NAME = process.env.ELECTRON_XTTS_CONTAINER_NAME || "studio-local-xtts";
const XTTS_DOCKER_CONTAINER_PORT = Number(process.env.ELECTRON_XTTS_CONTAINER_PORT || 8020);
const XTTS_DOCKER_SPEAKER_DIR = process.env.ELECTRON_XTTS_SPEAKER_DIR || "/app/voices";
const XTTS_DOCKER_OUTPUT_DIR = process.env.ELECTRON_XTTS_OUTPUT_DIR || "/app/output";
const XTTS_DOCKER_MODEL_DIR = process.env.ELECTRON_XTTS_MODEL_DIR || "/app/xtts_models";
const XTTS_HEALTH_TIMEOUT_MS = Number(process.env.ELECTRON_XTTS_HEALTH_TIMEOUT_MS || 180000);
const XTTS_INITIAL_HEALTH_TIMEOUT_MS = Number(process.env.ELECTRON_XTTS_INITIAL_HEALTH_TIMEOUT_MS || 8000);
let xttsAutoStartAttempted = false;
let xttsServerProcess = null;
let xttsServerBaseUrl = "";
let xttsServerBackend = "";
let xttsLastError = "";
let xttsLastDetails = [];
let xttsWarmingStartedAt = 0;
let xttsDockerManagedByApp = false;

const STT_AUTO_START = process.env.ELECTRON_STT_AUTO_START !== "0";
const STT_AUTO_START_BASE_URL = process.env.LOCAL_STT_BASE_URL || process.env.STT_LOCAL_BASE_URL || "http://127.0.0.1:9890";
const STT_START_COMMAND = process.env.ELECTRON_STT_START_COMMAND || "";
const STT_DOCKER_IMAGE = process.env.ELECTRON_STT_DOCKER_IMAGE || "onerahmet/openai-whisper-asr-webservice:latest";
const STT_DOCKER_CONTAINER_NAME = process.env.ELECTRON_STT_CONTAINER_NAME || "studio-local-stt";
const STT_DOCKER_CONTAINER_PORT = Number(process.env.ELECTRON_STT_CONTAINER_PORT || 9000);
const STT_DOCKER_MODEL_CACHE_DIR = process.env.ELECTRON_STT_MODEL_CACHE_DIR || "/root/.cache/whisper";
const STT_MODEL = process.env.ELECTRON_STT_MODEL || "small.en";
const STT_HEALTH_TIMEOUT_MS = Number(process.env.ELECTRON_STT_HEALTH_TIMEOUT_MS || 180000);
const STT_INITIAL_HEALTH_TIMEOUT_MS = Number(process.env.ELECTRON_STT_INITIAL_HEALTH_TIMEOUT_MS || 8000);
const STT_HOST = "127.0.0.1";
const STT_MIN_PORT = 9300;
const STT_MAX_PORT = 9700;
let sttAutoStartAttempted = false;
let sttServerProcess = null;
let sttServerBaseUrl = "";
let sttServerBackend = "";
let sttLastError = "";
let sttDockerManagedByApp = false;
let sttWarmingStartedAt = 0;
let shutdownCleanupStarted = false;

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

function getXttsSpeakerHostDir() {
  try {
    const dir = path.join(app.getPath("userData"), "xtts-voices");
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  } catch {
    return path.join(process.cwd(), ".xtts-voices");
  }
}

function getXttsOutputHostDir() {
  try {
    const dir = path.join(app.getPath("userData"), "xtts-output");
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  } catch {
    return path.join(process.cwd(), ".xtts-output");
  }
}

function getXttsModelHostDir() {
  try {
    const dir = path.join(app.getPath("userData"), "xtts-models");
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  } catch {
    return path.join(process.cwd(), ".xtts-models");
  }
}

function getSttModelCacheHostDir() {
  try {
    const dir = path.join(app.getPath("userData"), "stt-whisper-cache");
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  } catch {
    return path.join(process.cwd(), ".stt-whisper-cache");
  }
}

async function migrateXttsModelsFromContainer(containerName, targetDir) {
  const normalizedContainer = String(containerName || "").trim();
  const normalizedTargetDir = String(targetDir || "").trim();
  if (!normalizedContainer || !normalizedTargetDir) return { ok: false, skipped: true, reason: "missing-input" };

  try {
    fs.mkdirSync(normalizedTargetDir, { recursive: true });
  } catch {
    return { ok: false, skipped: true, reason: "mkdir-failed" };
  }

  try {
    const existing = fs.readdirSync(normalizedTargetDir, { withFileTypes: true });
    if (existing.some((entry) => entry.isDirectory() || entry.isFile())) {
      return { ok: true, skipped: true, reason: "already-populated" };
    }
  } catch {
    // ignore and continue
  }

  const copySource = `${normalizedContainer}:${XTTS_DOCKER_MODEL_DIR}/.`;
  const copyResult = await runCommand("docker", ["cp", copySource, normalizedTargetDir], { timeoutMs: 20 * 60 * 1000 });
  if (!copyResult.ok) {
    return {
      ok: false,
      skipped: false,
      reason: "copy-failed",
      error: (copyResult.stderr || copyResult.stdout || "docker cp failed").trim(),
    };
  }
  return { ok: true, skipped: false };
}

function toXttsContainerSpeakerPath(filePath) {
  const name = path.basename(String(filePath || "").trim());
  if (!name) return "";
  return path.posix.join(XTTS_DOCKER_SPEAKER_DIR, name);
}

async function getDockerStatus() {
  const versionResult = await runCommand("docker", ["--version"], { timeoutMs: 10000 });
  if (!versionResult.ok) {
    return {
      installed: false,
      running: false,
      healthy: false,
      version: "",
      error: "Docker CLI is not installed or not available in PATH.",
    };
  }
  const infoResult = await runCommand("docker", ["info"], { timeoutMs: 15000 });
  return {
    installed: true,
    running: infoResult.ok,
    healthy: infoResult.ok,
    version: (versionResult.stdout || versionResult.stderr || "").trim(),
    error: infoResult.ok ? "" : (infoResult.stderr || infoResult.stdout || "Docker daemon is not reachable.").trim(),
  };
}

function getDockerDesktopLaunchCandidates() {
  if (process.platform === "win32") {
    return [
      path.join(process.env["ProgramFiles"] || "C:\\Program Files", "Docker", "Docker", "Docker Desktop.exe"),
      path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Docker", "Docker", "Docker Desktop.exe"),
      path.join(process.env["LocalAppData"] || "", "Docker", "Docker Desktop.exe"),
    ].filter(Boolean);
  }
  if (process.platform === "darwin") {
    return ["/Applications/Docker.app"];
  }
  return ["docker-desktop", "docker"];
}

async function startDockerDesktop(options = {}) {
  const candidates = getDockerDesktopLaunchCandidates();

  if (process.platform === "win32") {
    const launchPath = candidates.find((candidate) => {
      try {
        return candidate && fs.existsSync(candidate);
      } catch {
        return false;
      }
    });
    if (!launchPath) {
      return {
        success: false,
        started: false,
        error: "Docker Desktop executable was not found. Install Docker Desktop first.",
      };
    }
    const child = spawn(launchPath, [], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
  } else if (process.platform === "darwin") {
    const openResult = await runCommand("open", ["-a", "Docker"], { timeoutMs: 10000 });
    if (!openResult.ok) {
      return {
        success: false,
        started: false,
        error: (openResult.stderr || openResult.stdout || "Failed to launch Docker.app").trim(),
      };
    }
  } else {
    const launchResult = await runCommand("sh", ["-lc", "docker-desktop >/dev/null 2>&1 &"], { timeoutMs: 5000 });
    if (!launchResult.ok) {
      return {
        success: false,
        started: false,
        error: (launchResult.stderr || launchResult.stdout || "Failed to launch Docker Desktop.").trim(),
      };
    }
  }

  const waitMs = Math.max(10000, Number(options.waitMs || 60000));
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    const status = await getDockerStatus();
    if (status.running) {
      return {
        success: true,
        started: true,
        running: true,
        ...status,
      };
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const finalStatus = await getDockerStatus();
  return {
    success: finalStatus.running,
    started: true,
    running: finalStatus.running,
    ...finalStatus,
    error: finalStatus.running ? "" : (finalStatus.error || "Docker Desktop launch timed out."),
  };
}

async function checkOllamaStatus(options = {}) {
  const baseUrl = String(options.baseUrl || "http://127.0.0.1:11434").trim().replace(/\/+$/, "");
  const configuredModel = String(options.model || "").trim();
  const result = {
    healthy: false,
    running: false,
    installed: false,
    version: "",
    error: "",
    baseUrl,
    models: [],
    configuredModel,
    hasConfiguredModel: false,
  };

  const versionResult = await runCommand("ollama", ["--version"], { timeoutMs: 10000 });
  result.installed = versionResult.ok;
  result.version = (versionResult.stdout || versionResult.stderr || "").trim();
  if (!versionResult.ok) {
    result.error = "Ollama CLI is not installed or not available in PATH.";
    return result;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!response.ok) {
      result.error = `Ollama server responded with ${response.status}.`;
      return result;
    }
    const data = await response.json().catch(() => ({}));
    result.models = Array.isArray(data?.models)
      ? data.models.map((entry) => String(entry?.name || "").trim()).filter(Boolean)
      : [];
    result.running = true;
    result.healthy = true;
    result.hasConfiguredModel = configuredModel ? result.models.includes(configuredModel) : result.models.length > 0;
    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : "Failed to reach Ollama server.";
    return result;
  } finally {
    clearTimeout(timer);
  }
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

function runCommand(command, args, options = {}) {
  return new Promise((resolve) => {
    const timeoutMs = Number(options.timeoutMs || 0);
    const spawnOptions = { ...options };
    delete spawnOptions.timeoutMs;

    const child = spawn(command, args, {
      windowsHide: true,
      ...spawnOptions,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let timeoutId = null;
    let settled = false;

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        try {
          child.kill();
        } catch {
          // ignore kill failures
        }
        // Windows can ignore/hold kill; never leave caller hanging.
        setTimeout(() => {
          if (settled) return;
          finish({
            ok: false,
            code: -1,
            stdout,
            stderr: stderr || `Command timed out after ${timeoutMs}ms`,
          });
        }, 1500);
      }, timeoutMs);
    }

    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      resolve(result);
    };

    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      finish({ ok: false, code: -1, stdout, stderr: error.message || String(error) });
    });
    child.on("exit", (code) => {
      if (timedOut) {
        finish({
          ok: false,
          code: -1,
          stdout,
          stderr: stderr || `Command timed out after ${timeoutMs}ms`,
        });
        return;
      }
      finish({ ok: code === 0, code: code ?? -1, stdout, stderr });
    });
  });
}

function runCommandSync(command, args, options = {}) {
  try {
    const result = spawnSync(command, args, {
      windowsHide: true,
      encoding: "utf8",
      ...options,
    });
    return {
      ok: result.status === 0,
      code: result.status ?? -1,
      stdout: result.stdout || "",
      stderr: result.stderr || "",
    };
  } catch (error) {
    return {
      ok: false,
      code: -1,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
    };
  }
}

function normalizeLocalBaseUrl(value, fallback = "http://127.0.0.1:9890") {
  const raw = String(value || "").trim() || fallback;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: "Invalid local base URL.", baseUrl: "", hostname: "", port: 0 };
  }
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) {
    return {
      ok: false,
      error: "Local server URL must use localhost or 127.0.0.1.",
      baseUrl: "",
      hostname: parsed.hostname,
      port: 0,
    };
  }
  const port = Number(parsed.port || (parsed.protocol === "https:" ? 443 : 80));
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    return { ok: false, error: "Invalid local server port.", baseUrl: "", hostname: parsed.hostname, port: 0 };
  }
  return {
    ok: true,
    error: "",
    hostname: parsed.hostname,
    port,
    baseUrl: `${parsed.protocol}//${parsed.hostname}:${port}`,
  };
}

function findAvailablePort(host, preferredPort, minPort = STT_MIN_PORT, maxPort = STT_MAX_PORT) {
  const tried = new Set();
  const candidates = [];
  if (Number.isInteger(preferredPort) && preferredPort > 0) candidates.push(preferredPort);
  for (let port = minPort; port <= maxPort; port += 1) {
    if (!tried.has(port)) candidates.push(port);
  }

  const tryPort = (port) =>
    new Promise((resolve) => {
      if (tried.has(port)) {
        resolve(false);
        return;
      }
      tried.add(port);
      const tester = net.createServer();
      tester.once("error", () => resolve(false));
      tester.once("listening", () => {
        tester.close(() => resolve(true));
      });
      tester.listen(port, host);
    });

  return new Promise(async (resolve) => {
    for (const port of candidates) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await tryPort(port);
      if (ok) {
        resolve(port);
        return;
      }
    }
    resolve(null);
  });
}

async function checkSttHealth(baseUrl, timeoutMs = 3000) {
  const base = String(baseUrl || "").replace(/\/+$/, "");
  if (!base) return false;
  const deadline = Date.now() + Math.max(1000, timeoutMs);
  const endpoints = ["/health", "/openapi.json", "/", "/transcribe", "/asr"];
  while (Date.now() < deadline) {
    for (const endpoint of endpoints) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      try {
        const response = await fetch(`${base}${endpoint}`, {
          method: "GET",
          signal: controller.signal,
        });
        if (response.ok) return true;
        // Some STT servers expose /transcribe or /asr as POST-only and return 400/405 on GET when healthy.
        if ((endpoint === "/transcribe" || endpoint === "/asr") && (response.status === 400 || response.status === 405)) {
          return true;
        }
      } catch {
        // retry
      } finally {
        clearTimeout(timer);
      }
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  return false;
}

async function waitForSttHealthyInBackground(baseUrl, timeoutMs = STT_HEALTH_TIMEOUT_MS) {
  const healthy = await checkSttHealth(baseUrl, timeoutMs);
  if (healthy) {
    sttServerBaseUrl = String(baseUrl || "").trim() || sttServerBaseUrl;
    if (!sttServerBackend) {
      sttServerBackend = sttDockerManagedByApp ? "docker" : "existing";
    }
    sttLastError = "";
    sttWarmingStartedAt = 0;
    logLine(`[stt:auto] healthy at ${sttServerBaseUrl}`);
    return true;
  }
  return false;
}

function computeWarmProgress(startedAt, expectedMs) {
  if (!startedAt || !expectedMs) return 0;
  const elapsed = Math.max(0, Date.now() - startedAt);
  const ratio = elapsed / expectedMs;
  return Math.max(6, Math.min(95, Math.round(ratio * 100)));
}

async function checkXttsHealth(baseUrl, timeoutMs = 3000) {
  const base = String(baseUrl || "").replace(/\/+$/, "");
  if (!base) return false;
  const deadline = Date.now() + Math.max(1000, timeoutMs);
  const endpoints = ["/health", "/docs", "/openapi.json", "/", "/api/tts"];
  while (Date.now() < deadline) {
    for (const endpoint of endpoints) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      try {
        const response = await fetch(`${base}${endpoint}`, {
          method: "GET",
          signal: controller.signal,
        });
        if (response.ok) return true;
        if (endpoint === "/api/tts" && (response.status === 400 || response.status === 405 || response.status === 422)) {
          return true;
        }
      } catch {
        // retry
      } finally {
        clearTimeout(timer);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  return false;
}

async function installXttsDependencies() {
  const dockerVersion = await runCommand("docker", ["--version"], { timeoutMs: 10000 });
  const dockerInfo = dockerVersion.ok
    ? await runCommand("docker", ["info"], { timeoutMs: 15000 })
    : { ok: false, stderr: "docker not available" };
  if (dockerVersion.ok && dockerInfo.ok) {
    const pullResult = await runCommand("docker", ["pull", XTTS_DOCKER_IMAGE], { timeoutMs: 20 * 60 * 1000 });
    if (pullResult.ok) {
      return {
        success: true,
        command: `docker pull ${XTTS_DOCKER_IMAGE}`,
        details: [
          {
            command: `docker pull ${XTTS_DOCKER_IMAGE}`,
            ok: true,
            stderr: String(pullResult.stderr || "").trim(),
            stdout: String(pullResult.stdout || "").trim(),
          },
        ],
      };
    }
  }

  const installCommands =
    process.platform === "win32"
      ? [
          "py -m pip install -U xtts-api-server",
          "python -m pip install -U xtts-api-server",
          "py -m pip install -U TTS",
          "python -m pip install -U TTS",
        ]
      : [
          "python3 -m pip install -U xtts-api-server",
          "python -m pip install -U xtts-api-server",
          "python3 -m pip install -U TTS",
          "python -m pip install -U TTS",
        ];

  const attempts = [];
  for (const commandText of installCommands) {
    const result = await runCommand(
      process.platform === "win32" ? "powershell.exe" : "sh",
      process.platform === "win32"
        ? ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", commandText]
        : ["-lc", commandText],
      { timeoutMs: 20 * 60 * 1000 }
    );
    attempts.push({
      command: commandText,
      ok: result.ok,
      stderr: String(result.stderr || "").trim(),
      stdout: String(result.stdout || "").trim(),
    });
    if (result.ok) {
      return {
        success: true,
        command: commandText,
        details: attempts,
      };
    }
  }

  return {
    success: false,
    error: "Failed to install XTTS dependencies with Docker or the available Python commands.",
    details: attempts,
  };
}

async function inspectXttsContainer() {
  const inspect = await runCommand(
    "docker",
    [
      "inspect",
      XTTS_DOCKER_CONTAINER_NAME,
      "--format",
      "{{.Config.Image}}|{{.State.Status}}|{{.State.StartedAt}}|{{json .Mounts}}|{{json .HostConfig.DeviceRequests}}",
    ],
    { timeoutMs: 12000 }
  );
  if (!inspect.ok) {
    return {
      exists: false,
      image: "",
      status: "",
      running: false,
      startedAt: "",
      mounts: [],
      hasSpeakerMount: false,
      hasOutputMount: false,
      hasModelMount: false,
      mode: "",
    };
  }
  const line = String(inspect.stdout || "").trim().split(/\r?\n/).find(Boolean) || "";
  const [image = "", status = "", startedAt = "", mountsJson = "[]", deviceRequestsJson = "null"] = line.split("|");
  let mounts = [];
  let deviceRequests = null;
  try {
    mounts = JSON.parse(mountsJson);
  } catch {
    mounts = [];
  }
  try {
    deviceRequests = JSON.parse(deviceRequestsJson);
  } catch {
    deviceRequests = null;
  }
  const hasGpuAccess = Array.isArray(deviceRequests) && deviceRequests.some((request) =>
    Array.isArray(request?.Capabilities) &&
    request.Capabilities.some((group) => Array.isArray(group) && group.includes("gpu"))
  );
  return {
    exists: true,
    image,
    status,
    running: /running/i.test(status),
    startedAt,
    mounts,
    hasSpeakerMount: mounts.some((mount) => String(mount?.Destination || "").trim() === XTTS_DOCKER_SPEAKER_DIR),
    hasOutputMount: mounts.some((mount) => String(mount?.Destination || "").trim() === XTTS_DOCKER_OUTPUT_DIR),
    hasModelMount: mounts.some((mount) => String(mount?.Destination || "").trim() === XTTS_DOCKER_MODEL_DIR),
    mode: hasGpuAccess ? "gpu" : "docker",
  };
}

async function waitForXttsHealthyInBackground(baseUrl, timeoutMs = XTTS_HEALTH_TIMEOUT_MS) {
  const healthy = await checkXttsHealth(baseUrl, timeoutMs);
  if (healthy) {
    xttsServerBaseUrl = String(baseUrl || "").trim() || xttsServerBaseUrl;
    if (!xttsServerBackend) {
      xttsServerBackend = xttsServerProcess && !xttsServerProcess.killed ? "command" : "existing";
    }
    xttsLastError = "";
    xttsLastDetails = [];
    xttsWarmingStartedAt = 0;
    logLine(`[xtts:auto] healthy at ${xttsServerBaseUrl}`);
    return true;
  }
  return false;
}

async function startManagedXttsServer(options = {}) {
  const normalized = normalizeLocalBaseUrl(options.baseUrl || XTTS_AUTO_START_BASE_URL, XTTS_AUTO_START_BASE_URL);
  if (!normalized.ok) {
    xttsLastError = normalized.error;
    xttsLastDetails = [];
    return { success: false, error: normalized.error };
  }
  const existingContainer = await inspectXttsContainer();
  const forceRecreate = Boolean(options.forceRecreate);
  const alreadyHealthy = await checkXttsHealth(normalized.baseUrl, 2200);
  if (
    !forceRecreate &&
    alreadyHealthy &&
    !(
      existingContainer.exists &&
      existingContainer.image === XTTS_DOCKER_IMAGE &&
      (!existingContainer.hasSpeakerMount || !existingContainer.hasOutputMount || !existingContainer.hasModelMount)
    )
  ) {
    xttsServerBaseUrl = normalized.baseUrl;
    xttsServerBackend = existingContainer.exists && existingContainer.image === XTTS_DOCKER_IMAGE ? "docker" : "existing";
    xttsLastError = "";
    xttsLastDetails = [];
    xttsDockerManagedByApp = false;
    return {
      success: true,
      running: true,
      healthy: true,
      managed: false,
      baseUrl: normalized.baseUrl,
      backend: xttsServerBackend,
      pid: null,
    };
  }

  if ((alreadyHealthy || forceRecreate) && existingContainer.exists && existingContainer.image === XTTS_DOCKER_IMAGE && !existingContainer.hasSpeakerMount) {
    logLine("[xtts:auto] existing XTTS container is healthy but missing speaker mount; recreating container");
  }

  if (xttsServerProcess && !xttsServerProcess.killed) {
    try {
      xttsServerProcess.kill();
    } catch {
      // ignore
    }
    xttsServerProcess = null;
  }

  const dockerVersion = await runCommand("docker", ["--version"], { timeoutMs: 10000 });
  const dockerInfo = dockerVersion.ok
    ? await runCommand("docker", ["info"], { timeoutMs: 15000 })
    : { ok: false, stderr: "docker not available" };
  if (dockerVersion.ok && dockerInfo.ok) {
    const gpuSupport = await detectKokoroGpuSupport();
    const xttsSpeakerHostDir = getXttsSpeakerHostDir();
    const xttsOutputHostDir = getXttsOutputHostDir();
    const xttsModelHostDir = getXttsModelHostDir();
    if (existingContainer.exists && existingContainer.image === XTTS_DOCKER_IMAGE && !existingContainer.hasModelMount) {
      const migration = await migrateXttsModelsFromContainer(XTTS_DOCKER_CONTAINER_NAME, xttsModelHostDir);
      if (!migration.ok && !migration.skipped) {
        logLine(`[xtts:auto] failed to migrate XTTS model cache: ${migration.error || migration.reason}`);
      } else if (!migration.skipped) {
        logLine("[xtts:auto] migrated XTTS model cache from old container into host storage");
      }
    }
    await runCommand("docker", ["rm", "-f", XTTS_DOCKER_CONTAINER_NAME], { timeoutMs: 20000 });
    const runResult = await runCommand(
      "docker",
      [
        "run",
        "-d",
        "--name",
        XTTS_DOCKER_CONTAINER_NAME,
        "-p",
        `127.0.0.1:${normalized.port}:${XTTS_DOCKER_CONTAINER_PORT}`,
        ...(gpuSupport.supportsGpu ? ["--gpus", "all"] : []),
        "-v",
        `${xttsSpeakerHostDir}:${XTTS_DOCKER_SPEAKER_DIR}`,
        "-v",
        `${xttsOutputHostDir}:${XTTS_DOCKER_OUTPUT_DIR}`,
        "-v",
        `${xttsModelHostDir}:${XTTS_DOCKER_MODEL_DIR}`,
        XTTS_DOCKER_IMAGE,
      ],
      { timeoutMs: 120000 }
    );
    if (runResult.ok) {
      xttsWarmingStartedAt = Date.now();
      const dockerHealthy = await checkXttsHealth(
        normalized.baseUrl,
        Number(options.initialHealthTimeoutMs || XTTS_INITIAL_HEALTH_TIMEOUT_MS)
      );
      if (dockerHealthy) {
        xttsServerBaseUrl = normalized.baseUrl;
        xttsServerBackend = "docker";
        xttsLastError = "";
        xttsLastDetails = [];
        xttsDockerManagedByApp = true;
        xttsWarmingStartedAt = 0;
        return {
          success: true,
          running: true,
          healthy: true,
          managed: true,
          baseUrl: normalized.baseUrl,
          backend: "docker",
          pid: null,
        };
      }
      xttsServerBaseUrl = normalized.baseUrl;
      xttsServerBackend = "docker";
      xttsDockerManagedByApp = true;
      xttsLastError = "XTTS Docker container is still warming up. Leave it running and refresh again in a minute.";
      xttsLastDetails = [`docker run ${XTTS_DOCKER_IMAGE}`];
      return {
        success: false,
        running: true,
        healthy: false,
        managed: true,
        baseUrl: normalized.baseUrl,
        backend: "docker",
        pid: null,
        error: xttsLastError,
        details: xttsLastDetails,
      };
    }
  }

  const configuredCommand = String(options.startCommand || XTTS_START_COMMAND || "").trim();
  const defaultCommands =
    process.platform === "win32"
      ? [
          "xtts-api-server --host $env:HOST --port $env:XTTS_PORT",
          "python -m xtts_api_server --host $env:HOST --port $env:XTTS_PORT",
          "py -m xtts_api_server --host $env:HOST --port $env:XTTS_PORT",
          "python -m TTS.server.server --model_name tts_models/multilingual/multi-dataset/xtts_v2 --host $env:HOST --port $env:XTTS_PORT",
          "py -m TTS.server.server --model_name tts_models/multilingual/multi-dataset/xtts_v2 --host $env:HOST --port $env:XTTS_PORT",
        ]
      : [
          "xtts-api-server --host \"$HOST\" --port \"$XTTS_PORT\"",
          "python3 -m xtts_api_server --host \"$HOST\" --port \"$XTTS_PORT\"",
          "python -m xtts_api_server --host \"$HOST\" --port \"$XTTS_PORT\"",
          "python3 -m TTS.server.server --model_name tts_models/multilingual/multi-dataset/xtts_v2 --host \"$HOST\" --port \"$XTTS_PORT\"",
          "python -m TTS.server.server --model_name tts_models/multilingual/multi-dataset/xtts_v2 --host \"$HOST\" --port \"$XTTS_PORT\"",
        ];
  const startCommands = configuredCommand ? [configuredCommand] : defaultCommands;
  const launchErrors = [];

  for (const startCommand of startCommands) {
    let attemptStdout = "";
    let attemptStderr = "";
    const child = spawn(
      process.platform === "win32" ? "powershell.exe" : "sh",
      process.platform === "win32"
        ? ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", startCommand]
        : ["-lc", startCommand],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PORT: String(normalized.port),
          XTTS_PORT: String(normalized.port),
          XTTS_BASE_URL: normalized.baseUrl,
          HOST: normalized.hostname,
          HOSTNAME: normalized.hostname,
          COQUI_TOS_AGREED: process.env.COQUI_TOS_AGREED || "1",
        },
        windowsHide: true,
        stdio: "pipe",
      }
    );

    xttsServerProcess = child;
    xttsServerBaseUrl = normalized.baseUrl;
    xttsServerBackend = "command";
    xttsWarmingStartedAt = Date.now();
    child.stdout?.on("data", (chunk) => {
      const text = String(chunk).trim();
      attemptStdout = `${attemptStdout}\n${text}`.trim().slice(-800);
      logLine(`[xtts stdout] ${text}`);
    });
    child.stderr?.on("data", (chunk) => {
      const text = String(chunk).trim();
      attemptStderr = `${attemptStderr}\n${text}`.trim().slice(-800);
      logLine(`[xtts stderr] ${text}`);
    });
    child.on("exit", (code) => {
      logLine(`[xtts] managed server exited with code ${code}`);
      if (xttsServerProcess === child) {
        xttsServerProcess = null;
      }
    });

    const becameHealthy = await checkXttsHealth(normalized.baseUrl, Number(options.healthTimeoutMs || XTTS_HEALTH_TIMEOUT_MS));
    if (becameHealthy) {
      xttsLastError = "";
      xttsLastDetails = [];
      xttsWarmingStartedAt = 0;
      return {
        success: true,
        running: true,
        healthy: true,
        managed: true,
        baseUrl: normalized.baseUrl,
        backend: "command",
        pid: child.pid || null,
      };
    }

    launchErrors.push({
      command: startCommand,
      detail: attemptStderr || attemptStdout || "Process started but health check did not become ready.",
    });
    xttsLastError = "XTTS command process is still warming up. Wait longer and retry.";
    try {
      child.kill();
    } catch {
      // ignore
    }
    if (xttsServerProcess === child) {
      xttsServerProcess = null;
    }
    xttsWarmingStartedAt = 0;
  }

  xttsLastError = configuredCommand
    ? "XTTS failed to start with ELECTRON_XTTS_START_COMMAND."
    : "Failed to auto-start XTTS. Tried default XTTS launch commands, but none became healthy.";
  xttsLastDetails = launchErrors.map((item) => `${item.command} :: ${item.detail}`).slice(0, 3);
  return {
    success: false,
    running: false,
    healthy: false,
    managed: false,
    baseUrl: normalized.baseUrl,
    error: xttsLastError,
    details: xttsLastDetails,
  };
}

async function getXttsStatus(baseUrlInput) {
  const fallbackBase = xttsServerBaseUrl || XTTS_AUTO_START_BASE_URL;
  const normalized = normalizeLocalBaseUrl(baseUrlInput || fallbackBase, fallbackBase);
  if (!normalized.ok) {
    return { success: false, error: normalized.error };
  }
  const inspected = await inspectXttsContainer();
  const mountMissingForManagedDocker =
    inspected.exists &&
    inspected.image === XTTS_DOCKER_IMAGE &&
    (!inspected.hasSpeakerMount || !inspected.hasOutputMount || !inspected.hasModelMount);
  const endpointHealthy = await checkXttsHealth(normalized.baseUrl, 2200);
  const legacyButUsableDocker =
    inspected.running &&
    inspected.image === XTTS_DOCKER_IMAGE &&
    inspected.hasSpeakerMount &&
    inspected.hasOutputMount;
  const healthy = endpointHealthy || legacyButUsableDocker;
  const startedAtMs = inspected.startedAt ? Date.parse(inspected.startedAt) : 0;
  const recentDockerStart =
    inspected.running &&
    startedAtMs > 0 &&
    Date.now() - startedAtMs < XTTS_HEALTH_TIMEOUT_MS;
  let warming = !healthy && Boolean(xttsServerProcess && !xttsServerProcess.killed);
  if (!healthy && xttsServerBackend === "docker") {
    warming = recentDockerStart;
  }
  if (healthy) {
    xttsLastError = "";
    xttsLastDetails = mountMissingForManagedDocker
      ? ["XTTS is running from a legacy container. Recreate XTTS later if you want the model cache persisted on the host."]
      : [];
    xttsWarmingStartedAt = 0;
  } else if (mountMissingForManagedDocker) {
    xttsLastError = "XTTS container needs to be recreated to mount the app-managed voice sample and output folders.";
    xttsLastDetails = [
      `docker container ${XTTS_DOCKER_CONTAINER_NAME} is missing ${
        !inspected.hasSpeakerMount
          ? XTTS_DOCKER_SPEAKER_DIR
          : !inspected.hasOutputMount
            ? XTTS_DOCKER_OUTPUT_DIR
            : XTTS_DOCKER_MODEL_DIR
      }`,
    ];
  } else if (inspected.running && !warming) {
    xttsLastError = "XTTS container is running, but health checks are still failing. Recreate XTTS.";
    xttsLastDetails = [
      `container ${XTTS_DOCKER_CONTAINER_NAME} has been up since ${inspected.startedAt || "unknown time"}`,
    ];
  }
  return {
    success: true,
    healthy,
    running: healthy || warming,
    warming,
    warmingStartedAt: warming ? xttsWarmingStartedAt || 0 : 0,
    warmingProgress: warming ? computeWarmProgress(xttsWarmingStartedAt || 0, XTTS_HEALTH_TIMEOUT_MS) : 0,
    managed: Boolean((xttsServerProcess && !xttsServerProcess.killed) || (xttsServerBackend === "docker" && xttsDockerManagedByApp)),
    pid: xttsServerProcess?.pid || null,
    baseUrl: normalized.baseUrl,
    backend: xttsServerBackend || (inspected.exists && inspected.image === XTTS_DOCKER_IMAGE ? "docker" : healthy ? "existing" : ""),
    mode: inspected.mode || null,
    error: healthy ? "" : xttsLastError,
    details: healthy ? [] : xttsLastDetails,
    startCommandConfigured: Boolean(String(XTTS_START_COMMAND || "").trim()),
    autoStartEnabled: XTTS_AUTO_START,
  };
}

async function stopXttsServer() {
  let stoppedProcess = false;
  let removedContainer = false;
  if (xttsServerProcess && !xttsServerProcess.killed) {
    try {
      xttsServerProcess.kill();
      stoppedProcess = true;
    } catch {
      // ignore
    }
  }
  xttsServerProcess = null;
  try {
    const removeResult = await runCommand("docker", ["rm", "-f", XTTS_DOCKER_CONTAINER_NAME], { timeoutMs: 30000 });
    removedContainer = Boolean(removeResult.ok);
  } catch {
    // ignore
  }
  xttsDockerManagedByApp = false;
  xttsServerBackend = "";
  xttsLastError = "";
  xttsLastDetails = [];
  xttsWarmingStartedAt = 0;
  return {
    success: true,
    stopped: stoppedProcess || removedContainer,
    process: stoppedProcess,
    container: removedContainer,
  };
}

async function autoStartXttsInBackground() {
  if (!XTTS_AUTO_START) {
    logLine("[xtts:auto] disabled by ELECTRON_XTTS_AUTO_START=0");
    return;
  }
  if (xttsAutoStartAttempted) return;
  xttsAutoStartAttempted = true;
  try {
    const status = await getXttsStatus(XTTS_AUTO_START_BASE_URL);
    if (status.success && status.healthy) {
      logLine(`[xtts:auto] already healthy at ${status.baseUrl}`);
      return;
    }
    const started = await startManagedXttsServer({
      baseUrl: XTTS_AUTO_START_BASE_URL,
      startCommand: XTTS_START_COMMAND,
      healthTimeoutMs: XTTS_INITIAL_HEALTH_TIMEOUT_MS,
    });
    if (!started.success && started.running) {
      void waitForXttsHealthyInBackground(String(started.baseUrl || XTTS_AUTO_START_BASE_URL), XTTS_HEALTH_TIMEOUT_MS);
      logLine(`[xtts:auto] warming at ${started.baseUrl || XTTS_AUTO_START_BASE_URL}`);
      return;
    }
    if (started.success) {
      logLine(`[xtts:auto] started at ${started.baseUrl || XTTS_AUTO_START_BASE_URL}`);
      return;
    }
    logLine(`[xtts:auto] failed: ${started.error || "unknown error"}`);
  } catch (error) {
    xttsLastError = error instanceof Error ? error.message : String(error);
    logLine(`[xtts:auto] failed: ${xttsLastError}`);
  }
}

async function startManagedSttServer(options = {}) {
  const normalized = normalizeLocalBaseUrl(options.baseUrl || STT_AUTO_START_BASE_URL, STT_AUTO_START_BASE_URL);
  if (!normalized.ok) {
    sttLastError = normalized.error;
    return { success: false, error: normalized.error };
  }
  const preferredHealthy = await checkSttHealth(normalized.baseUrl, 2200);
  if (preferredHealthy) {
    sttServerBaseUrl = normalized.baseUrl;
    sttServerBackend = "existing";
    sttDockerManagedByApp = false;
    return {
      success: true,
      running: true,
      healthy: true,
      managed: false,
      baseUrl: normalized.baseUrl,
      backend: "existing",
      pid: null,
    };
  }
  const preferredPort = Number(normalized.port || 0);
  const availablePort = await findAvailablePort(STT_HOST, preferredPort, STT_MIN_PORT, STT_MAX_PORT);
  if (!availablePort) {
    sttLastError = "No available local port found for STT server.";
    return { success: false, error: "No available local port found for STT server." };
  }
  const selectedBaseUrl = `${normalized.baseUrl.startsWith("https://") ? "https" : "http"}://${normalized.hostname}:${availablePort}`;
  const alreadyHealthy = await checkSttHealth(selectedBaseUrl, 2200);
  if (alreadyHealthy) {
    sttServerBaseUrl = selectedBaseUrl;
    sttServerBackend = "existing";
    sttLastError = "";
    sttDockerManagedByApp = false;
    return {
      success: true,
      running: true,
      healthy: true,
      managed: false,
      baseUrl: selectedBaseUrl,
      backend: "existing",
      pid: null,
    };
  }

  // Docker-first startup path (smooth desktop flow like Kokoro).
  const dockerVersion = await runCommand("docker", ["--version"], { timeoutMs: 10000 });
  const dockerInfo = dockerVersion.ok
    ? await runCommand("docker", ["info"], { timeoutMs: 15000 })
    : { ok: false, stderr: "docker not available" };
  if (dockerVersion.ok && dockerInfo.ok) {
    const gpuSupport = await detectKokoroGpuSupport();
    await runCommand("docker", ["rm", "-f", STT_DOCKER_CONTAINER_NAME], { timeoutMs: 20000 });
    const sttModelCacheHostDir = getSttModelCacheHostDir();
    const runResult = await runCommand(
      "docker",
      [
        "run",
        "-d",
        "--name",
        STT_DOCKER_CONTAINER_NAME,
        "-p",
        `127.0.0.1:${availablePort}:${STT_DOCKER_CONTAINER_PORT}`,
        ...(gpuSupport.supportsGpu ? ["--gpus", "all"] : []),
        "-e",
        `ASR_MODEL=${STT_MODEL}`,
        "-e",
        "ASR_ENGINE=openai_whisper",
        "-v",
        `${sttModelCacheHostDir}:${STT_DOCKER_MODEL_CACHE_DIR}`,
        STT_DOCKER_IMAGE,
      ],
      { timeoutMs: 120000 }
    );
    if (runResult.ok) {
      sttWarmingStartedAt = Date.now();
      const dockerHealthy = await checkSttHealth(
        selectedBaseUrl,
        Number(options.initialHealthTimeoutMs || STT_INITIAL_HEALTH_TIMEOUT_MS)
      );
      if (dockerHealthy) {
        sttServerBaseUrl = selectedBaseUrl;
        sttServerBackend = "docker";
        sttLastError = "";
        sttDockerManagedByApp = true;
        sttWarmingStartedAt = 0;
        return {
          success: true,
          running: true,
          healthy: true,
          managed: true,
          baseUrl: selectedBaseUrl,
          backend: "docker",
          pid: null,
        };
      }
      sttServerBaseUrl = selectedBaseUrl;
      sttServerBackend = "docker";
      sttLastError = "STT Docker container is still warming up or downloading the model. Leave it running and refresh again in a minute.";
      sttDockerManagedByApp = true;
      return {
        success: false,
        running: true,
        healthy: false,
        managed: true,
        baseUrl: selectedBaseUrl,
        backend: "docker",
        error: sttLastError,
      };
    } else {
      sttLastError = (runResult.stderr || runResult.stdout || "docker run failed").trim();
    }
  } else {
    sttLastError = "Docker is not available or daemon is not reachable for STT auto-start.";
  }

  if (sttServerProcess && !sttServerProcess.killed) {
    try {
      sttServerProcess.kill();
    } catch {
      // ignore
    }
    sttServerProcess = null;
  }

  const startCommand = String(options.startCommand || STT_START_COMMAND || "").trim();
  if (!startCommand) {
    sttLastError =
      "Failed to auto-start local STT. Docker STT startup failed and no ELECTRON_STT_START_COMMAND fallback is configured.";
    return {
      success: false,
      running: false,
      healthy: false,
      managed: false,
      baseUrl: selectedBaseUrl,
      error:
        "Failed to auto-start local STT. Docker STT startup failed and no ELECTRON_STT_START_COMMAND fallback is configured.",
    };
  }

  const child = spawn(
    process.platform === "win32" ? "powershell.exe" : "sh",
    process.platform === "win32"
      ? ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", startCommand]
      : ["-lc", startCommand],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(availablePort),
        STT_PORT: String(availablePort),
        LOCAL_STT_BASE_URL: selectedBaseUrl,
        HOST: STT_HOST,
        HOSTNAME: STT_HOST,
      },
      windowsHide: true,
      stdio: "pipe",
    }
  );

  sttServerProcess = child;
  sttServerBaseUrl = selectedBaseUrl;
  sttServerBackend = "command";
  sttDockerManagedByApp = false;
  child.stdout?.on("data", (chunk) => {
    logLine(`[stt stdout] ${String(chunk).trim()}`);
  });
  child.stderr?.on("data", (chunk) => {
    logLine(`[stt stderr] ${String(chunk).trim()}`);
  });
  child.on("exit", (code) => {
    logLine(`[stt] managed server exited with code ${code}`);
    if (sttServerProcess === child) {
      sttServerProcess = null;
    }
  });

  const becameHealthy = await checkSttHealth(selectedBaseUrl, Number(options.healthTimeoutMs || STT_HEALTH_TIMEOUT_MS));
  if (!becameHealthy) {
    try {
      child.kill();
    } catch {
      // ignore
    }
    if (sttServerProcess === child) sttServerProcess = null;
    sttLastError = "STT command process is still warming up. Wait longer and retry.";
    return {
      success: false,
      running: false,
      healthy: false,
      managed: true,
      baseUrl: selectedBaseUrl,
      error: "STT server start timed out waiting for /health.",
    };
  }

  return {
    success: true,
    running: true,
    healthy: true,
    managed: true,
    baseUrl: selectedBaseUrl,
    backend: "command",
    pid: child.pid || null,
  };
}

async function getSttStatus(baseUrlInput) {
  const fallbackBase = sttServerBaseUrl || STT_AUTO_START_BASE_URL;
  const normalized = normalizeLocalBaseUrl(baseUrlInput || fallbackBase, fallbackBase);
  if (!normalized.ok) {
    return { success: false, error: normalized.error };
  }
  const healthy = await checkSttHealth(normalized.baseUrl, 2200);
  const dockerInspect = await runCommand(
    "docker",
    [
      "inspect",
      STT_DOCKER_CONTAINER_NAME,
      "--format",
      "{{.Config.Image}}|{{.State.Status}}|{{json .HostConfig.DeviceRequests}}",
    ],
    { timeoutMs: 12000 }
  );
  let sttMode = healthy ? "existing" : null;
  let sttDockerRunning = false;
  if (dockerInspect.ok) {
    const line = String(dockerInspect.stdout || "").trim().split(/\r?\n/).find(Boolean) || "";
    const [image = "", status = "", deviceRequests = ""] = line.split("|");
    sttDockerRunning = /running/i.test(status);
    if (image === STT_DOCKER_IMAGE || sttServerBackend === "docker") {
      sttMode = inferDockerGpuModeFromDeviceRequests(deviceRequests);
    }
  }
  let warming = false;
  let warmingStartedAt = 0;
  let warmingProgress = 0;
  if (!healthy && sttServerBackend === "docker") {
    warming = sttDockerRunning;
    if (warming) {
      warmingStartedAt = sttWarmingStartedAt || 0;
      warmingProgress = computeWarmProgress(warmingStartedAt, STT_HEALTH_TIMEOUT_MS);
    }
  }
  if (healthy) {
    sttLastError = "";
    sttWarmingStartedAt = 0;
  }
  return {
    success: true,
    healthy,
    running: healthy || warming,
    warming,
    warmingStartedAt,
    warmingProgress,
    managed: Boolean((sttServerProcess && !sttServerProcess.killed) || (sttServerBackend === "docker" && sttDockerManagedByApp)),
    pid: sttServerProcess?.pid || null,
    baseUrl: normalized.baseUrl,
    backend: sttServerBackend || (healthy ? "existing" : ""),
    mode: sttMode,
    error: healthy ? "" : sttLastError,
    startCommandConfigured: Boolean(String(STT_START_COMMAND || "").trim()),
    autoStartEnabled: STT_AUTO_START,
  };
}

async function stopSttServer() {
  let stoppedProcess = false;
  let removedContainer = false;
  if (sttServerProcess && !sttServerProcess.killed) {
    try {
      sttServerProcess.kill();
      stoppedProcess = true;
    } catch {
      // ignore
    }
  }
  sttServerProcess = null;
  try {
    const removeResult = await runCommand("docker", ["rm", "-f", STT_DOCKER_CONTAINER_NAME], { timeoutMs: 30000 });
    removedContainer = Boolean(removeResult.ok);
  } catch {
    // ignore
  }
  sttDockerManagedByApp = false;
  sttServerBackend = "";
  sttLastError = "";
  sttWarmingStartedAt = 0;
  return {
    success: true,
    stopped: stoppedProcess || removedContainer,
    process: stoppedProcess,
    container: removedContainer,
  };
}

async function getDesktopEnvironmentStatus(options = {}) {
  const docker = await getDockerStatus();
  const ollama = await checkOllamaStatus({
    baseUrl: options.ollamaBaseUrl,
    model: options.ollamaModel,
  });
  const kokoro = await getKokoroStatus(options.kokoroBaseUrl || KOKORO_AUTO_START_BASE_URL);
  const xtts = await getXttsStatus(options.xttsBaseUrl || XTTS_AUTO_START_BASE_URL);
  const stt = await getSttStatus(options.sttBaseUrl || STT_AUTO_START_BASE_URL);

  return {
    platform: process.platform,
    isPackaged: app.isPackaged,
    userDataPath: app.getPath("userData"),
    logFilePath,
    docker,
    ollama,
    kokoro,
    xtts,
    stt,
  };
}

async function autoStartSttInBackground() {
  if (!STT_AUTO_START) {
    logLine("[stt:auto] disabled by ELECTRON_STT_AUTO_START=0");
    return;
  }
  if (sttAutoStartAttempted) return;
  sttAutoStartAttempted = true;
  try {
    const status = await getSttStatus(STT_AUTO_START_BASE_URL);
    if (status.success && status.healthy) {
      logLine(`[stt:auto] already healthy at ${status.baseUrl}`);
      return;
    }
    logLine("[stt:auto] attempting managed STT server startup");
    const started = await startManagedSttServer({
      baseUrl: STT_AUTO_START_BASE_URL,
      startCommand: STT_START_COMMAND,
      healthTimeoutMs: STT_HEALTH_TIMEOUT_MS,
      initialHealthTimeoutMs: STT_INITIAL_HEALTH_TIMEOUT_MS,
    });
    if (started.success) {
      logLine(`[stt:auto] started successfully at ${started.baseUrl}`);
      return;
    }
    if (started.running && started.baseUrl) {
      logLine(`[stt:auto] container running, continuing background warm-up check at ${started.baseUrl}`);
      void waitForSttHealthyInBackground(String(started.baseUrl), STT_HEALTH_TIMEOUT_MS);
      return;
    }
    sttLastError = String(started.error || "");
    logLine(`[stt:auto] failed: ${started.error || "unknown error"}`);
  } catch (error) {
    sttLastError = error instanceof Error ? error.message : String(error);
    logLine(`[stt:auto] failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function parseDockerDaemonError(output) {
  const text = String(output || "");
  const lower = text.toLowerCase();
  if (
    lower.includes("dockerdesktoplinuxengine") ||
    lower.includes("cannot find the file specified") ||
    lower.includes("daemon is running")
  ) {
    return "Docker Desktop engine is not running. Start Docker Desktop, switch to Linux containers, then retry.";
  }
  if (lower.includes("permission denied")) {
    return "Docker daemon is reachable but permission was denied. Run Docker Desktop as your user/admin and retry.";
  }
  return "";
}

function inferKokoroMode(modeHint, imageHint) {
  const modeText = String(modeHint || "").toLowerCase();
  const imageText = String(imageHint || "").toLowerCase();
  if (modeText.includes("gpu") || imageText.includes("-gpu")) return "gpu";
  if (modeText.includes("cpu") || imageText.includes("-cpu")) return "cpu";
  if (modeText.includes("existing")) return "existing";
  if (imageText) return "custom";
  return null;
}

function inferKokoroModeFromInspect(imageHint, deviceRequestsHint) {
  const imageText = String(imageHint || "").toLowerCase();
  const deviceText = String(deviceRequestsHint || "").toLowerCase();
  if (imageText.includes("-gpu")) return "gpu";
  if (imageText.includes("-cpu")) return "cpu";
  // Fallback: detect GPU runtime assignment from device requests.
  if (deviceText.includes("gpu") || deviceText.includes("nvidia")) return "gpu";
  if (imageText) return "custom";
  return null;
}

function inferDockerGpuModeFromDeviceRequests(deviceRequestsHint) {
  const deviceText = String(deviceRequestsHint || "").toLowerCase();
  return deviceText.includes("gpu") || deviceText.includes("nvidia") ? "gpu" : "cpu";
}

async function inspectKokoroContainer() {
  const inspect = await runCommand(
    "docker",
    [
      "inspect",
      KOKORO_CONTAINER_NAME,
      "--format",
      "{{.Config.Image}}|{{.State.Status}}|{{json .HostConfig.DeviceRequests}}",
    ],
    { timeoutMs: 12000 }
  );
  if (!inspect.ok) {
    return {
      exists: false,
      image: "",
      status: "",
      mode: null,
      running: false,
    };
  }
  const line = String(inspect.stdout || "").trim().split(/\r?\n/).find(Boolean) || "";
  const [image = "", status = "", deviceRequests = ""] = line.split("|");
  const running = /running/i.test(status);
  const mode = inferKokoroModeFromInspect(image, deviceRequests);
  return {
    exists: true,
    image,
    status,
    mode,
    running,
  };
}

async function checkKokoroHealth(baseUrl, timeoutMs = 5000) {
  const healthUrl = `${baseUrl.replace(/\/+$/, "")}/health`;
  const deadline = Date.now() + Math.max(1000, timeoutMs);
  while (Date.now() < deadline) {
    const controller = new AbortController();
    const requestTimer = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch(healthUrl, {
        method: "GET",
        signal: controller.signal,
      });
      if (response.ok) {
        const text = await response.text().catch(() => "");
        if (/healthy|ok/i.test(text || "")) return true;
      }
    } catch {
      // service may still be booting; retry until timeout
    } finally {
      clearTimeout(requestTimer);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function getKokoroStatus(baseUrlInput) {
  const requestedBaseUrl = String(baseUrlInput || "").trim() || "http://127.0.0.1:8880";
  let parsed;
  try {
    parsed = new URL(requestedBaseUrl);
  } catch {
    return { success: false, error: "Invalid Kokoro base URL." };
  }
  const targetPort = Number(parsed.port || (parsed.protocol === "https:" ? 443 : 80));
  if (!Number.isInteger(targetPort) || targetPort <= 0 || targetPort > 65535) {
    return { success: false, error: "Invalid Kokoro port." };
  }
  const normalizedBaseUrl = `${parsed.protocol}//${parsed.hostname}:${targetPort}`;
  const healthy = await checkKokoroHealth(normalizedBaseUrl, 3000);

  const dockerVersion = await runCommand("docker", ["--version"], { timeoutMs: 10000 });
  if (!dockerVersion.ok) {
    return {
      success: true,
      healthy,
      running: false,
      mode: healthy ? "existing" : null,
      image: "",
      baseUrl: normalizedBaseUrl,
    };
  }

  const inspected = await inspectKokoroContainer();
  const gpuSupport = await detectKokoroGpuSupport();
  const gpuImageLocal = gpuSupport.supportsGpu ? await dockerImageExistsLocally(KOKORO_DOCKER_IMAGE_GPU) : false;
  const upgradeAvailable =
    healthy &&
    inspected.exists &&
    inspected.mode === "cpu" &&
    gpuSupport.supportsGpu &&
    gpuImageLocal;
  const mode = inspected.mode || (healthy ? "existing" : null);
  const warming = Boolean(inspected.running && !healthy);
  if (healthy) {
    kokoroWarmingStartedAt = 0;
  }

  return {
    success: true,
    healthy,
    running: inspected.running,
    managed: Boolean(kokoroManagedByApp && inspected.running),
    warming,
    warmingStartedAt: warming ? kokoroWarmingStartedAt || 0 : 0,
    warmingProgress: warming ? computeWarmProgress(kokoroWarmingStartedAt || 0, 45000) : 0,
      mode,
      image: inspected.image,
      status: inspected.status,
      upgradeAvailable,
      gpuDetected: gpuSupport.supportsGpu,
      baseUrl: normalizedBaseUrl,
    };
  }

async function stopKokoroServer() {
  let removedContainer = false;
  try {
    const removeResult = await runCommand("docker", ["rm", "-f", KOKORO_CONTAINER_NAME], { timeoutMs: 30000 });
    removedContainer = Boolean(removeResult.ok);
  } catch {
    // ignore
  }
  kokoroManagedByApp = false;
  kokoroWarmingStartedAt = 0;
  return {
    success: true,
    stopped: removedContainer,
    container: removedContainer,
  };
}

async function detectKokoroGpuSupport() {
  if (KOKORO_FORCE_CPU) {
    return { supportsGpu: false, reason: "CPU forced via ELECTRON_KOKORO_FORCE_CPU=1" };
  }

  const nvidiaSmi = await runCommand("nvidia-smi", ["-L"], { timeoutMs: 10000 });
  if (!nvidiaSmi.ok || !nvidiaSmi.stdout.trim()) {
    if (KOKORO_FORCE_GPU) {
      return { supportsGpu: true, reason: "GPU forced via ELECTRON_KOKORO_FORCE_GPU=1" };
    }
    return { supportsGpu: false, reason: "nvidia-smi not available" };
  }

  const dockerInfo = await runCommand("docker", ["info", "--format", "{{json .Runtimes}}"], { timeoutMs: 15000 });
  if (!dockerInfo.ok) {
    if (KOKORO_FORCE_GPU) {
      return { supportsGpu: true, reason: "GPU forced via ELECTRON_KOKORO_FORCE_GPU=1" };
    }
    return { supportsGpu: false, reason: "docker info failed for runtime detection" };
  }

  const runtimeText = (dockerInfo.stdout || "").trim().toLowerCase();
  const hasNvidiaRuntime = runtimeText.includes("\"nvidia\"");
  if (!hasNvidiaRuntime && !KOKORO_FORCE_GPU) {
    return { supportsGpu: false, reason: "docker nvidia runtime not detected" };
  }

  return { supportsGpu: true, reason: hasNvidiaRuntime ? "nvidia GPU/runtime detected" : "GPU forced via ELECTRON_KOKORO_FORCE_GPU=1" };
}

async function dockerImageExistsLocally(imageRef) {
  const check = await runCommand("docker", ["image", "inspect", imageRef], { timeoutMs: 12000 });
  return check.ok;
}

async function autoStartKokoroInBackground() {
  if (!KOKORO_AUTO_START) {
    logLine("[kokoro:auto] disabled by ELECTRON_KOKORO_AUTO_START=0");
    return;
  }
  if (kokoroAutoStartAttempted) return;
  kokoroAutoStartAttempted = true;

  try {
    const parsed = new URL(KOKORO_AUTO_START_BASE_URL.trim() || "http://127.0.0.1:8880");
    if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) {
      logLine(`[kokoro:auto] skipped: base URL must be local (${parsed.hostname})`);
      return;
    }
    const targetPort = Number(parsed.port || (parsed.protocol === "https:" ? 443 : 80));
    if (!Number.isInteger(targetPort) || targetPort <= 0 || targetPort > 65535) {
      logLine("[kokoro:auto] skipped: invalid port");
      return;
    }
    const normalizedBaseUrl = `${parsed.protocol}//${parsed.hostname}:${targetPort}`;

    const healthy = await checkKokoroHealth(normalizedBaseUrl, 3000);
    if (healthy) {
      logLine(`[kokoro:auto] already healthy at ${normalizedBaseUrl}`);
      return;
    }

    const dockerVersion = await runCommand("docker", ["--version"], { timeoutMs: 10000 });
    if (!dockerVersion.ok) {
      logLine("[kokoro:auto] skipped: docker not available");
      return;
    }
    const dockerInfo = await runCommand("docker", ["info"], { timeoutMs: 15000 });
    if (!dockerInfo.ok) {
      const daemonHint = parseDockerDaemonError(`${dockerInfo.stderr || ""}\n${dockerInfo.stdout || ""}`);
      logLine(`[kokoro:auto] skipped: ${daemonHint || "docker daemon not reachable"}`);
      return;
    }

    await runCommand("docker", ["rm", "-f", KOKORO_CONTAINER_NAME], { timeoutMs: 20000 });

    const hasCustomImage = Boolean(KOKORO_DOCKER_IMAGE.trim());
    const gpuSupport = await detectKokoroGpuSupport();
    const gpuImageLocal = await dockerImageExistsLocally(KOKORO_DOCKER_IMAGE_GPU);
    const candidates = [];
    if (hasCustomImage) {
      candidates.push({
        mode: "custom",
        image: KOKORO_DOCKER_IMAGE.trim(),
        extraArgs: KOKORO_FORCE_GPU ? ["--gpus", "all"] : [],
        runTimeoutMs: 120000,
        healthTimeoutMs: 45000,
      });
    } else if (gpuSupport.supportsGpu) {
      if (gpuImageLocal) {
        candidates.push({
          mode: "gpu",
          image: KOKORO_DOCKER_IMAGE_GPU,
          extraArgs: ["--gpus", "all"],
          runTimeoutMs: 45000,
          healthTimeoutMs: 30000,
        });
        candidates.push({
          mode: "cpu-fallback",
          image: KOKORO_DOCKER_IMAGE_CPU,
          extraArgs: [],
          runTimeoutMs: 120000,
          healthTimeoutMs: 150000,
        });
      } else {
        // First-launch reliability: skip huge GPU pull and start CPU quickly.
        candidates.push({
          mode: "cpu-first",
          image: KOKORO_DOCKER_IMAGE_CPU,
          extraArgs: [],
          runTimeoutMs: 120000,
          healthTimeoutMs: 150000,
        });
      }
    } else {
      candidates.push({
        mode: "cpu",
        image: KOKORO_DOCKER_IMAGE_CPU,
        extraArgs: [],
        runTimeoutMs: 120000,
        healthTimeoutMs: 150000,
      });
    }

    for (const candidate of candidates) {
      logLine(`[kokoro:auto] trying ${candidate.mode} (${candidate.image})`);
      const runResult = await runCommand("docker", [
        "run",
        "-d",
        "--name",
        KOKORO_CONTAINER_NAME,
        "-p",
        `127.0.0.1:${targetPort}:8880`,
        ...candidate.extraArgs,
        candidate.image,
      ], { timeoutMs: Number(candidate.runTimeoutMs || 180000) });

      if (!runResult.ok) {
        logLine(`[kokoro:auto] docker run failed (${candidate.mode}): ${(runResult.stderr || runResult.stdout || "unknown error").trim()}`);
        await runCommand("docker", ["rm", "-f", KOKORO_CONTAINER_NAME], { timeoutMs: 20000 });
        continue;
      }

      kokoroWarmingStartedAt = Date.now();
      const becameHealthy = await checkKokoroHealth(normalizedBaseUrl, Number(candidate.healthTimeoutMs || 45000));
      if (becameHealthy) {
        kokoroWarmingStartedAt = 0;
        logLine(`[kokoro:auto] started successfully (${candidate.mode}) at ${normalizedBaseUrl}`);
        return;
      }

      logLine(`[kokoro:auto] health check timeout (${candidate.mode})`);
      kokoroWarmingStartedAt = 0;
      await runCommand("docker", ["rm", "-f", KOKORO_CONTAINER_NAME], { timeoutMs: 20000 });
    }

    logLine("[kokoro:auto] failed to start after trying all candidates");
  } catch (error) {
    logLine(`[kokoro:auto] failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function getSecureAuthPath() {
  return path.join(app.getPath("userData"), SECURE_AUTH_FILE);
}

function readSecureAuthMap() {
  const filePath = getSecureAuthPath();
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") return {};
  if (parsed.enc && typeof parsed.data === "string" && safeStorage.isEncryptionAvailable()) {
    const decrypted = safeStorage.decryptString(Buffer.from(parsed.data, "base64"));
    return JSON.parse(decrypted || "{}");
  }
  if (parsed.data && typeof parsed.data === "object") {
    return parsed.data;
  }
  return {};
}

function writeSecureAuthMap(data) {
  const filePath = getSecureAuthPath();
  const payload =
    safeStorage.isEncryptionAvailable()
      ? {
          enc: true,
          data: safeStorage.encryptString(JSON.stringify(data)).toString("base64"),
        }
      : {
          enc: false,
          data,
        };
  fs.writeFileSync(filePath, JSON.stringify(payload), "utf8");
}

function registerSecureAuthIpc() {
  ipcMain.handle("auth-token:set", (_event, payload) => {
    const username = String(payload?.username || "").trim().toLowerCase();
    const refreshToken = String(payload?.refreshToken || "");
    if (!username || !refreshToken) {
      return { success: false, error: "username and refreshToken are required." };
    }
    const map = readSecureAuthMap();
    map[username] = {
      refreshToken,
      updatedAt: Date.now(),
    };
    writeSecureAuthMap(map);
    return { success: true };
  });

  ipcMain.handle("auth-token:get", (_event, payload) => {
    const username = String(payload?.username || "").trim().toLowerCase();
    if (!username) return { success: false, error: "username is required." };
    const map = readSecureAuthMap();
    return { success: true, token: map[username]?.refreshToken || null };
  });

  ipcMain.handle("auth-token:clear", (_event, payload) => {
    const username = String(payload?.username || "").trim().toLowerCase();
    if (!username) return { success: false, error: "username is required." };
    const map = readSecureAuthMap();
    delete map[username];
    writeSecureAuthMap(map);
    return { success: true };
  });

  ipcMain.handle("auth-http:request", async (_event, payload) => {
    try {
      const url = String(payload?.url || "");
      const method = String(payload?.method || "GET").toUpperCase();
      const headers = payload?.headers && typeof payload.headers === "object" ? payload.headers : {};
      const body = payload?.body ? String(payload.body) : undefined;

      const parsed = new URL(url);
      const allowedOrigin = new URL(AUTH_BASE_URL).origin;
      if (parsed.origin !== allowedOrigin) {
        return { success: false, error: `Auth proxy origin mismatch. Allowed: ${allowedOrigin}` };
      }
      const allowedPrefixes = ["/api/auth/", "/api/metrics/"];
      if (!allowedPrefixes.some((prefix) => parsed.pathname.startsWith(prefix))) {
        return { success: false, error: "Only /api/auth/* and /api/metrics/* routes are allowed." };
      }

      const response = await fetch(url, {
        method,
        headers,
        body,
      });

      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      return {
        success: true,
        ok: response.ok,
        status: response.status,
        data,
        text,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle("kokoro:start-server", async (_event, payload) => {
    try {
      const requestedBaseUrl = String(payload?.baseUrl || "").trim() || "http://127.0.0.1:8880";
      let parsed;
      try {
        parsed = new URL(requestedBaseUrl);
      } catch {
        return { success: false, error: "Invalid Kokoro base URL." };
      }
      if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) {
        return { success: false, error: "Kokoro base URL must use localhost or 127.0.0.1." };
      }
      const targetPort = Number(parsed.port || (parsed.protocol === "https:" ? 443 : 80));
      if (!Number.isInteger(targetPort) || targetPort <= 0 || targetPort > 65535) {
        return { success: false, error: "Invalid Kokoro port." };
      }
      const normalizedBaseUrl = `${parsed.protocol}//${parsed.hostname}:${targetPort}`;

      const forceRecreate = Boolean(payload?.forceRecreate);
      // Fast path: if Kokoro is already running and healthy, do not touch Docker.
      const alreadyHealthy = await checkKokoroHealth(normalizedBaseUrl, 4500);
      const existing = await inspectKokoroContainer();
      const gpuSupport = await detectKokoroGpuSupport();
      const gpuImageLocal = gpuSupport.supportsGpu ? await dockerImageExistsLocally(KOKORO_DOCKER_IMAGE_GPU) : false;
      const shouldUpgradeCpuContainer =
        existing.exists &&
        existing.mode === "cpu" &&
        gpuSupport.supportsGpu &&
        gpuImageLocal;
      if (alreadyHealthy && !forceRecreate && !shouldUpgradeCpuContainer) {
        kokoroManagedByApp = false;
        kokoroWarmingStartedAt = 0;
        return {
          success: true,
          baseUrl: normalizedBaseUrl,
          container: KOKORO_CONTAINER_NAME,
          image: existing.image || "already-running",
          mode: existing.mode || "existing",
          gpuDetected: false,
          gpuReason: existing.exists ? "existing healthy container detected" : "existing healthy service detected",
        };
      }

      if (alreadyHealthy && shouldUpgradeCpuContainer) {
        logLine("[kokoro:auto] existing Kokoro CPU container detected while GPU is available; recreating for GPU");
      }

      const dockerVersion = await runCommand("docker", ["--version"], { timeoutMs: 15000 });
      if (!dockerVersion.ok) {
        return { success: false, error: "Docker is not available. Install/start Docker Desktop first." };
      }
      const dockerInfo = await runCommand("docker", ["info"], { timeoutMs: 20000 });
      if (!dockerInfo.ok) {
        const daemonHint = parseDockerDaemonError(`${dockerInfo.stderr || ""}\n${dockerInfo.stdout || ""}`);
        return {
          success: false,
          error: daemonHint || "Docker daemon is not reachable. Start Docker Desktop and retry.",
        };
      }

      await runCommand("docker", ["rm", "-f", KOKORO_CONTAINER_NAME], { timeoutMs: 30000 });

      const hasCustomImage = Boolean(KOKORO_DOCKER_IMAGE.trim());
      const candidates = [];
      if (hasCustomImage) {
        candidates.push({
          mode: "custom",
          image: KOKORO_DOCKER_IMAGE.trim(),
          extraArgs: KOKORO_FORCE_GPU ? ["--gpus", "all"] : [],
          runTimeoutMs: 120000,
          healthTimeoutMs: 45000,
        });
      } else if (gpuSupport.supportsGpu) {
        if (gpuImageLocal) {
          candidates.push({
            mode: "gpu",
            image: KOKORO_DOCKER_IMAGE_GPU,
            extraArgs: ["--gpus", "all"],
            runTimeoutMs: 45000,
            healthTimeoutMs: 30000,
          });
          candidates.push({
            mode: "cpu-fallback",
            image: KOKORO_DOCKER_IMAGE_CPU,
            extraArgs: [],
            runTimeoutMs: 120000,
            healthTimeoutMs: 150000,
          });
        } else {
          candidates.push({
            mode: "cpu-first",
            image: KOKORO_DOCKER_IMAGE_CPU,
            extraArgs: [],
            runTimeoutMs: 120000,
            healthTimeoutMs: 150000,
          });
        }
      } else {
        candidates.push({
          mode: "cpu",
          image: KOKORO_DOCKER_IMAGE_CPU,
          extraArgs: [],
          runTimeoutMs: 120000,
          healthTimeoutMs: 150000,
        });
      }

      const failures = [];
      for (const candidate of candidates) {
      const runResult = await runCommand("docker", [
          "run",
          "-d",
          "--name",
          KOKORO_CONTAINER_NAME,
          "-p",
          `127.0.0.1:${targetPort}:8880`,
          ...candidate.extraArgs,
          candidate.image,
        ], { timeoutMs: Number(candidate.runTimeoutMs || 180000) });

        if (!runResult.ok) {
          failures.push(`${candidate.mode}: ${(runResult.stderr || runResult.stdout || "unknown docker error").trim()}`);
          kokoroWarmingStartedAt = 0;
          await runCommand("docker", ["rm", "-f", KOKORO_CONTAINER_NAME], { timeoutMs: 30000 });
          continue;
        }

        kokoroWarmingStartedAt = Date.now();
        const becameHealthy = await checkKokoroHealth(normalizedBaseUrl, Number(candidate.healthTimeoutMs || 45000));
        if (!becameHealthy) {
          failures.push(`${candidate.mode}: container started but /health did not become ready in time`);
          kokoroWarmingStartedAt = 0;
          await runCommand("docker", ["rm", "-f", KOKORO_CONTAINER_NAME], { timeoutMs: 30000 });
          continue;
        }

        kokoroManagedByApp = true;
        kokoroWarmingStartedAt = 0;
        return {
          success: true,
          baseUrl: normalizedBaseUrl,
          container: KOKORO_CONTAINER_NAME,
          image: candidate.image,
          mode: candidate.mode,
          gpuDetected: gpuSupport.supportsGpu,
          gpuReason: gpuSupport.reason,
        };
      }

      return {
        success: false,
        error: failures[0] || "Failed to start Kokoro Docker container.",
        details: failures.slice(0, 2),
        gpuDetected: gpuSupport.supportsGpu,
        gpuReason: gpuSupport.reason,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle("kokoro:status", async (_event, payload) => {
    try {
      return await getKokoroStatus(String(payload?.baseUrl || "").trim() || KOKORO_AUTO_START_BASE_URL);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle("kokoro:stop-server", async () => {
    try {
      return await stopKokoroServer();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle("xtts:install", async () => {
    try {
      return await installXttsDependencies();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle("xtts:start-server", async (_event, payload) => {
    try {
      const startResult = await startManagedXttsServer({
        baseUrl: String(payload?.baseUrl || "").trim() || XTTS_AUTO_START_BASE_URL,
        startCommand: String(payload?.startCommand || "").trim() || XTTS_START_COMMAND,
        healthTimeoutMs: XTTS_INITIAL_HEALTH_TIMEOUT_MS,
        forceRecreate: Boolean(payload?.forceRecreate),
      });
      if (!startResult.success && !startResult.running) {
        return {
          success: false,
          error: startResult.error || "Failed to start XTTS server.",
          baseUrl: startResult.baseUrl || XTTS_AUTO_START_BASE_URL,
        };
      }
      if (!startResult.success && startResult.running) {
        void waitForXttsHealthyInBackground(String(startResult.baseUrl || XTTS_AUTO_START_BASE_URL), XTTS_HEALTH_TIMEOUT_MS);
      }
      return {
        success: true,
        running: true,
        healthy: Boolean(startResult.healthy),
        warming: !startResult.healthy,
        managed: Boolean(startResult.managed),
        pid: startResult.pid || null,
        baseUrl: String(startResult.baseUrl || XTTS_AUTO_START_BASE_URL),
        backend: String(startResult.backend || ""),
        error: startResult.healthy ? "" : String(startResult.error || ""),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle("xtts:status", async (_event, payload) => {
    try {
      return await getXttsStatus(String(payload?.baseUrl || "").trim() || XTTS_AUTO_START_BASE_URL);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle("xtts:stop-server", async () => {
    try {
      return await stopXttsServer();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle("stt:start-server", async (_event, payload) => {
    try {
      const startResult = await startManagedSttServer({
        baseUrl: String(payload?.baseUrl || "").trim() || STT_AUTO_START_BASE_URL,
        startCommand: String(payload?.startCommand || "").trim() || STT_START_COMMAND,
        healthTimeoutMs: STT_HEALTH_TIMEOUT_MS,
        initialHealthTimeoutMs: STT_INITIAL_HEALTH_TIMEOUT_MS,
      });
      if (!startResult.success && !startResult.running) {
        return {
          success: false,
          error: startResult.error || "Failed to start local STT server.",
          baseUrl: startResult.baseUrl || STT_AUTO_START_BASE_URL,
        };
      }
      if (!startResult.success && startResult.running) {
        void waitForSttHealthyInBackground(String(startResult.baseUrl || STT_AUTO_START_BASE_URL), STT_HEALTH_TIMEOUT_MS);
      }
      return {
        success: true,
        running: true,
        healthy: Boolean(startResult.healthy),
        warming: !startResult.healthy,
        managed: Boolean(startResult.managed),
        pid: startResult.pid || null,
        baseUrl: String(startResult.baseUrl || STT_AUTO_START_BASE_URL),
        error: startResult.healthy ? "" : String(startResult.error || ""),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle("stt:status", async (_event, payload) => {
    try {
      return await getSttStatus(String(payload?.baseUrl || "").trim() || STT_AUTO_START_BASE_URL);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle("stt:stop-server", async () => {
    try {
      return await stopSttServer();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle("desktop:environment-status", async (_event, payload) => {
    try {
      return await getDesktopEnvironmentStatus(payload || {});
    } catch (error) {
      return {
        platform: process.platform,
        isPackaged: app.isPackaged,
        userDataPath: app.getPath("userData"),
        logFilePath,
        docker: { healthy: false, installed: false, running: false, error: error instanceof Error ? error.message : String(error) },
        ollama: { healthy: false, installed: false, running: false, error: error instanceof Error ? error.message : String(error), models: [] },
        kokoro: { healthy: false, running: false, error: error instanceof Error ? error.message : String(error) },
        xtts: { healthy: false, running: false, error: error instanceof Error ? error.message : String(error) },
        stt: { healthy: false, running: false, error: error instanceof Error ? error.message : String(error) },
      };
    }
  });

  ipcMain.handle("desktop:start-docker", async (_event, payload) => {
    try {
      return await startDockerDesktop(payload || {});
    } catch (error) {
      return {
        success: false,
        started: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle("desktop:open-path", async (_event, payload) => {
    try {
      const targetPath = String(payload?.path || "").trim();
      if (!targetPath) return { success: false, error: "Path is required." };
      const error = await shell.openPath(targetPath);
      return { success: !error, error };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle("desktop:browse-file", async (_event, payload) => {
    try {
      const targetWindow = BrowserWindow.getFocusedWindow() || mainWindow || undefined;
      const target = String(payload?.target || "").trim();
      const result = await dialog.showOpenDialog(targetWindow, {
        title: String(payload?.title || "Select file"),
        properties: ["openFile"],
        filters: Array.isArray(payload?.filters) ? payload.filters : undefined,
      });
      if (result.canceled || !Array.isArray(result.filePaths) || !result.filePaths[0]) {
        return { success: false, canceled: true };
      }
      const selectedPath = String(result.filePaths[0]);
      if (target === "xtts-sample") {
        const xttsSpeakerHostDir = getXttsSpeakerHostDir();
        const extension = path.extname(selectedPath) || ".wav";
        const baseName = path.basename(selectedPath, extension).replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "xtts-sample";
        const destinationPath = path.join(xttsSpeakerHostDir, `${baseName}${extension.toLowerCase()}`);
        if (path.resolve(selectedPath) !== path.resolve(destinationPath)) {
          fs.copyFileSync(selectedPath, destinationPath);
        }
        return {
          success: true,
          canceled: false,
          filePath: destinationPath,
          xttsSpeakerPath: toXttsContainerSpeakerPath(destinationPath),
        };
      }
      return {
        success: true,
        canceled: false,
        filePath: selectedPath,
      };
    } catch (error) {
      return {
        success: false,
        canceled: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle("desktop:save-audio-file", async (_event, payload) => {
    try {
      const base64 = String(payload?.base64 || "").trim();
      const defaultFileName = String(payload?.defaultFileName || "xtts-voice-sample.webm").trim() || "xtts-voice-sample.webm";
      const target = String(payload?.target || "").trim();
      const filters = Array.isArray(payload?.filters) ? payload.filters : [
        { name: "Audio", extensions: ["wav", "mp3", "webm", "m4a", "ogg"] },
      ];
      if (!base64) return { success: false, error: "Audio data is required." };
      const targetWindow = BrowserWindow.getFocusedWindow() || mainWindow || undefined;
      const xttsSpeakerHostDir = target === "xtts-sample" ? getXttsSpeakerHostDir() : null;
      const result = await dialog.showSaveDialog(targetWindow, {
        title: "Save XTTS voice sample",
        defaultPath: path.join(xttsSpeakerHostDir || app.getPath("documents"), defaultFileName),
        filters,
      });
      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true, error: "Save cancelled." };
      }
      fs.writeFileSync(result.filePath, Buffer.from(base64, "base64"));
      return {
        success: true,
        filePath: result.filePath,
        xttsSpeakerPath: target === "xtts-sample" ? toXttsContainerSpeakerPath(result.filePath) : "",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
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
    title: APP_DISPLAY_NAME,
    icon: resolvedIcon,
    backgroundColor: "#020617",
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
    mainWindow?.setTitle(APP_DISPLAY_NAME);
    logLine(`did-finish-load url=${mainWindow?.webContents.getURL() || ""}`);
  });

  try {
    const splashPath = path.join(__dirname, "splash.html");
    if (fs.existsSync(splashPath)) {
      logLine(`Loading splash screen: ${splashPath}`);
      await mainWindow.loadFile(splashPath);
    } else {
      logLine(`Splash screen not found: ${splashPath}`);
    }

    let startUrl = DEV_URL;
    if (!isDev) {
      if (PROD_URL && FORCE_REMOTE) {
        startUrl = PROD_URL;
        logLine(`Using forced remote URL: ${startUrl}`);
      } else {
        startUrl = await startBundledServer();
      }
    }
    logLine(`Loading URL: ${startUrl}`);
    await mainWindow.loadURL(startUrl);
    void autoStartKokoroInBackground();
    void autoStartXttsInBackground();
    void autoStartSttInBackground();
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logLine(`Initial load failed: ${errMsg}`);
    // Chromium -3 (ERR_ABORTED) can happen during hot reload/navigation and is usually recoverable.
    if (/ERR_ABORTED|-3/i.test(errMsg)) {
      try {
        const fallbackUrl = isDev ? DEV_URL : PROD_URL;
        if (fallbackUrl) {
          logLine(`Retrying load after ERR_ABORTED: ${fallbackUrl}`);
          await new Promise((resolve) => setTimeout(resolve, 600));
          await mainWindow.loadURL(fallbackUrl);
          void autoStartKokoroInBackground();
          void autoStartXttsInBackground();
          void autoStartSttInBackground();
          return;
        }
      } catch (retryError) {
        logLine(`Retry after ERR_ABORTED failed: ${retryError instanceof Error ? retryError.message : String(retryError)}`);
      }
      if (isDev) return;
    }
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

function cleanupManagedServicesSync() {
  if (shutdownCleanupStarted) return;
  shutdownCleanupStarted = true;

  if (localServerProcess && !localServerProcess.killed) {
    try {
      localServerProcess.kill();
    } catch {
      // ignore
    }
    localServerProcess = null;
  }

  if (sttServerProcess && !sttServerProcess.killed) {
    try {
      sttServerProcess.kill();
    } catch {
      // ignore
    }
    sttServerProcess = null;
  }

  if (xttsServerProcess && !xttsServerProcess.killed) {
    try {
      xttsServerProcess.kill();
    } catch {
      // ignore
    }
    xttsServerProcess = null;
  }
  xttsDockerManagedByApp = false;

  runCommandSync("docker", ["rm", "-f", STT_DOCKER_CONTAINER_NAME], { timeout: 30000 });
  sttDockerManagedByApp = false;
  sttWarmingStartedAt = 0;

  runCommandSync("docker", ["rm", "-f", KOKORO_CONTAINER_NAME], { timeout: 30000 });
  kokoroManagedByApp = false;
  kokoroWarmingStartedAt = 0;
  runCommandSync("docker", ["rm", "-f", XTTS_DOCKER_CONTAINER_NAME], { timeout: 30000 });
  xttsWarmingStartedAt = 0;
}

app.whenReady().then(() => {
  app.setName(APP_DISPLAY_NAME);
  app.setAppUserModelId("com.studio.desktop");
  logFilePath = path.join(app.getPath("userData"), "desktop.log");
  logLine(`App starting. isDev=${isDev} userData=${app.getPath("userData")}`);
  registerSecureAuthIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  cleanupManagedServicesSync();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  cleanupManagedServicesSync();
});
