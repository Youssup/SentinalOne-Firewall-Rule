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

// Clear the IP input field
clearIpButton.addEventListener("click", () => {
  ipInput.value = "";
});