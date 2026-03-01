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
});
