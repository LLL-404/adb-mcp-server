<div align="center">

**[English](./README.en.md)** · **简体中文**

# ADB MCP Server

**通过 MCP 协议控制 Android 设备**

`20 个工具` · `MCP 标准协议` · `Node ≥ 18` · `MIT`

</div>

> [!IMPORTANT]
> 为 AI 助手（如 Claude）提供完整的 ADB 操作能力：设备信息、屏幕、输入、应用、Shell、文件、UI 解析，七大类一应俱全。

## 功能特性

- **设备信息** — 获取型号、Android 版本、屏幕分辨率、电池状态、IP、序列号
- **屏幕控制** — 截图、获取屏幕尺寸
- **输入模拟** — 点击、滑动、输入文本、按键事件（HOME/BACK/音量等）
- **应用管理** — 列出/查看/启动/停止应用、获取前台应用
- **Shell 执行** — 执行任意 ADB Shell 命令、Termux 命令（需确认）
- **文件传输** — 从设备拉取文件到本地
- **UI 解析** — 获取界面元素树、按文本定位并点击

## ⌨️ 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 构建
npm run build

# 3. 配置 MCP
# 将 opencode.json 中的 mcpServers.adb 配置添加到你的 MCP 客户端

# 4. 运行
npm start
```

日常手感：<kbd>npm install</kbd> → <kbd>npm run build</kbd> → <kbd>npm start</kbd>

## ⚙️ 配置

在 MCP 客户端中添加以下配置（以 opencode 为例）：

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

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ADB_PATH` | `adb` 可执行文件的完整路径（不设置则自动查找 PATH 和常用路径） | 自动检测 |
| `ADB_SCREENSHOT_DIR` | 截图文件保存目录 | `screenshots/` |

## 🧰 工具列表

### 设备信息

| 工具 | 描述 |
|------|------|
| `adb_device_info` | 获取设备信息：型号、Android 版本、屏幕、电池、IP、序列号 |
| `adb_battery` | 获取电池电量、充电状态、温度、健康度 |
| `adb_clipboard` | 读取剪贴板内容（Android 10+） |

### 屏幕

| 工具 | 描述 |
|------|------|
| `adb_screenshot` | 截图，支持返回文件路径或 base64 |
| `adb_screen_size` | 获取屏幕分辨率 |

### 输入

| 工具 | 描述 |
|------|------|
| `adb_tap` | 在指定坐标点击 |
| `adb_swipe` | 从 (x1,y1) 滑动到 (x2,y2)，支持设置持续时间 |
| `adb_text` | 输入文本（自动选择 ASCII 直输或 Unicode 剪贴板方案） |
| `adb_keyevent` | 发送按键事件（HOME、BACK、ENTER、音量等 60+ 按键） |

### 应用管理

| 工具 | 描述 |
|------|------|
| `adb_list_packages` | 列出已安装应用，支持按关键字、类型（用户/系统/全部）筛选 |
| `adb_app_info` | 获取应用详情：版本、SDK 目标、安装时间、权限列表 |
| `adb_app_launch` | 启动应用，可指定 Activity |
| `adb_app_stop` | 强制停止应用 |
| `adb_current_app` | 获取当前前台应用包名和 Activity |

### Shell

| 工具 | 描述 | 需确认 |
|------|------|--------|
| `adb_shell` | 执行 Android Shell 命令 | ✅ `confirm=true` |
| `adb_termux_exec` | 在 Termux bash 中执行命令 | ✅ `confirm=true` |

### 文件

| 工具 | 描述 |
|------|------|
| `adb_pull` | 从设备拉取文件到本地 |

### UI

| 工具 | 描述 |
|------|------|
| `adb_ui_tree` | 获取界面无障碍元素树（含位置、可点击状态等） |
| `adb_observe` | 截图 + UI 树一站式观察屏幕 |
| `adb_tap_text` | 按文本查找 UI 元素并点击 |

## 使用示例

**查看设备信息：**
```
调用 adb_device_info 即可获取设备型号、Android 版本、屏幕参数、电池状态等。

输出示例：
- Model: Google Pixel 7
- Android: 14 (SDK 34)
- Screen: 1080x2400
- Battery: 85% (charging, 32.5°C)
```

**观察屏幕并点击：**
```
1. 调用 adb_observe 获取当前屏幕截图（base64）+ UI 元素列表
2. AI 根据 UI 元素坐标，调用 adb_tap 或 adb_tap_text 进行操作
```

**截图：**
```
调用 adb_screenshot，截图自动保存到 ADB_SCREENSHOT_DIR
```

## 🧱 环境依赖

### 运行时

| 依赖 | 版本 | 说明 |
|------|------|------|
| [Node.js](https://nodejs.org) | >= 18 | JavaScript 运行环境 |
| `@modelcontextprotocol/sdk` | ^1.6.1 | MCP 协议服务端 SDK |
| `zod` | ^3.23.8 | 输入参数模式校验 |

### 开发

| 依赖 | 版本 | 说明 |
|------|------|------|
| `typescript` | ^5.7.2 | TypeScript 编译器 |
| `tsx` | ^4.19.2 | TypeScript 开发热重载 |
| `@types/node` | ^22.10.0 | Node.js 类型定义 |

### 系统

| 需求 | 说明 |
|------|------|
| **ADB** | Android Debug Bridge，详见[安装 ADB](#安装-adb) |
| **Android 设备** | 通过 USB 连接，开启开发者选项和 USB 调试；或使用 Android 模拟器 |
| **Termux**（可选） | 用于 `adb_termux_exec` 工具，需在设备上安装 Termux |

### 安装 ADB

Windows 用户可直接运行项目根目录的 `setup-adb.ps1` 脚本一键安装：

```powershell
.\setup-adb.ps1
```

该脚本会依次尝试 winget 安装和手动下载安装。

其他方式：
- [Android Developer 官网](https://developer.android.com/studio/releases/platform-tools) 下载 Platform Tools
- macOS: `brew install android-platform-tools`
- Linux: `apt install adb` 或 `pacman -S android-tools`

## 🗂 仓库地图

```
src/
  ├── index.ts          服务器入口
  ├── services/
  │   ├── adb.ts        ADB 命令执行核心
  │   └── ui-parser.ts  界面元素树解析
  └── tools/
      ├── device.ts     设备信息
      ├── screen.ts     截图与屏幕
      ├── input.ts      输入模拟
      ├── app.ts        应用管理
      ├── shell.ts      Shell 执行
      ├── file.ts       文件传输
      └── ui.ts         UI 观察
```

## 🔒 安全说明

> [!WARNING]
> **Shell 需确认** —— `adb_shell` 和 `adb_termux_exec` 必须显式设置 `confirm=true` 才能执行，防止误操作。
>
> **按键白名单** —— 按键事件走白名单机制，仅允许安全的系统按键（无电源键、重启等危险按键）。
>
> **长度限制** —— 文本输入限制 500 字符。

## 许可证

MIT
