import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AdbService } from "../services/adb.js";

export function registerDeviceTools(server: McpServer, adb: AdbService) {
  server.registerTool(
    "adb_device_info",
    {
      title: "Get Android Device Info",
      description: `Get device model, Android version, screen, battery, IP, and serial.`,
      inputSchema: z.object({
        response_format: z.enum(["markdown", "json"]).default("markdown").describe("Output format"),
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const serial = await adb.getDeviceSerial();
        if (!serial) return adbError("No Android device detected. Connect your phone via USB and ensure USB debugging is enabled.");

        const [model, manufacturer, version, sdk, screen, battery, storage, ip] = await Promise.all([
          adb.shell("getprop ro.product.model").catch(() => "unknown"),
          adb.shell("getprop ro.product.manufacturer").catch(() => "unknown"),
          adb.shell("getprop ro.build.version.release").catch(() => "unknown"),
          adb.shell("getprop ro.build.version.sdk").catch(() => "unknown"),
          adb.shell("dumpsys display | grep mBaseDisplayInfo").catch(() => ""),
          adb.shell("dumpsys battery").catch(() => ""),
          adb.shell("dumpsys diskstats").catch(() => ""),
          adb.shell("ip -4 addr show wlan0 | grep inet").catch(() => ""),
        ]);

        const screenMatch = screen.match(/(\d+)x(\d+)/);
        const screenWidth = screenMatch ? parseInt(screenMatch[1]) : 0;
        const screenHeight = screenMatch ? parseInt(screenMatch[2]) : 0;

        const batteryLevel = battery.match(/level:\s*(\d+)/)?.[1] ?? "?";
        const batteryStatus = battery.match(/status:\s*(\d+)/)?.[1] ?? "?";
        const batteryTemp = battery.match(/temperature:\s*(\d+)/)?.[1] ?? "?";
        const statusMap: Record<string, string> = { "1": "unknown", "2": "charging", "3": "discharging", "4": "not charging", "5": "full" };

        const ipMatch = ip.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/)?.[1] ?? null;

        const info = {
          serial,
          model: model.trim(),
          manufacturer: manufacturer.trim(),
          android_version: version.trim(),
          sdk_level: parseInt(sdk) || 0,
          screen: { width: screenWidth, height: screenHeight },
          battery: {
            level: parseInt(batteryLevel),
            status: statusMap[batteryStatus] ?? batteryStatus,
            temperature: parseInt(batteryTemp) / 10,
          },
          ip: ipMatch,
        };

        if (params.response_format === "json") {
          return {
            content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
          };
        }

        const lines = [
          `# Device Info`,
          ``,
          `**Model**: ${info.manufacturer} ${info.model}`,
          `**Android**: ${info.android_version} (SDK ${info.sdk_level})`,
          `**Screen**: ${info.screen.width}x${info.screen.height}`,
          `**Battery**: ${info.battery.level}% (${info.battery.status}, ${info.battery.temperature}°C)`,
          info.ip ? `**IP**: ${info.ip}` : null,
          `**Serial**: ${info.serial}`,
        ].filter(Boolean).join("\n");

        return { content: [{ type: "text", text: lines }] };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "adb_battery",
    {
      title: "Get Battery Status",
      description: `Get battery level, charging status, and temperature.`,
      inputSchema: z.object({
        response_format: z.enum(["markdown", "json"]).default("markdown").describe("Output format"),
      }).strict(),
      annotations: {
        readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const raw = await adb.shell("dumpsys battery");
        const level = parseInt(raw.match(/level:\s*(\d+)/)?.[1] ?? "0");
        const statusCode = raw.match(/status:\s*(\d+)/)?.[1] ?? "1";
        const tempRaw = raw.match(/temperature:\s*(\d+)/)?.[1] ?? "0";
        const healthCode = raw.match(/health:\s*(\d+)/)?.[1] ?? "1";

        const statusMap: Record<string, string> = { "1": "unknown", "2": "charging", "3": "discharging", "4": "not charging", "5": "full" };
        const healthMap: Record<string, string> = { "1": "unknown", "2": "good", "3": "overheat", "4": "dead", "5": "over voltage", "6": "unspecified", "7": "cold" };

        const data = { level, status: statusMap[statusCode] ?? "unknown", temperature: parseInt(tempRaw) / 10, health: healthMap[healthCode] ?? "unknown" };

        if (params.response_format === "json") {
          return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }

        return { content: [{ type: "text", text: `**Battery**: ${data.level}% (${data.status})\n**Temperature**: ${data.temperature}°C\n**Health**: ${data.health}` }] };
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.registerTool(
    "adb_clipboard",
    {
      title: "Get Device Clipboard Content",
      description: `Get clipboard text (Android 10+).`,
      inputSchema: z.object({}).strict(),
      annotations: {
        readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true,
      },
    },
    async () => {
      try {
        const raw = await adb.shell("service call clipboard 1 2>/dev/null || cmd clipboard get-text 2>/dev/null");
        const cleaned = raw.replace(/^Result: |Parcel[^)]*\)|\([^)]*\)/g, "").replace(/[^ -~\u4e00-\u9fff\u3400-\u4dbf\uff00-\uffef\u3000-\u303f\w]/g, "").trim();
        if (!cleaned) {
          return { content: [{ type: "text", text: "Clipboard is empty or could not be read." }] };
        }
        return { content: [{ type: "text", text: `Clipboard content:\n\`\`\`\n${cleaned}\n\`\`\`` }] };
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}

function adbError(msg: string) {
  return { content: [{ type: "text" as const, text: msg }] };
}

function errorResult(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }] };
}
