import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AdbService } from "../services/adb.js";
import { KEYCODE_MAP, SAFE_KEYNAMES, TEXT_MAX_LENGTH } from "../constants.js";

export function registerInputTools(server: McpServer, adb: AdbService) {
  server.registerTool(
    "adb_tap",
    {
      title: "Tap Screen at Coordinates",
      description: `Tap screen at pixel coordinates (x, y).`,
      inputSchema: z.object({
        x: z.number().int().min(0).max(99999).describe("X coordinate in pixels"),
        y: z.number().int().min(0).max(99999).describe("Y coordinate in pixels"),
      }).strict(),
      annotations: {
        readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true,
      },
    },
    async (params) => {
      try {
        await adb.shell(`input tap ${params.x} ${params.y}`);
        return { content: [{ type: "text", text: `Tapped at (${params.x}, ${params.y})` }] };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "adb_swipe",
    {
      title: "Swipe on Screen",
      description: `Swipe from (x1,y1) to (x2,y2) with optional duration (ms).`,
      inputSchema: z.object({
        x1: z.number().int().min(0).describe("Start X coordinate"),
        y1: z.number().int().min(0).describe("Start Y coordinate"),
        x2: z.number().int().min(0).describe("End X coordinate"),
        y2: z.number().int().min(0).describe("End Y coordinate"),
        duration: z.number().int().min(0).max(30000).default(300).describe("Swipe duration in ms (default: 300)"),
      }).strict(),
      annotations: {
        readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const { x1, y1, x2, y2, duration } = params;
        await adb.shell(`input swipe ${x1} ${y1} ${x2} ${y2}${duration ? ` ${duration}` : ""}`);
        return { content: [{ type: "text", text: `Swiped from (${x1},${y1}) to (${x2},${y2})` }] };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "adb_text",
    {
      title: "Input Text",
      description: `Type text into focused input. ASCII via key injection, Unicode via clipboard paste (Android 10+).`,
      inputSchema: z.object({
        text: z.string().min(1, "Text is required").max(TEXT_MAX_LENGTH, `Text must not exceed ${TEXT_MAX_LENGTH} characters`).describe(`Text to input (max ${TEXT_MAX_LENGTH} chars)`),
        method: z.enum(["auto", "input", "clipboard"]).default("auto").describe("Input method: auto, input (ASCII only), clipboard (paste)"),
      }).strict(),
      annotations: {
        readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const hasUnicode = /[^\x00-\x7F]/.test(params.text);
        const useClipboard = params.method === "clipboard" || (params.method === "auto" && hasUnicode);

        if (useClipboard) {
          await adb.shell(`printf '%s' ${escapeArg(params.text)} > /sdcard/.adb_text_temp`);
          await adb.shell("input keyevent 279");
          await adb.shell("rm -f /sdcard/.adb_text_temp");
        } else {
          const escaped = escapeInputText(params.text);
          await adb.shell(`input text ${escaped}`);
        }

        return { content: [{ type: "text", text: `Text input: "${params.text.slice(0, 100)}${params.text.length > 100 ? "..." : ""}"` }] };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "adb_keyevent",
    {
      title: "Send Key Event",
      description: `Send a safe key event (HOME, BACK, ENTER, etc.). Allowed: navigation, editing, media, alphanumeric keys.`,
      inputSchema: z.object({
        key: z.string().refine((k) => SAFE_KEYNAMES.includes(k.toUpperCase()), { message: `Unsafe or unknown key. Allowed: ${SAFE_KEYNAMES.join(", ")}` }).describe("Key name (e.g., HOME, BACK, ENTER)"),
      }).strict(),
      annotations: {
        readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const keyName = params.key.toUpperCase();
        const code = KEYCODE_MAP[keyName];
        if (code === undefined) {
          return { content: [{ type: "text", text: `Unknown key: ${keyName}` }] };
        }
        await adb.shell(`input keyevent ${code}`);
        return { content: [{ type: "text", text: `Key pressed: ${keyName} (keycode ${code})` }] };
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}

function escapeInputText(text: string): string {
  return text
    .replace(/%/g, "\\%")
    .replace(/ /g, "%s")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/</g, "\\<")
    .replace(/>/g, "\\>")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/`/g, "\\`")
    .replace(/~/g, "\\~")
    .replace(/&/g, "\\&")
    .replace(/\|/g, "\\|")
    .replace(/;/g, "\\;")
    .replace(/\*/g, "\\*")
    .replace(/\\/g, "\\\\");
}

function escapeArg(arg: string): string {
  const escaped = arg.replace(/'/g, "'\\''");
  return `'${escaped}'`;
}

function errorResult(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }] };
}
