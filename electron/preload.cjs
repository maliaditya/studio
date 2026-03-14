const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("studioDesktop", {
  platform: process.platform,
  isDesktop: true,
  authBaseUrl: process.env.ELECTRON_AUTH_BASE_URL || "https://vdock.vercel.app",
  authTokenStore: {
    set: (username, refreshToken) => ipcRenderer.invoke("auth-token:set", { username, refreshToken }),
    get: (username) => ipcRenderer.invoke("auth-token:get", { username }),
    clear: (username) => ipcRenderer.invoke("auth-token:clear", { username }),
  },
  authHttp: {
    request: (payload) => ipcRenderer.invoke("auth-http:request", payload),
  },
  kokoro: {
    startServer: (payload) => ipcRenderer.invoke("kokoro:start-server", payload),
    stopServer: (payload) => ipcRenderer.invoke("kokoro:stop-server", payload),
    status: (payload) => ipcRenderer.invoke("kokoro:status", payload),
  },
  xtts: {
    install: (payload) => ipcRenderer.invoke("xtts:install", payload),
    startServer: (payload) => ipcRenderer.invoke("xtts:start-server", payload),
    stopServer: (payload) => ipcRenderer.invoke("xtts:stop-server", payload),
    status: (payload) => ipcRenderer.invoke("xtts:status", payload),
  },
  stt: {
    startServer: (payload) => ipcRenderer.invoke("stt:start-server", payload),
    stopServer: (payload) => ipcRenderer.invoke("stt:stop-server", payload),
    status: (payload) => ipcRenderer.invoke("stt:status", payload),
  },
  desktop: {
    environmentStatus: (payload) => ipcRenderer.invoke("desktop:environment-status", payload),
    startDocker: (payload) => ipcRenderer.invoke("desktop:start-docker", payload),
    openPath: (payload) => ipcRenderer.invoke("desktop:open-path", payload),
    browseFile: (payload) => ipcRenderer.invoke("desktop:browse-file", payload),
    saveAudioFile: (payload) => ipcRenderer.invoke("desktop:save-audio-file", payload),
  },
});
