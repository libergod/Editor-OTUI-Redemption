// OTUI Parser: Converts .otui text to OTUIWidget tree
// OTUI Serializer: Converts OTUIWidget tree to valid .otui text

import { OTUIWidget, WidgetType, generateWidgetId, WIDGET_TYPES } from './otui-types';

const KNOWN_TYPES = new Set(WIDGET_TYPES.map(w => w.type));

interface ParsedLine {
  indent: number;
  raw: string;
  trimmed: string;
  lineNum: number;
}

function getIndent(line: string): number {
  let count = 0;
  for (const ch of line) {
    if (ch === ' ') count++;
    else if (ch === '\t') count += 2;
    else break;
  }
  return count;
}

function isWidgetDeclaration(line: string): { name: string; type: WidgetType } | null {
  const match = line.match(/^(\w+)\s*<\s*(\w+)$/);
  if (match) {
    const name = match[1];
    const type = match[2] as WidgetType;
    return { name, type };
  }
  return null;
}

function isPropertyLine(line: string): { key: string; value: string } | null {
  const match = line.match(/^([\w\-.]+):\s*(.+)$/);
  if (match) {
    return { key: match[1], value: match[2].trim() };
  }
  return null;
}

function isLayoutBlockStart(line: string): boolean {
  return line.trim() === 'layout:';
}

export function parseOTUI(text: string): OTUIWidget[] {
  const lines: ParsedLine[] = text.split('\n').map((raw, i) => ({
    indent: getIndent(raw),
    raw,
    trimmed: raw.trim(),
    lineNum: i + 1,
  })).filter(l => l.trimmed.length > 0 && !l.trimmed.startsWith('//'));

  const result: OTUIWidget[] = [];
  const stack: { widget: OTUIWidget; indent: number }[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const decl = isWidgetDeclaration(line.trimmed);

    if (decl) {
      const widget: OTUIWidget = {
        id: generateWidgetId(),
        name: decl.name,
        type: decl.type,
        properties: {},
        children: [],
        parentId: null,
      };

      // Find parent based on indentation
      while (stack.length > 0 && stack[stack.length - 1].indent >= line.indent) {
        stack.pop();
      }

      if (stack.length > 0) {
        const parent = stack[stack.length - 1].widget;
        widget.parentId = parent.id;
        parent.children.push(widget);
      } else {
        result.push(widget);
      }

      stack.push({ widget, indent: line.indent });
      i++;
    } else if (isLayoutBlockStart(line.trimmed)) {
      // Parse layout block - collect indented properties under it
      const currentWidget = stack.length > 0 ? stack[stack.length - 1].widget : null;
      i++;
      while (i < lines.length && lines[i].indent > line.indent) {
        const prop = isPropertyLine(lines[i].trimmed);
        if (prop && currentWidget) {
          currentWidget.properties[`layout.${prop.key}`] = prop.value;
        }
        i++;
      }
    } else {
      const prop = isPropertyLine(line.trimmed);
      if (prop && stack.length > 0) {
        const currentWidget = stack[stack.length - 1].widget;
        // Make sure property belongs to the right widget based on indent
        while (stack.length > 1 && stack[stack.length - 1].indent >= line.indent) {
          stack.pop();
        }
        const target = stack[stack.length - 1].widget;
        target.properties[prop.key] = prop.value;
      }
      i++;
    }
  }

  return result;
}

export function serializeOTUI(widgets: OTUIWidget[], indent: number = 0): string {
  const lines: string[] = [];
  const prefix = '  '.repeat(indent);

  for (const widget of widgets) {
    lines.push(`${prefix}${widget.name} < ${widget.type}`);

    // Separate layout properties from regular ones
    const layoutProps: Record<string, string> = {};
    const regularProps: Record<string, string> = {};

    for (const [key, value] of Object.entries(widget.properties)) {
      if (key.startsWith('layout.')) {
        layoutProps[key.replace('layout.', '')] = value;
      } else {
        regularProps[key] = value;
      }
    }

    // Write regular properties
    for (const [key, value] of Object.entries(regularProps)) {
      if (value !== '' && value !== undefined) {
        lines.push(`${prefix}  ${key}: ${value}`);
      }
    }

    // Write layout block
    if (Object.keys(layoutProps).length > 0) {
      lines.push(`${prefix}  layout:`);
      for (const [key, value] of Object.entries(layoutProps)) {
        lines.push(`${prefix}    ${key}: ${value}`);
      }
    }

    // Write children
    if (widget.children.length > 0) {
      lines.push('');
      lines.push(serializeOTUI(widget.children, indent + 1));
    }

    lines.push('');
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Sample OTUI for initial editor state
export const SAMPLE_OTUI = `EditorWindow < UIMiniWindow
  size: 800 600
  text: "Sample Window"

  MainPanel < UIPanel
    anchors.fill: parent
    padding: 5

    Header < UIPanel
      height: 30
      anchors.left: parent.left
      anchors.right: parent.right
      anchors.top: parent.top

      Title < UILabel
        text: "Hello OTUI"
        anchors.centerIn: parent

    Content < UIPanel
      anchors.top: Header.bottom
      anchors.left: parent.left
      anchors.right: parent.right
      anchors.bottom: parent.bottom

      ConfirmBtn < UIButton
        size: 120 30
        text: "Confirm"
        anchors.centerIn: parent`;
