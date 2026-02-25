// Setting DOM Elements
const toggleViewBtn = document.getElementById("toggle-view-button");
const simpleView = document.getElementById("simple-view");
const advancedView = document.getElementById("advanced-view");
const viewDescription = document.getElementById("view-description");
const simpleEntryInput = document.getElementById("simple-entry-input");
const simplePushButton = document.getElementById("simple-push-button");
const entryInput = document.getElementById("entry-input");
const jsonOutput = document.getElementById("json-output");
const addIpButton = document.getElementById("add-ip-button");
const clearIpButton = document.getElementById("clear-ip-button");
const loadFileButton = document.getElementById("load-file-button");
const downloadButton = document.getElementById("download-button");
const pushSentinelOneButton = document.getElementById(
  "push-sentinel-one-button",
);
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
      { type: "addresses", values: ["0.0.0.0"] },
      { type: "cidr", values: ["0.0.0.0/0"] },
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

  const baseClasses =
    "absolute bottom-2 left-0 right-0 h-6 text-center text-sm font-semibold transition-opacity duration-300 pointer-events-none";

  // If the message is an error, set text color to red, else green
  const colorClass = isError ? "text-red-600" : "text-green-600";

  // Make visible
  statusMessage.className = `${baseClasses} ${colorClass} opacity-100`;

  // Fade out
  setTimeout(() => {
    statusMessage.className = `${baseClasses} ${colorClass} opacity-0`;
  }, 3000);
}

/**
 * Toggles the UI between Simple and Advanced Mode
 */
function handleViewToggle() {
  const isSimpleActive = !simpleView.classList.contains("hidden");

  if (isSimpleActive) {
    simpleView.classList.add("hidden");
    advancedView.classList.remove("hidden");
    toggleViewBtn.textContent = "Switch to Simple Mode";
    viewDescription.textContent =
      "Construct and edit full JSON payload rules";
  } else {
    simpleView.classList.remove("hidden");
    advancedView.classList.add("hidden");
    toggleViewBtn.textContent = "Switch to Advanced Mode";
    viewDescription.textContent =
      "Enter IPs/CIDRs to block globally";
  }
}

/**
 * Parses input and appends it to the global blocklist
 */
async function handleSimplePush() {
  if (simpleEntryInput.value.trim() === "") {
    showStatus("No entries provided.", true);
    return;
  }

  const validEntries = simpleEntryInput.value
    .split("\n")
    .map((e) => e.trim())
    .filter((e) => e.length > 0)
    .filter((e) => ValidateIPaddress(e) || ValidateCIDR(e));

  if (validEntries.length === 0) {
    showStatus("No valid IPs or CIDRs detected.", true);
    return;
  }

  // Format the data structure for the api
  const ipsToAdd = validEntries.map((entry) => ({
    type: ValidateIPaddress(entry) ? "addresses" : "cidr",
    value: entry,
  }));

  showStatus("Appending to Global Blocklist...");

  const result = await window.api.appendToSentinelOne({ ipsToAdd });

  if (result.status === "success") {
    if (result.count === 0) {
      showStatus("All entries were already in the blocklist.");
    } else {
      showStatus(`Success! Added ${result.count} new items to the blocklist.`);
    }
    simpleEntryInput.value = "";
  } else {
    showStatus(`SentinelOne Error: ${result.message}`, true);
  }
}

/**
 * Handles adding entries from the input to the JSON
 */
function handleAddEntries() {
  if (entryInput.value.trim() === "") {
    showStatus("No entries to add.", true);
    return;
  }

  const entriesToAdd = entryInput.value
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .filter((entry) => ValidateIPaddress(entry) || ValidateCIDR(entry));

  if (entriesToAdd.length === 0) {
    showStatus("No valid entries.", true);
    return;
  }

  try {
    const currentRules = JSON.parse(jsonOutput.value);
    let duplicates = "";
    let CIDRaddedCount = 0;
    let IPaddedCount = 0;

    for (const rule of currentRules) {
      if (!rule.remote_hosts) {
        showStatus("Invalid JSON. Missing remote_hosts", true);
        return;
      }

      const existingIps = new Set(
        rule.remote_hosts.flatMap((entry) => entry.values),
      );

      for (const entry of entriesToAdd) {
        if (!existingIps.has(entry)) {
          if (ValidateIPaddress(entry)) {
            rule.remote_hosts.push({ type: "addresses", values: [entry] });
            IPaddedCount++;
          } else {
            rule.remote_hosts.push({ type: "cidr", values: [entry] });
            CIDRaddedCount++;
          }
        } else {
          duplicates += `${entry} `;
        }
      }
    }

    jsonOutput.value = JSON.stringify(currentRules, null, 2);
    let addedCount = (IPaddedCount + CIDRaddedCount) / currentRules.length;

    if (addedCount === 0) {
      showStatus(`No new entries added. All entries are duplicates.`, true);
      return;
    }

    showStatus(
      `Added ${addedCount} entr${addedCount === 1 ? "y" : "ies"} to ${
        currentRules.length === 1 ? "the" : "each"
      } rule. ${duplicates ? `Duplicates ignored: ${duplicates}` : ""}`,
    );
  } catch (error) {
    console.log("Failed to parse JSON output:", error);
    showStatus(error.message, true);
  }
}

/**
 * Handles loading a JSON file
 */
async function handleLoadFile() {
  const result = await window.api.openFile();

  if (result.status === "success") {
    try {
      const parsed = JSON.parse(result.content);
      jsonOutput.value = JSON.stringify(parsed, null, 2);
      showStatus(`File loaded successfully!`);
    } catch (error) {
      showStatus(`Failed to parse file. Is it a valid JSON?`, true);
    }
  } else if (result.status === "error") {
    showStatus(`Error opening file: ${result.message}`, true);
  }
}

/**
 * Handles downloading the current JSON content to a file
 */
async function handleDownload() {
  const content = jsonOutput.value;

  try {
    JSON.parse(content);
  } catch (e) {
    showStatus("Cannot save: Invalid JSON.", true);
    return;
  }

  const result = await window.api.saveFile(content);

  if (result.status === "success") {
    showStatus("File saved successfully!");
  } else if (result.status === "error") {
    showStatus(`Error saving file: ${result.message}`, true);
  }
}

/**
 * Submits the JSON payload to SentinelOne
 */
async function handlePushToSentinelOne() {
  const content = jsonOutput.value;
  showStatus("Pushing to SentinelOne...");

  const result = await window.api.pushToSentinelOne({
    rulesJson: content,
  });

  if (result.status === "success") {
    showStatus(`Successfully pushed ${result.count} rules to SentinelOne!`);
  } else {
    showStatus(`SentinelOne Error: ${result.message}`, true);
  }
}

/**
 * Validates an IP
 * @param {string} ip - the IP address to validate
 * @returns {boolean} - Return true if valid, false if not
 */
function ValidateIPaddress(ip) {
  return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
    ip,
  );
}

/**
 * Validates a CIDR range
 * @param {string} cidr - The CIDR range to validate
 * @returns {boolean} - Return true if valid, false if not
 */
function ValidateCIDR(cidr) {
  return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(3[0-2]|[12]?[0-9])$/.test(
    cidr,
  );
}
// Initialize the JSON output to the default rule template on page load
document.addEventListener("DOMContentLoaded", initialize);

toggleViewBtn.addEventListener("click", handleViewToggle);
simplePushButton.addEventListener("click", handleSimplePush);
addIpButton.addEventListener("click", handleAddEntries);
loadFileButton.addEventListener("click", handleLoadFile);
downloadButton.addEventListener("click", handleDownload);
clearIpButton.addEventListener("click", () => {
  entryInput.value = "";
});
pushSentinelOneButton.addEventListener("click", handlePushToSentinelOne);
