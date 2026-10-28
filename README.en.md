<div align="center">

**English** · **[简体中文](./README.md)**

# ADB MCP Server

**Control Android devices over the MCP protocol**

`20 tools` · `MCP standard` · `Node ≥ 18` · `MIT`

</div>

> [!IMPORTANT]
> Gives AI assistants (e.g. Claude) full ADB capability: device info, screen, input, apps, shell, files, and UI parsing — seven categories in one server.

## Features

- **Device info** — model, Android version, screen resolution, battery, IP, serial number
- **Screen control** — screenshots, screen size
- **Input simulation** — tap, swipe, text input, key events (HOME/BACK/volume and more)
- **App management** — list/inspect/launch/stop apps, get the foreground app
- **Shell execution** — run arbitrary ADB shell commands and Termux commands (confirmation required)
- **File transfer** — pull files from the device
- **UI parsing** — accessibility tree, locate elements by text and tap them

## ⌨️ Quick start

```bash
# 1. Install dependencies
npm install

# 2. Build
npm run build

# 3. Configure MCP
# Add the mcpServers.adb block from opencode.json to your MCP client

# 4. Run
npm start
```

Daily flow: <kbd>npm install</kbd> → <kbd>npm run build</kbd> → <kbd>npm start</kbd>

## ⚙️ Configuration

Add this to your MCP client (opencode shown as an example):

```json
{
  "mcpServers": {
    "adb": {
      "command": "node",
      "args": ["path/to/adb-mcp-server/dist/index.js"],
      "env": {
        "ADB_PATH": "C:\\Users\\<username>\\AppData\\Local\\Android\\platform-tools\\adb.exe",
        "ADB_SCREENSHOT_DIR": "path/to/screenshots"
      }
    }
  }
}
```

### Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ADB_PATH` | Full path to the `adb` executable (if unset, PATH and common locations are probed) | auto-detect |
| `ADB_SCREENSHOT_DIR` | Directory for saved screenshots | `screenshots/` |

## 🧰 Tool list

### Device info

| Tool | Description |
|------|-------------|
| `adb_device_info` | Device model, Android version, screen, battery, IP, serial number |
| `adb_battery` | Battery level, charging state, temperature, health |
| `adb_clipboard` | Read the clipboard (Android 10+) |

### Screen

| Tool | Description |
|------|-------------|
| `adb_screenshot` | Take a screenshot; returns a file path or base64 |
| `adb_screen_size` | Get the screen resolution |

### Input

| Tool | Description |
|------|-------------|
| `adb_tap` | Tap at coordinates |
| `adb_swipe` | Swipe from (x1,y1) to (x2,y2), optional duration |
| `adb_text` | Type text (auto-picks ASCII direct input or the Unicode clipboard path) |
| `adb_keyevent` | Send key events (HOME, BACK, ENTER, volume — 60+ keys) |

### Apps

| Tool | Description |
|------|-------------|
| `adb_list_packages` | List installed apps; filter by keyword and type (user/system/all) |
| `adb_app_info` | App details: version, target SDK, install time, permissions |
| `adb_app_launch` | Launch an app, optional Activity |
| `adb_app_stop` | Force-stop an app |
| `adb_current_app` | Get the foreground package and Activity |

### Shell

| Tool | Description | Confirm |
|------|-------------|---------|
| `adb_shell` | Run an Android shell command | ✅ `confirm=true` |
| `adb_termux_exec` | Run a command in Termux bash | ✅ `confirm=true` |

### Files

| Tool | Description |
|------|-------------|
| `adb_pull` | Pull a file from the device |

### UI

| Tool | Description |
|------|-------------|
| `adb_ui_tree` | Accessibility element tree (bounds, clickable state, …) |
| `adb_observe` | One-shot screen observation: screenshot + UI tree |
| `adb_tap_text` | Find a UI element by text and tap it |

## Examples

**Device info:**
```
Call adb_device_info to get model, Android version, screen, battery, etc.

Sample output:
- Model: Google Pixel 7
- Android: 14 (SDK 34)
- Screen: 1080x2400
- Battery: 85% (charging, 32.5°C)
```

**Observe and tap:**
```
1. Call adb_observe to get the current screenshot (base64) + UI element list
2. From the element coordinates, call adb_tap or adb_tap_text to act
```

**Screenshot:**
```
Call adb_screenshot — saved to ADB_SCREENSHOT_DIR automatically
```

## 🧱 Requirements

### Runtime

| Dependency | Version | Notes |
|------------|---------|-------|
| [Node.js](https://nodejs.org) | >= 18 | JavaScript runtime |
| `@modelcontextprotocol/sdk` | ^1.6.1 | MCP server SDK |
| `zod` | ^3.23.8 | Argument schema validation |

### Development

| Dependency | Version | Notes |
|------------|---------|-------|
| `typescript` | ^5.7.2 | TypeScript compiler |
| `tsx` | ^4.19.2 | Dev hot-reload for TypeScript |
| `@types/node` | ^22.10.0 | Node.js type definitions |

### System

| Requirement | Notes |
|-------------|-------|
| **ADB** | Android Debug Bridge — see [Install ADB](#install-adb) |
| **Android device** | USB with developer options + USB debugging enabled, or an emulator |
| **Termux** (optional) | For the `adb_termux_exec` tool; must be installed on the device |

### Install ADB

On Windows, run the one-shot script at the repo root:

```powershell
.\setup-adb.ps1
```

It tries winget first, then a manual download. Alternatives:
- Download Platform Tools from the [Android Developer site](https://developer.android.com/studio/releases/platform-tools)
- macOS: `brew install android-platform-tools`
- Linux: `apt install adb` or `pacman -S android-tools`

## 🗂 Repo map

```
src/
  ├── index.ts          server entry
  ├── services/
  │   ├── adb.ts        ADB command core
  │   └── ui-parser.ts  accessibility tree parsing
  └── tools/
      ├── device.ts     device info
      ├── screen.ts     screenshots & screen
      ├── input.ts      input simulation
      ├── app.ts        app management
      ├── shell.ts      shell execution
      ├── file.ts       file transfer
      └── ui.ts         UI observation
```

## 🔒 Security

> [!WARNING]
> **Shell requires confirmation** — `adb_shell` and `adb_termux_exec` only run with an explicit `confirm=true`, guarding against accidental execution.
>
> **Key event whitelist** — key events go through a whitelist; only safe system keys are allowed (no power, no reboot).
>
> **Length limit** — text input is capped at 500 characters.

## License

MIT


---

<div align="center">

**[🌍 Website](https://lll-404.github.io/)** · **[GitHub](https://github.com/LLL-404)** · **[📧 Email](mailto:2350178663@qq.com)**

</div>
