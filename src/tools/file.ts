import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AdbService } from "../services/adb.js";

export function registerFileTools(server: McpServer, adb: AdbService) {
  server.registerTool(
    "adb_pull",
    {
      title: "Pull File from Device",
      description: `Copy a file from device to local computer.`,
      inputSchema: z.object({
        remote_path: z.string().min(1).describe("Path on device (e.g., '/sdcard/Download/file.txt')"),
        local_dir: z.string().optional().describe("Local directory to save the file (default: current directory '.')"),
      }).strict(),
      annotations: {
        readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const localDir = params.local_dir ?? ".";
        const stdout = await adb.exec(["pull", params.remote_path, localDir]);
        return { content: [{ type: "text", text: stdout.trim() || `File pulled from '${params.remote_path}' to '${localDir}'` }] };
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}

function errorResult(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }] };
}
