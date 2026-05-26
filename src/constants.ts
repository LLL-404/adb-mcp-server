export const CHARACTER_LIMIT = 25000;

export const ADB_TIMEOUT = 30_000;
export const TERMUX_TIMEOUT = 60_000;
export const TEXT_MAX_LENGTH = 500;

export const SCREENSHOT_DIR = process.env.ADB_SCREENSHOT_DIR ?? "screenshots";

export const TERMUX_BASH = "/data/data/com.termux/files/usr/bin/bash";
export const TERMUX_HOME = "/data/data/com.termux/files/home";

export const SAFE_KEYNAMES = [
  "HOME", "BACK", "APP_SWITCH",
  "ENTER", "DEL", "FORWARD_DEL",
  "DPAD_UP", "DPAD_DOWN", "DPAD_LEFT", "DPAD_RIGHT", "DPAD_CENTER",
  "SPACE", "TAB", "ESCAPE",
  "MENU", "NOTIFICATIONS", "SEARCH",
  "PAGE_UP", "PAGE_DOWN",
  "MOVE_HOME", "MOVE_END",
  "VOLUME_UP", "VOLUME_DOWN",
  "CLEAR", "CALL", "ENDCALL",
  "NUMPAD_0", "NUMPAD_1", "NUMPAD_2", "NUMPAD_3", "NUMPAD_4",
  "NUMPAD_5", "NUMPAD_6", "NUMPAD_7", "NUMPAD_8", "NUMPAD_9",
  "STAR", "POUND", "PLUS", "COMMA", "PERIOD", "SLASH", "SEMICOLON",
  "EQUALS", "LEFT_BRACKET", "RIGHT_BRACKET", "BACKSLASH", "APOSTROPHE",
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
];

export const KEYCODE_MAP: Record<string, number> = {
  HOME: 3, BACK: 4, CALL: 5, ENDCALL: 6,
  DPAD_UP: 19, DPAD_DOWN: 20, DPAD_LEFT: 21, DPAD_RIGHT: 22, DPAD_CENTER: 23,
  VOLUME_UP: 24, VOLUME_DOWN: 25,
  CLEAR: 28,
  A: 29, B: 30, C: 31, D: 32, E: 33, F: 34, G: 35, H: 36, I: 37,
  J: 38, K: 39, L: 40, M: 41, N: 42, O: 43, P: 44, Q: 45, R: 46,
  S: 47, T: 48, U: 49, V: 50, W: 51, X: 52, Y: 53, Z: 54,
  COMMA: 55, PERIOD: 56,
  DPAD_LEFT_ALT: 57, DPAD_RIGHT_ALT: 58,
  SPACE: 62, TAB: 61, ENTER: 66, DEL: 67,
  "0": 7, "1": 8, "2": 9, "3": 10, "4": 11, "5": 12,
  "6": 13, "7": 14, "8": 15, "9": 16,
  SEMICOLON: 74, EQUALS: 75, LEFT_BRACKET: 71, RIGHT_BRACKET: 72,
  BACKSLASH: 73, APOSTROPHE: 75, SLASH: 76, STAR: 17, POUND: 18, PLUS: 81,
  MENU: 82, NOTIFICATIONS: 83, SEARCH: 84,
  ESCAPE: 111, FORWARD_DEL: 112,
  CTRL_LEFT: 113, CTRL_RIGHT: 114,
  CAPS_LOCK: 115, SCROLL_LOCK: 116,
  MOVE_HOME: 122, MOVE_END: 123,
  PAGE_UP: 92, PAGE_DOWN: 93,
  APP_SWITCH: 187,
  NUMPAD_0: 144, NUMPAD_1: 145, NUMPAD_2: 146, NUMPAD_3: 147,
  NUMPAD_4: 148, NUMPAD_5: 149, NUMPAD_6: 150, NUMPAD_7: 151,
  NUMPAD_8: 152, NUMPAD_9: 153,
};
