const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  openFile: () => ipcRenderer.invoke("open-file"),
  saveFile: (content) => ipcRenderer.invoke("save-file", content),
  pushToSentinelOne: (data) => ipcRenderer.invoke("push-to-sentinelOne", data),
  appendToSentinelOne: (data) =>
    ipcRenderer.invoke("append-to-sentinelOne", data),
});
