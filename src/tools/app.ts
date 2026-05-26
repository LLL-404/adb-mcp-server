import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AdbService } from "../services/adb.js";

export function registerAppTools(server: McpServer, adb: AdbService) {
  server.registerTool(
    "adb_list_packages",
    {
      title: "List Installed Packages",
      description: `List installed packages, filterable by keyword and type (user/system/all).`,
      inputSchema: z.object({
        filter: z.string().optional().describe("Keyword to filter package names"),
        type: z.enum(["all", "user", "system"]).default("user").describe("Package type filter"),
        limit: z.number().int().min(1).max(500).default(50).describe("Maximum results"),
        response_format: z.enum(["markdown", "json"]).default("markdown").describe("Output format"),
      }).strict(),
      annotations: {
        readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const listCmd = params.type === "all"
          ? "pm list packages --user 0"
          : `pm list packages --user 0 ${params.type === "user" ? "-3" : "-s"}`;
        let raw = await adb.shell(listCmd);

        const packages = raw.split("\n")
          .map((l) => l.trim())
          .filter((l) => l.startsWith("package:"))
          .map((l) => l.replace("package:", "").trim())
          .filter((p) => !params.filter || p.toLowerCase().includes(params.filter.toLowerCase()));

        const total = packages.length;
        const sliced = packages.slice(0, params.limit);
        const hasMore = total > params.limit;

        if (params.response_format === "json") {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({ total, count: sliced.length, packages: sliced.map((p) => ({ package_name: p })), has_more: hasMore }, null, 2),
            }],
          };
        }

        if (sliced.length === 0) {
          const filterMsg = params.filter ? ` matching '${params.filter}'` : "";
          return { content: [{ type: "text", text: `No packages found${filterMsg}.` }] };
        }

        const lines = [`# Installed Packages (${params.type})`, ""];
        if (params.filter) lines.push(`Filter: "${params.filter}" | `);
        lines.push(`Found ${total} packages, showing ${sliced.length}`, "");
        lines.push(...sliced.map((p) => `- \`${p}\``));
        if (hasMore) lines.push("", `... and ${total - params.limit} more. Use a filter to narrow results.`);

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "adb_app_info",
    {
      title: "Get App Info",
      description: `Get version, SDK, install date, permissions for an installed app.`,
      inputSchema: z.object({
        package_name: z.string().min(1).describe("Android package name (e.g., 'com.termux')"),
        response_format: z.enum(["markdown", "json"]).default("markdown").describe("Output format"),
      }).strict(),
      annotations: {
        readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const pkg = params.package_name;
        const exists = await adb.shell(`pm list packages ${pkg}`).catch(() => "");
        if (!exists.includes(pkg)) {
          return { content: [{ type: "text", text: `Package '${pkg}' is not installed.` }] };
        }

        const [dump, path] = await Promise.all([
          adb.shell(`dumpsys package ${pkg}`).catch(() => ""),
          adb.shell(`pm path ${pkg}`).catch(() => ""),
        ]);

        const versionName = dump.match(/versionName=([^\s]+)/)?.[1] ?? "?";
        const versionCode = dump.match(/versionCode=(\d+)/)?.[1] ?? "?";
        const targetSdk = dump.match(/targetSdk=(\d+)/)?.[1] ?? "?";
        const minSdk = dump.match(/minSdk=(\d+)/)?.[1] ?? "?";
        const firstInstall = dump.match(/firstInstallTime=([^\s]+)/)?.[1] ?? "?";
        const lastUpdate = dump.match(/lastUpdateTime=([^\s]+)/)?.[1] ?? "?";
        const permissions = [...dump.matchAll(/^(?:android\.)?permission\.(\w+)/gm)].map((m) => m[1]);

        const info = {
          package_name: pkg,
          version_name: versionName,
          version_code: parseInt(versionCode) || 0,
          target_sdk: parseInt(targetSdk) || 0,
          min_sdk: parseInt(minSdk) || 0,
          first_install: firstInstall,
          last_update: lastUpdate,
          permissions: [...new Set(permissions)].slice(0, 100),
          apk_path: path.replace("package:", "").trim() || "?",
        };

        if (params.response_format === "json") {
          return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }] };
        }

        const lines = [
          `# ${pkg}`,
          ``,
          `**Version**: ${info.version_name} (code ${info.version_code})`,
          `**SDK**: target ${info.target_sdk} / min ${info.min_sdk}`,
          `**Installed**: ${info.first_install}`,
          `**Updated**: ${info.last_update}`,
          `**APK**: ${info.apk_path}`,
          info.permissions.length > 0 ? `\n**Permissions** (${info.permissions.length}):\n${info.permissions.map((p) => `  - ${p}`).join("\n")}` : null,
        ].filter(Boolean).join("\n");

        return { content: [{ type: "text", text: lines }] };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "adb_app_launch",
    {
      title: "Launch App",
      description: `Launch an app by package name. Optionally specify an activity.`,
      inputSchema: z.object({
        package_name: z.string().min(1).describe("Package name to launch (e.g., 'com.android.chrome')"),
        activity: z.string().optional().describe("Specific activity (e.g., '.MainActivity'). Default: launcher activity"),
      }).strict(),
      annotations: {
        readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const { package_name: pkg, activity } = params;
        if (activity) {
          await adb.shell(`am start -n ${pkg}/${activity}`);
        } else {
          await adb.shell(`monkey -p ${pkg} 1`);
        }
        return { content: [{ type: "text", text: `Launched: ${pkg}${activity ? ` / ${activity}` : ""}` }] };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "adb_app_stop",
    {
      title: "Stop App",
      description: `Force-stop an app by package name.`,
      inputSchema: z.object({
        package_name: z.string().min(1).describe("Package name to stop (e.g., 'com.android.chrome')"),
      }).strict(),
      annotations: {
        readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true,
      },
    },
    async (params) => {
      try {
        await adb.shell(`am force-stop ${params.package_name}`);
        return { content: [{ type: "text", text: `Stopped: ${params.package_name}` }] };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "adb_current_app",
    {
      title: "Get Current Foreground App",
      description: `Get the package name and activity of the foreground app.`,
      inputSchema: z.object({}).strict(),
      annotations: {
        readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true,
      },
    },
    async () => {
      try {
        const raw = await adb.shell("dumpsys activity 2>/dev/null | grep -E 'mFocusedApp|mResumedActivity|mCurrentFocus'");
        const match = raw.match(/([\w.]+)\/([\w.]+)/);
        if (!match) return { content: [{ type: "text", text: `Could not determine current app. Raw: ${raw.trim() || "(empty)"}` }] };
        return {
          content: [{ type: "text", text: `**Foreground App**: \`${match[1]}\`\n**Activity**: \`${match[2]}\`` }],
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
