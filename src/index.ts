#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AdbService } from "./services/adb.js";
import { registerDeviceTools } from "./tools/device.js";
import { registerInputTools } from "./tools/input.js";
import { registerScreenTools } from "./tools/screen.js";
import { registerAppTools } from "./tools/app.js";
import { registerShellTools } from "./tools/shell.js";
import { registerFileTools } from "./tools/file.js";
import { registerUiTools } from "./tools/ui.js";

const server = new McpServer({
  name: "adb-mcp-server",
  version: "1.0.0",
});

const adb = new AdbService();

console.error(`adb-mcp-server starting (adb path: ${adb.path})`);

adb.checkDevice().then((connected) => {
  if (connected) {
    console.error("Device connected.");
  } else {
    console.error("WARNING: No Android device detected. Connect via USB and enable USB debugging.");
  }
});

registerDeviceTools(server, adb);
registerInputTools(server, adb);
registerScreenTools(server, adb);
registerAppTools(server, adb);
registerShellTools(server, adb);
registerFileTools(server, adb);
registerUiTools(server, adb);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("adb-mcp-server running via stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
