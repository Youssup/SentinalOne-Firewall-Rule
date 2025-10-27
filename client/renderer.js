// Setting DOM Elements
const ipInput = document.getElementById("ip-input");
const jsonOutput = document.getElementById("json-output");
const addIpButton = document.getElementById("add-ip-button");
const clearIpButton = document.getElementById("clear-ip-button");
const loadFileButton = document.getElementById("load-file-button");
const downloadButton = document.getElementById("download-button");
const statusMessage = document.getElementById("status-message");

const defaultRuleTemplate = {
  data: {
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
  filter: {},
};

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

// Initialize the JSON output to the default rule template on page load
document.addEventListener("DOMContentLoaded", initialize);

// Clear the IP input field
clearIpButton.addEventListener("click", () => {
  ipInput.value = "";
});