import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AdbService } from "../services/adb.js";
import { SCREENSHOT_DIR } from "../constants.js";
import { parseUiDump, cleanJsonElement, type UiElement, type ObserveResult } from "../services/ui-parser.js";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function registerUiTools(server: McpServer, adb: AdbService) {
  server.registerTool(
    "adb_ui_tree",
    {
      title: "Get UI Element Tree",
      description: `Get UI element tree (accessibility dump) with bounding boxes and positions.`,
      inputSchema: z.object({
        response_format: z.enum(["json", "text"]).default("json").describe("Output format"),
        max_elements: z.number().int().min(1).max(200).default(80).describe("Maximum elements to return"),
      }).strict(),
      annotations: {
        readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const xml = await dumpUi(adb);
        const elements = parseUiDump(xml, params.max_elements);

        if (params.response_format === "text") {
          const lines = elements.map((e, i) =>
            `[${i}] ${e.class}${e.text ? ` "${e.text}"` : ""}${e.resourceId ? ` (${e.resourceId.split("/").pop()})` : ""} at (${e.center[0]}, ${e.center[1]})${e.clickable ? " [tap]" : ""}${e.focusable ? " [type]" : ""}${e.scrollable ? " [scroll]" : ""}`
          );
          return { content: [{ type: "text", text: `UI Elements (${elements.length}):\n${lines.join("\n") || "(empty)"}` }] };
        }

        return {
          content: [{ type: "text", text: JSON.stringify({ count: elements.length, elements: elements.map(cleanJsonElement) }, null, 2) }],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "adb_observe",
    {
      title: "Observe Screen (Screenshot + UI Tree)",
      description: `Take screenshot (base64) + UI tree in one call. Recommended for "looking" at the screen.`,
      inputSchema: z.object({
        max_elements: z.number().int().min(1).max(200).default(60).describe("Maximum UI elements to return"),
      }).strict(),
      annotations: {
        readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true,
      },
    },
    async (params) => {
      const result: ObserveResult = {};
      const errors: string[] = [];

      try {
        mkdirSync(SCREENSHOT_DIR, { recursive: true });
        const filename = `observe_${Date.now()}.png`;
        const remotePath = `/sdcard/${filename}`;
        const localPath = join(SCREENSHOT_DIR, filename);

        await adb.shell(`screencap -p ${remotePath}`);
        await adb.exec(["pull", remotePath, localPath]);
        await adb.shell(`rm -f ${remotePath}`);

        const data = readFileSync(localPath);
        result.screenshot = {
          base64: data.toString("base64"),
          width: 0,
          height: 0,
          size_bytes: data.length,
        };
      } catch (e) {
        errors.push(`Screenshot: ${e instanceof Error ? e.message : "failed"}`);
      }

      try {
        const xml = await dumpUi(adb);
        const elements = parseUiDump(xml, params.max_elements);
        result.ui = {
          elements,
          count: elements.length,
          total_nodes: (xml.match(/<node/g) || []).length,
        };
      } catch (e) {
        errors.push(`UI tree: ${e instanceof Error ? e.message : "failed"}`);
      }

      const parts: string[] = [];
      if (result.screenshot) {
        parts.push(`![screenshot](data:image/png;base64,${result.screenshot.base64})`);
        parts.push("");
      }
      if (result.ui) {
        parts.push(`**UI Elements** (${result.ui.count} shown, ${result.ui.total_nodes} total nodes):`);
        for (const el of result.ui.elements.slice(0, params.max_elements)) {
          parts.push(formatElementLine(el));
        }
      }
      if (errors.length > 0) {
        parts.push("", `**Warnings**: ${errors.join("; ")}`);
      }
      if (!result.screenshot && !result.ui) {
        return { content: [{ type: "text", text: `Failed to observe screen: ${errors.join("; ")}` }] };
      }

      return { content: [{ type: "text", text: parts.join("\n") }] };
    }
  );

  server.registerTool(
    "adb_tap_text",
    {
      title: "Tap UI Element by Text",
      description: `Find UI element by text/ID/content-desc and tap its center. Regex partial match.`,
      inputSchema: z.object({
        text: z.string().min(1).describe("Text to search for (case-insensitive partial match)"),
        type: z.enum(["text", "id", "desc"]).default("text").describe("Match type"),
        wait_ms: z.number().int().min(0).max(10000).default(500).describe("Wait time before tap in ms"),
      }).strict(),
      annotations: {
        readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const xml = await dumpUi(adb);
        const elements = parseUiDump(xml, 200);
        const query = params.text.toLowerCase();

        const matched = elements.find((el) => {
          const target = params.type === "id" ? el.resourceId
            : params.type === "desc" ? el.contentDesc
            : el.text;
          return target.toLowerCase().includes(query);
        });

        if (!matched) {
          const suggestions = elements
            .filter((e) => (e.text || e.contentDesc || e.resourceId))
            .slice(0, 5)
            .map((e) => `  - "${e.text || e.contentDesc || e.resourceId}" (${e.class})`);
          const lines = [
            `No element matching "${params.text}" found.`,
            "Here are some available elements:",
            ...suggestions,
            "",
            `Tip: Use adb_observe first to see all elements on screen.`,
          ];
          return { content: [{ type: "text", text: lines.join("\n") }] };
        }

        const [x, y] = matched.center;
        if (params.wait_ms > 0) {
          await new Promise((r) => setTimeout(r, params.wait_ms));
        }
        await adb.shell(`input tap ${x} ${y}`);

        return {
          content: [{
            type: "text",
            text: `Tapped "${matched.text || matched.contentDesc || matched.resourceId}" (${matched.class}) at (${x}, ${y})`,
          }],
        };
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}

async function dumpUi(adb: AdbService): Promise<string> {
  const result = await adb.shellSafe("uiautomator dump /sdcard/ui_temp.xml 2>/dev/null && cat /sdcard/ui_temp.xml && rm /sdcard/ui_temp.xml", 15000);
  if (result.code !== 0) throw new Error(`UI dump failed (${result.code}): ${result.stderr || result.stdout || "timeout or not supported"}`);

  const xml = result.stdout;
  if (!xml || !xml.includes("<hierarchy") || !xml.includes("<node")) {
    throw new Error("No UI elements found. Screen may be off or locked.");
  }
  return xml;
}

function formatElementLine(el: UiElement): string {
  const tags: string[] = [];
  if (el.clickable) tags.push("tap");
  if (el.focusable) tags.push("type");
  if (el.scrollable) tags.push("scroll");
  const label = el.text || el.contentDesc || el.resourceId.split("/").pop() || "";
  const tagStr = tags.length ? ` [${tags.join(",")}]` : "";
  return `  [${el.index}] ${el.class} "${label}" (${el.center[0]}, ${el.center[1]})${tagStr}`;
}

function errorResult(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }] };
}
