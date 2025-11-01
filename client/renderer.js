// Setting DOM Elements
const entryInput = document.getElementById("entry-input");
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
    remote_hosts: [
      { type: "addresses", values: ["191.168.1.1"] },
      { type: "cidr", values: ["187.204.0.0/21"] },
    ],
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
 * Handles adding entries from the input to the JSON.
 */
function handleAddEntries() {
  // Get the entries from the input, split by new lines, and trim whitespace, filter out empty lines and invalid entries
  const entriesToAdd = entryInput.value
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .filter((entry) => ValidateIPaddress(entry) || ValidateCIDR(entry));

  // If there are no IPs to add, show an error and end the function
  if (entriesToAdd.length === 0) {
    showStatus("Input is empty.", true);
    return;
  }

  try {
    // parse the current JSON output
    const currentRules = JSON.parse(jsonOutput.value);

    let CIDRaddedCount = 0;
    let IPaddedCount = 0;
    for (rule of currentRules) {
      if (!rule.remote_hosts) {
        showStatus("Invalid JSON. Missing remote_hosts", true);
        return;
      }
      for (entry of entriesToAdd) {
        // If the entry is an IP address then add it as an address type
        if (ValidateIPaddress(entry)) {
          rule.remote_hosts.push({ type: "addresses", values: [entry] });
          IPaddedCount++;
        } else {
          rule.remote_hosts.push({ type: "cidr", values: [entry] });
          CIDRAddedCount++;
        }
      }
    }
    jsonOutput.value = JSON.stringify(currentRules, null, 2);
    let addedCount = (IPaddedCount + CIDRAddedCount)/currentRules.length;
    showStatus(
      `Added ${addedCount} entr${addedCount === 1 ? "y" : "ies"} to ${
        currentRules.length === 1 ? "the" : "each"
      } rule.`
    );
  } catch (error) {
    console.log("Failed to parse JSON output:", error);
    showStatus(error, true);
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

/**
 * Validates an IP
 * @param {string} ip - the IP address to validate
 * @returns {boolean} - Return true if valid, false if not
 */
function ValidateIPaddress(ip) {
  return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
    ip
  );
}

/**
 * Validates a CIDR range
 * @param {string} cidr - The CIDR range to validate
 * @returns {boolean} - Return true if valid, false if not
 */
function ValidateCIDR(cidr) {
  return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(3[0-2]|[12]?[0-9])$/.test(
    cidr
  );
}

// Initialize the JSON output to the default rule template on page load
document.addEventListener("DOMContentLoaded", initialize);

// Add IPs to JSON output
addIpButton.addEventListener("click", handleAddEntries);

// Load JSON from file
loadFileButton.addEventListener("click", handleLoadFile);

// Clear the IP input field
clearIpButton.addEventListener("click", () => {
  entryInput.value = "";
});
