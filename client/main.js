const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const axios = require("axios");
const path = require("node:path");
const fs = require("node:fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });

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
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Open Firewall Rule",
    filters: [{ name: "JSON Files", extensions: ["json"] }],
    properties: ["openFile"],
  });

  if (canceled || filePaths.length === 0) {
    return { status: "cancelled" };
  }

  const filePath = filePaths[0];
  try {
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

// Append to Global Blocklist
ipcMain.handle("append-to-sentinelOne", async (event, { ipsToAdd }) => {
  const consoleUrl = process.env.CONSOLE_URL;
  const apiToken = process.env.API_KEY;

  if (!consoleUrl || !apiToken) {
    return {
      status: "error",
      message: "Missing CONSOLE_URL or API_KEY in .env",
    };
  }

  const s1 = axios.create({
    baseURL: `${consoleUrl}/web/api/v2.1`,
    headers: {
      Authorization: `ApiToken ${apiToken}`,
      "Content-Type": "application/json",
    },
  });

  const ruleName = "SentinelOne Firewall Rule Manager";

  try {
    // Search for the existing master blocklist
    const getRes = await s1.get(`/firewall-control`, {
      params: { name: ruleName, tenant: true },
    });

    const existingRules = getRes.data.data;

    if (existingRules && existingRules.length > 0) {
      // Rule exists so update it
      const rule = existingRules[0];
      const ruleId = rule.id;

      // Handle both camelCase and snake_case just in case SentinelOne returns old format
      const existingHosts = rule.remoteHosts || rule.remote_hosts || [];
      const existingValues = new Set(existingHosts.flatMap((h) => h.values));
      let addedCount = 0;

      ipsToAdd.forEach((ip) => {
        if (!existingValues.has(ip.value)) {
          existingHosts.push({ type: ip.type, values: [ip.value] });
          existingValues.add(ip.value);
          addedCount++;
        }
      });

      if (addedCount === 0) {
        return {
          status: "success",
          count: 0,
          message: "All IPs are already blocked.",
        };
      }

      // Assign to the correct camelCase key
      rule.remoteHosts = existingHosts;
      delete rule.remote_hosts; // Clean up old key if it existed

      // Push updated rule
      await s1.put(`/firewall-control/${ruleId}`, {
        data: rule,
        filter: { tenant: true },
      });

      return { status: "success", count: addedCount, action: "updated" };
    } else {
      const newRule = {
        name: ruleName,
        action: "Block",
        direction: "inbound",
        status: "Enabled",
        osTypes: ["linux", "macos", "windows"],
        remoteHosts: ipsToAdd.map((ip) => ({
          type: ip.type,
          values: [ip.value],
        })),
      };

      await s1.post("/firewall-control", {
        data: newRule,
        filter: { tenant: true },
      });

      return { status: "success", count: ipsToAdd.length, action: "created" };
    }
  } catch (err) {
    const errorMsg = err.response?.data?.errors?.[0]?.detail || err.message;
    return { status: "error", message: errorMsg };
  }
});
