const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("studioDesktop", {
  platform: process.platform,
  isDesktop: true,
});
