const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const axios = require("axios");
const path = require("node:path");
const fs = require("node:fs");
require('dotenv').config();

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
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

// Open file handler
ipcMain.handle("open-file", async () => {
  // Open file window
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Open Firewall Rule",
    filters: [{ name: "JSON Files", extensions: ["json"] }],
    properties: ["openFile"],
  });

  // If the file was closed or no file selected send cancelled status back to renderer.js
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

// Save file handler
ipcMain.handle("save-file", async (event, content) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "Save Firewall Rules",
    defaultPath: "sentinelone-rules.json",
    filters: [{ name: "JSON Files", extensions: ["json"] }],
  });

  if (canceled || !filePath) {
    return { status: "cancelled" };
  }

  try {
    fs.writeFileSync(filePath, content, "utf-8");
    return { status: "success", path: filePath };
  } catch (err) {
    return { status: "error", message: err.message };
  }
});

// Push to SentinelOne handler
ipcMain.handle(
  "push-to-sentinelOne",
  async (event, { consoleUrl, apiToken, rulesJson }) => {
    const sentinelOneClient = axios.create({
      baseURL: `https://${consoleUrl}/web/api/v2.1`,
      headers: {
        Authorization: `ApiToken ${apiToken}`,
        "Content-Type": "application/json",
      },
    });

    try {
      const rules = JSON.parse(rulesJson);
      let results = [];

      for (const rule of rules) {
        const payload = {
          data: rule,
          filter: { tenant: true },
        };

        const response = await sentinelOneClient.post(
          "/firewall-control",
          payload
        );
        results.push(response.data);
      }

      return { status: "success", count: results.length };
    } catch (err) {
      const errorMsg = err.response?.data?.errors?.[0]?.detail || err.message;
      return { status: "error", message: errorMsg };
    }
  }
);
