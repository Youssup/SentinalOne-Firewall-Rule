const { contextBridge, ipcRenderer } = require("electron");

// Expose method to open file
contextBridge.exposeInMainWorld("api", {
  openFile: () => ipcRenderer.invoke("open-file"),
  saveFile: (content) => ipcRenderer.invoke("save-file", content),
  pushToS1: (data) => ipcRenderer.invoke("push-to-sentinelOne", data),
});
