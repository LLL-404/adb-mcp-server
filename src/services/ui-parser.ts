export interface UiElement {
  index: number;
  class: string;
  text: string;
  resourceId: string;
  contentDesc: string;
  bounds: [number, number, number, number];
  center: [number, number];
  clickable: boolean;
  enabled: boolean;
  focusable: boolean;
  scrollable: boolean;
}

export interface ObserveResult {
  screenshot?: {
    base64: string;
    width: number;
    height: number;
    size_bytes: number;
  };
  ui?: {
    elements: UiElement[];
    count: number;
    total_nodes: number;
  };
  error?: string;
}

export function parseUiDump(xml: string, maxElements = 80): UiElement[] {
  const elements: UiElement[] = [];
  const nodeRegex = /<node\s+([^>]*?)\/?>/g;
  const attrRegex = /(\w+(?:-\w+)*)="([^"]*)"/g;

  let match: RegExpExecArray | null;
  while ((match = nodeRegex.exec(xml)) !== null) {
    const attrsStr = match[1];
    if (xml[match.index - 1] === "/") continue;

    const attrs: Record<string, string> = {};
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }

    if (!attrs.class) continue;

    const boundsMatch = attrs.bounds?.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!boundsMatch) continue;

    const [x1, y1, x2, y2] = [Number(boundsMatch[1]), Number(boundsMatch[2]), Number(boundsMatch[3]), Number(boundsMatch[4])];
    if (x1 === 0 && y1 === 0 && x2 === 0 && y2 === 0) continue;

    const el: UiElement = {
      index: elements.length,
      class: attrs.class.split(".").pop() || attrs.class,
      text: decodeXml(attrs.text || ""),
      resourceId: attrs["resource-id"] || "",
      contentDesc: decodeXml(attrs["content-desc"] || ""),
      bounds: [x1, y1, x2, y2],
      center: [Math.floor((x1 + x2) / 2), Math.floor((y1 + y2) / 2)],
      clickable: attrs.clickable === "true",
      enabled: attrs.enabled === "true",
      focusable: attrs.focusable === "true",
      scrollable: attrs.scrollable === "true",
    };
    elements.push(el);
  }

  const significant = elements.filter(isSignificant);
  return significant.slice(0, maxElements);
}

export function cleanJsonElement(el: UiElement): Record<string, unknown> {
  const out: Record<string, unknown> = {
    index: el.index,
    class: el.class,
    bounds: el.bounds,
    center: el.center,
  };
  if (el.text) out.text = el.text;
  if (el.resourceId) out.resourceId = el.resourceId;
  if (el.contentDesc) out.contentDesc = el.contentDesc;
  if (el.clickable) out.clickable = true;
  if (el.enabled) out.enabled = true;
  if (el.focusable) out.focusable = true;
  if (el.scrollable) out.scrollable = true;
  return out;
}

function isSignificant(el: UiElement): boolean {
  if (el.text || el.contentDesc) return true;
  if (el.clickable || el.scrollable) return true;
  if (el.focusable) return true;
  if (el.resourceId && el.resourceId !== "android:id/widget_frame") return true;
  return false;
}

function decodeXml(s: string): string {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
