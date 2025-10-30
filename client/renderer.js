// Setting DOM Elements
const ipInput = document.getElementById("ip-input");
const jsonOutput = document.getElementById("json-output");
const addIpButton = document.getElementById("add-ip-button");
const clearIpButton = document.getElementById("clear-ip-button");
const loadFileButton = document.getElementById("load-file-button");
const downloadButton = document.getElementById("download-button");
const statusMessage = document.getElementById("status-message");

const defaultRuleTemplate = [
  {
    name: "Blocking Rule Example",
    action: "Block",
    direction: "inbound",
    protocol: "UDP",
    status: "Enabled",
    os_types: ["osx", "linux", "windows"],
    remote_hosts: [{ type: "addresses", values: ["191.168.1.1"] }],
    remote_port: [],
    local_port: [],
    application: [],
    service: null,
  },
];

/**
 * Sets the JSON output area to the default rule template
 */
function initialize() {
  jsonOutput.value = JSON.stringify(defaultRuleTemplate, null, 2);
}

/**
 * Displays a status message for 3 seconds because Electron doesn't show logs
 * @param {string} message - The message to display
 * @param {boolean} [isError=false] - Whether the message is an error defaulted to false
 */
function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  // If the message is an error, set text color to red, else green
  statusMessage.className = isError
    ? "h-6 text-center text-red-600 transition-opacity duration-300"
    : "h-6 text-center text-green-600 transition-opacity duration-300";

  setTimeout(() => {
    statusMessage.textContent = "";
  }, 3000);
}

/**
 * Handles adding IPs from the input to the JSON.
 */
function handleAddIps() {
  // Get the IPs from the input, split by new lines, and trim whitespace, filter out empty lines
  const ipsToAdd = ipInput.value
    .split("\n")
    .map((ip) => ip.trim())
    .filter((ip) => ip.length > 0);

  // If there are no IPs to add, show an error and end the function
  if (ipsToAdd.length === 0) {
    showStatus("Input is empty.", true);
    return;
  }

  try {
    const currentRules = JSON.parse(jsonOutput.value)[0];

    // CurrentRules should have remoteHosts for inputting ips if it doesnt, show an error and end the function
    if (!currentRules.remote_hosts) {
      showStatus("Invalid JSON. Missing remote_hosts", true);
      return;
    }

    // Find the object with type "addresses"
    let targetHostObject = currentRules.remote_hosts.find(
      (h) => h.type === "addresses"
    );

    // If no "addresses" object exists, create one
    if (!targetHostObject) {
      targetHostObject = { type: "addresses", values: [] };
      currentRules.remote_hosts.push(targetHostObject);
    }

    // Make sure its 'values' property is an array
    if (!Array.isArray(targetHostObject.values)) {
      targetHostObject.values = [];
    }

    // Add new IPs NO duplicates
    const existingIps = new Set(targetHostObject.values);
    let addedCount = 0;
    ipsToAdd.forEach((ip) => {
      // Only add if it does not already exist
      if (!existingIps.has(ip)) {
        existingIps.add(ip);
        addedCount++;
      }
    });

    // Sort the IPs
    targetHostObject.values = Array.from(existingIps).sort();
    // Update the JSON output area
    jsonOutput.value = JSON.stringify(currentRules, null, 2);
    showStatus(
      `Added ${addedCount} new entr${addedCount === 1 ? "y" : "ies"}. Total: ${
        targetHostObject.values.length
      }.`
    );
  } catch (error) {
    showStatus("Invalid JSON in the output area.", true);
    console.error("JSON parsing error:", error);
  }
}

/**
 * Handles loading a JSON file.
 */
async function handleLoadFile() {
  // Call the "openFile" function from preload.js
  const result = await window.api.openFile();

  if (result.status === "success") {
    try {
      // Parse and set it as a JSON and load it into the JSON output
      const parsed = JSON.parse(result.content);
      jsonOutput.value = JSON.stringify(parsed, null, 2);
      showStatus(`File loaded successfully!`);
    } catch (error) {
      showStatus(`Failed to parse file. Is it a valid JSON?`, true);
    }
  } else if (result.status === "error") {
    showStatus(`Error opening file: ${result.message}`, true);
  } else if (result.status === "cancelled") {
    showStatus("Open cancelled.", true);
  }
}

// Initialize the JSON output to the default rule template on page load
document.addEventListener("DOMContentLoaded", initialize);

// Add IPs to JSON output
addIpButton.addEventListener("click", handleAddIps);

// Load JSON from file
loadFileButton.addEventListener("click", handleLoadFile);

// Clear the IP input field
clearIpButton.addEventListener("click", () => {
  ipInput.value = "";
});
