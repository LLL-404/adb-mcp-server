import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AdbService } from "../services/adb.js";
import { ADB_TIMEOUT, TERMUX_TIMEOUT } from "../constants.js";

export function registerShellTools(server: McpServer, adb: AdbService) {
  server.registerTool(
    "adb_shell",
    {
      title: "Execute Android Shell Command",
      description: `Execute an Android shell command. ⚠️ Requires confirm=true.`,
      inputSchema: z.object({
        command: z.string().min(1, "Command is required").max(1000, "Command too long").describe("Shell command to execute"),
        confirm: z.boolean().refine((v) => v === true, { message: "You must set confirm=true to execute shell commands" }).describe("Confirmation flag - must be true"),
        timeout: z.number().int().min(1).max(120).default(30).describe("Timeout in seconds"),
      }).strict(),
      annotations: {
        readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const { stdout, stderr, code } = await adb.shellSafe(params.command, (params.timeout ?? 30) * 1000);
        if (code !== 0 && code !== null) {
          return { content: [{ type: "text", text: `Command exited with code ${code}:\n${stderr || stdout || "(no output)"}` }] };
        }
        const output = stdout || "(no output)";
        const truncated = output.length > 10000 ? output.slice(0, 10000) + `\n... (truncated, ${output.length} total chars)` : output;
        return { content: [{ type: "text", text: truncated }] };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "adb_termux_exec",
    {
      title: "Execute Command in Termux",
      description: `Execute a command in Termux bash. ⚠️ Requires confirm=true.`,
      inputSchema: z.object({
        command: z.string().min(1, "Command is required").max(2000, "Command too long").describe("Command to execute in Termux bash environment"),
        confirm: z.boolean().refine((v) => v === true, { message: "You must set confirm=true to execute Termux commands" }).describe("Confirmation flag - must be true"),
        timeout: z.number().int().min(1).max(300).default(60).describe("Timeout in seconds"),
      }).strict(),
      annotations: {
        readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const output = await adb.termuxExec(params.command, (params.timeout ?? 60) * 1000);
        const truncated = output.length > 10000 ? output.slice(0, 10000) + `\n... (truncated, ${output.length} total chars)` : output;
        return { content: [{ type: "text", text: truncated || "(no output)" }] };
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
