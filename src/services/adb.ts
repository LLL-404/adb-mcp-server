import { spawn, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { TERMUX_BASH } from "../constants.js";

export class AdbService {
  private adbPath: string;

  constructor() {
    this.adbPath = this.findAdb();
  }

  private findAdb(): string {
    const envPath = process.env.ADB_PATH;
    if (envPath && existsSync(envPath)) return envPath;

    try {
      const cmd = process.platform === "win32" ? "where adb" : "which adb";
      const which = execSync(cmd, {
        encoding: "utf-8",
        timeout: 5000,
      }).split("\n")[0].trim();
      if (which) return which;
    } catch {
      // not found in PATH
    }

    const commonPaths = [
      "C:\\Program Files\\Android\\Platform Tools\\adb.exe",
      "C:\\Android\\platform-tools\\adb.exe",
      `${process.env.HOME}/Android/Sdk/platform-tools/adb`,
      `${process.env.HOME}/Library/Android/sdk/platform-tools/adb`,
      "/usr/local/bin/adb",
      "/usr/bin/adb",
    ];

    for (const p of commonPaths) {
      if (existsSync(p)) return p;
    }

    return "adb";
  }

  get path(): string {
    return this.adbPath;
  }

  private async spawnAdb(
    args: string[],
    timeout = 30_000
  ): Promise<{ stdout: string; stderr: string; code: number | null }> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.adbPath, args, {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });

      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];

      child.stdout.on("data", (d: Buffer) => stdout.push(d));
      child.stderr.on("data", (d: Buffer) => stderr.push(d));

      const timer = setTimeout(() => {
        child.kill("SIGTERM");
        reject(new Error(`ADB command timed out after ${timeout}ms: adb ${args.join(" ")}`));
      }, timeout);

      child.on("close", (code) => {
        clearTimeout(timer);
        resolve({
          stdout: Buffer.concat(stdout).toString("utf-8"),
          stderr: Buffer.concat(stderr).toString("utf-8"),
          code,
        });
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        reject(new Error(`Failed to start ADB: ${err.message}`));
      });
    });
  }

  async exec(args: string[], timeout?: number): Promise<string> {
    const { stdout, stderr, code } = await this.spawnAdb(args, timeout);
    if (code !== 0 && code !== null) {
      const msg = stderr.trim() || stdout.trim();
      throw new Error(`ADB error (exit ${code}): ${msg || "unknown error"}`);
    }
    return stdout;
  }

  async shell(command: string, timeout?: number): Promise<string> {
    return this.exec(["shell", command], timeout);
  }

  async shellSafe(command: string, timeout?: number): Promise<{ stdout: string; stderr: string; code: number | null }> {
    return this.spawnAdb(["shell", command], timeout);
  }

  async termuxExec(command: string, timeout = 60_000): Promise<string> {
    const fullCmd = `${TERMUX_BASH} -l -c ${this.escapeShellArg(command)}`;
    return this.exec(["shell", fullCmd], timeout);
  }

  async checkDevice(): Promise<boolean> {
    try {
      const out = await this.exec(["devices"], 5000);
      const lines = out.split("\n").filter((l) => l.includes("\tdevice"));
      return lines.length > 0;
    } catch {
      return false;
    }
  }

  async getDeviceSerial(): Promise<string | null> {
    try {
      const out = await this.exec(["devices"], 5000);
      const lines = out.split("\n").filter((l) => l.includes("\tdevice"));
      if (lines.length === 0) return null;
      return lines[0].split("\t")[0].trim();
    } catch {
      return null;
    }
  }

  private escapeShellArg(arg: string): string {
    const escaped = arg.replace(/'/g, "'\\''");
    return `'${escaped}'`;
  }
}




