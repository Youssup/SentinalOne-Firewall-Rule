const { contextBridge, ipcRenderer } = require("electron");

// Expose method to open file
contextBridge.exposeInMainWorld("api", {
  openFile: () => ipcRenderer.invoke("open-file"),
});