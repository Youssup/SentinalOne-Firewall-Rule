const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile("index.html");
};

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// 
ipcMain.handle("open-file", async () => {
  // Open file window
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Open Firewall Rule",
    filters: [{ name: "JSON Files", extensions: ["json"] }],
    properties: ["openFile"],
  });

  //If the file was closed or no file selected send cancelled status back to renderer.js
  if (canceled || filePaths.length === 0) {
    return { status: "cancelled" };
  }

  // Get the first file path
  const filePath = filePaths[0];
  try {
    // Read the file and send it back to renderer.js
    const content = fs.readFileSync(filePath, "utf-8");
    return { status: "success", content: content, path: filePath };
  } catch (err) {
    return { status: "error", message: err.message };
  }
});
