import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AdbService } from "../services/adb.js";
import { SCREENSHOT_DIR } from "../constants.js";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

export function registerScreenTools(server: McpServer, adb: AdbService) {
  server.registerTool(
    "adb_screenshot",
    {
      title: "Take Screenshot",
      description: `Take screenshot, returns file path or base64.`,
      inputSchema: z.object({
        filename: z.string().optional().describe("Custom filename (without extension, default: timestamp)"),
        response_format: z.enum(["path", "base64"]).default("path").describe("Output format: path or base64"),
      }).strict(),
      annotations: {
        readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true,
      },
    },
    async (params) => {
      try {
        mkdirSync(SCREENSHOT_DIR, { recursive: true });

        const filename = params.filename ?? `screenshot_${Date.now()}`;
        const remotePath = `/sdcard/${filename}.png`;
        const localPath = join(SCREENSHOT_DIR, `${filename}.png`);

        await adb.shell(`screencap -p ${remotePath}`);
        const stdout = await adb.exec(["pull", remotePath, localPath]);
        await adb.shell(`rm -f ${remotePath}`);

        if (params.response_format === "base64") {
          const { readFileSync } = await import("node:fs");
          const data = readFileSync(localPath).toString("base64");
          return {
            content: [{ type: "text", text: `data:image/png;base64,${data}` }],
          };
        }

        return {
          content: [{ type: "text", text: `Screenshot saved to: ${localPath}\n\n${stdout.trim()}` }],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "adb_screen_size",
    {
      title: "Get Screen Size",
      description: `Get screen resolution in pixels.`,
      inputSchema: z.object({}).strict(),
      annotations: {
        readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true,
      },
    },
    async () => {
      try {
        const raw = await adb.shell("wm size");
        const match = raw.match(/(\d+)x(\d+)/);
        if (!match) return { content: [{ type: "text", text: `Could not detect screen size. Raw output: ${raw.trim()}` }] };
        return {
          content: [{ type: "text", text: `**Screen Size**: ${match[1]} x ${match[2]} pixels` }],
        };
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
