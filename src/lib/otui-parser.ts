// OTUI Parser: Converts .otui text to OTUIWidget tree
// OTUI Serializer: Converts OTUIWidget tree to valid .otui text

import { OTUIWidget, WidgetType, generateWidgetId, WIDGET_TYPES } from './otui-types';

const KNOWN_TYPES = new Set(WIDGET_TYPES.map(w => w.type));

// Map of common widget names to their full types
const WIDGET_NAME_MAP: Record<string, WidgetType> = {
  // Containers
  'Panel': 'UIPanel',
  'Widget': 'UIWidget',
  'Window': 'UIMiniWindow',
  'MiniWindow': 'UIMiniWindow',
  'ScrollArea': 'UIScrollArea',
  'Scroll': 'UIScrollArea',
  'Separator': 'UISeparator',
  'Sep': 'UISeparator',
  'TabBar': 'UITabBar',
  'Tab': 'UITab',
  
  // Display
  'Label': 'UILabel',
  'Image': 'UIImage',
  'ProgressBar': 'UIProgressBar',
  'Progress': 'UIProgressBar',
  'List': 'UIList',
  'ListItem': 'UIListItem',
  'Item': 'UIListItem',
  
  // Input
  'Button': 'UIButton',
  'TextEdit': 'UITextEdit',
  'Text': 'UITextEdit',
  'Edit': 'UITextEdit',
  'CheckBox': 'UICheckBox',
  'Check': 'UICheckBox',
  'RadioButton': 'UIRadioButton',
  'Radio': 'UIRadioButton',
  'Slider': 'UISlider',
  'ComboBox': 'UIComboBox',
  'Combo': 'UIComboBox',
  'DropDown': 'UIDropDown',
  'Drop': 'UIDropDown',
  
  // Layout
  'HorizontalLayout': 'UIHorizontalLayout',
  'VLayout': 'UIVerticalLayout',
  'VerticalLayout': 'UIVerticalLayout',
  'HLayout': 'UIHorizontalLayout',
  
  // Game
  'GameItem': 'UIItem',
  'Creature': 'UICreature',
};

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
  // Format 1: WidgetName < WidgetType
  let match = line.match(/^(\w+)\s*<\s*(\w+)$/);
  if (match) {
    const name = match[1];
    let type = match[2];
    // Try direct type first, then check name map
    if (KNOWN_TYPES.has(type as WidgetType)) {
      return { name, type: type as WidgetType };
    }
    // Check if it's a short name
    if (WIDGET_NAME_MAP[type]) {
      return { name, type: WIDGET_NAME_MAP[type] };
    }
  }

  // Format 2: WidgetType WidgetName
  match = line.match(/^(\w+)\s+(\w+)$/);
  if (match) {
    const type = match[1];
    const name = match[2];
    // Try direct type first, then check name map
    if (KNOWN_TYPES.has(type as WidgetType)) {
      return { name, type: type as WidgetType };
    }
    // Check if it's a short name
    if (WIDGET_NAME_MAP[type]) {
      return { name, type: WIDGET_NAME_MAP[type] };
    }
  }

  // Format 3: WidgetName: WidgetType
  match = line.match(/^(\w+)\s*:\s*(\w+)$/);
  if (match) {
    const name = match[1];
    let type = match[2];
    // Try direct type first, then check name map
    if (KNOWN_TYPES.has(type as WidgetType)) {
      return { name, type: type as WidgetType };
    }
    // Check if it's a short name
    if (WIDGET_NAME_MAP[type]) {
      return { name, type: WIDGET_NAME_MAP[type] };
    }
  }

  // Format 4: WidgetName (implicitly assume WidgetName type)
  // Only if it's a single word and exists in widget name map
  match = line.match(/^(\w+)$/);
  if (match) {
    const name = match[1];
    // Check if the name itself is a known widget type
    if (WIDGET_NAME_MAP[name]) {
      return { name, type: WIDGET_NAME_MAP[name] };
    }
    // Or if it's already a known type
    if (KNOWN_TYPES.has(name as WidgetType)) {
      return { name, type: name as WidgetType };
    }
  }

  return null;
}

function isPropertyLine(line: string): { key: string; value: string } | null {
  // PRESERVE special prefixes: !text:, @onClick:, $hover:
  // These are critical OTCR features and must NOT be normalized

  // Format 1: key: value (standard, including !prefix:, @prefix:, $prefix:)
  let match = line.match(/^([!@$]?[\w\-.]+)\s*:\s*(.+)$/);
  if (match) {
    return { key: match[1], value: match[2].trim() };
  }

  // Format 2: key = value (Lua style)
  match = line.match(/^([!@$]?[\w\-.]+)\s*=\s*(.+)$/);
  if (match) {
    return { key: match[1], value: match[2].trim() };
  }

  return null;
}

function isLayoutBlockStart(line: string): boolean {
  return line.trim() === 'layout:';
}

function cleanValue(value: string): string {
  // Remove surrounding quotes (both " and ')
  value = value.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  // Clean up escaped quotes
  value = value.replace(/\\"/g, '"').replace(/\\'/g, "'");
  return value;
}

/**
 * Detects if a value is wrapped in tr() function
 * Returns { isTranslated: true, value: "extracted text" } if tr() is found
 * Returns { isTranslated: false, value: original } otherwise
 */
function parseTextValue(value: string): { value: string; isTranslated: boolean } {
  value = value.trim();
  
  // Check if value is tr('...') or tr("...")
  const trMatch = value.match(/^tr\(['"](.*)['\"]\)$/);
  if (trMatch) {
    return { value: trMatch[1], isTranslated: true };
  }
  
  // Otherwise it's literal text
  // Still clean quotes if it's a quoted string
  return { value: cleanValue(value), isTranslated: false };
}

export function parseOTUI(text: string): OTUIWidget[] {
  if (!text || text.trim().length === 0) {
    throw new Error('OTUI text is empty');
  }

  // Clean text: remove comments and prepare lines
  let cleanText = text
    // Remove -- style Lua comments and // style comments
    .split('\n')
    .map(l => {
      // Remove -- comments
      let idx = l.indexOf('--');
      if (idx >= 0) l = l.substring(0, idx);
      // Remove // comments
      idx = l.indexOf('//');
      if (idx >= 0) l = l.substring(0, idx);
      return l;
    })
    .join('\n');

  const lines: ParsedLine[] = cleanText.split('\n').map((raw, i) => ({
    indent: getIndent(raw),
    raw,
    trimmed: raw.trim(),
    lineNum: i + 1,
  }))
  .filter(l => {
    // Filter out empty lines and non-code elements
    return l.trimmed.length > 0 &&
           l.trimmed !== '{' &&
           l.trimmed !== '}' &&
           l.trimmed !== ',';
  });

  if (lines.length === 0) {
    throw new Error('No valid widget declarations found. Use format: Label, Button < UIButton, Label: UILabel, etc.');
  }

  const rootWidgets: OTUIWidget[] = [];
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
        // Root level widget
        rootWidgets.push(widget);
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
          currentWidget.properties[`layout.${prop.key}`] = cleanValue(prop.value);
        }
        i++;
      }
    } else {
      const prop = isPropertyLine(line.trimmed);
      
      // Check if this is an inline event handler (@onClick: |)
      if (prop && prop.key.startsWith('@') && prop.value.trim() === '|') {
        // Inline Lua event - collect all indented lines
        const currentWidget = stack.length > 0 ? stack[stack.length - 1].widget : null;
        const eventName = prop.key;
        const eventLines: string[] = ['|'];
        i++;
        
        // Collect all lines that are more indented than the event declaration
        while (i < lines.length && lines[i].indent > line.indent) {
          eventLines.push(lines[i].raw.trimEnd());
          i++;
        }
        
        if (currentWidget) {
          // Store the complete multi-line event as-is
          currentWidget.properties[eventName] = eventLines.join('\n');
        }
      }
      // Check if this is a state block ($hover:, $pressed:, etc.)
      else if (prop && prop.key.startsWith('$') && prop.value.trim() === '') {
        // State block with indented properties
        const currentWidget = stack.length > 0 ? stack[stack.length - 1].widget : null;
        const stateName = prop.key;
        i++;
        while (i < lines.length && lines[i].indent > line.indent) {
          const stateProp = isPropertyLine(lines[i].trimmed);
          if (stateProp && currentWidget) {
            // Store state properties as: $hover.background-color, $pressed.color, etc.
            currentWidget.properties[`${stateName}.${stateProp.key}`] = cleanValue(stateProp.value);
          }
          i++;
        }
      } else if (prop && stack.length > 0) {
        const currentWidget = stack[stack.length - 1].widget;
        // Make sure property belongs to the right widget based on indent
        while (stack.length > 1 && stack[stack.length - 1].indent >= line.indent) {
          stack.pop();
        }
        const target = stack[stack.length - 1].widget;
        
        // Special handling for 'text' and '!text' properties: detect tr() and set metadata
        const textKey = prop.key.replace(/^!/, ''); // Remove ! prefix for internal storage
        if (textKey === 'text') {
          const parsed = parseTextValue(prop.value);
          
          // Store the actual text without prefix
          target.properties['text'] = parsed.value;
          
          // Mark if it uses !text: directive or tr()
          if (prop.key.startsWith('!') || parsed.isTranslated) {
            target.properties['__i18n.text'] = 'true';
          }
        } else {
          target.properties[prop.key] = cleanValue(prop.value);
        }
      } else if (line.trimmed && !prop && line.trimmed !== 'layout:' && !line.trimmed.startsWith('$')) {
        // Invalid line - skip but could warn
        console.warn(`Line ${line.lineNum}: Could not parse "${line.trimmed}"`);
      }
      i++;
    }
  }

  if (rootWidgets.length === 0) {
    throw new Error('No root-level widgets found. Start with a widget like: MyPanel < UIPanel or simply Label');
  }

  // If multiple root widgets, wrap in a virtual root container
  if (rootWidgets.length > 1) {
    const virtualRoot: OTUIWidget = {
      id: '__virtual_root__',
      name: '__VirtualRoot',
      type: 'UIWidget',
      properties: { visible: 'false' },
      children: rootWidgets,
      parentId: null,
    };
    rootWidgets.forEach(w => w.parentId = virtualRoot.id);
    return [virtualRoot];
  }

  return rootWidgets;
}

export function serializeOTUI(widgets: OTUIWidget[], indent: number = 0): string {
  const lines: string[] = [];
  const prefix = '  '.repeat(indent);

  // Handle virtual root - skip serializing it, export only its children
  if (widgets.length === 1 && widgets[0].id === '__virtual_root__') {
    const virtualRoot = widgets[0];
    return serializeOTUI(virtualRoot.children, indent);
  }

  for (const widget of widgets) {
    lines.push(`${prefix}${widget.name} < ${widget.type}`);

    // Separate properties by category
    const layoutProps: Record<string, string> = {};
    const stateProps: Record<string, Record<string, string>> = {}; // $hover: { color: red, ... }
    const regularProps: Record<string, string> = {};
    const eventProps: Record<string, string> = {}; // @onClick:, @onEscape:, etc.

    for (const [key, value] of Object.entries(widget.properties)) {
      if (key.startsWith('layout.')) {
        layoutProps[key.replace('layout.', '')] = value;
      } else if (key.startsWith('$')) {
        // State property: $hover.background-color -> stateProps['$hover']['background-color']
        const dotIndex = key.indexOf('.');
        if (dotIndex > 0) {
          const stateName = key.substring(0, dotIndex);
          const propName = key.substring(dotIndex + 1);
          if (!stateProps[stateName]) {
            stateProps[stateName] = {};
          }
          stateProps[stateName][propName] = value;
        }
      } else if (key.startsWith('@')) {
        // Event handler: @onClick:, @onEscape:, etc.
        eventProps[key] = value;
      } else {
        regularProps[key] = value;
      }
    }

    // Check if widget has anchors defined
    const hasAnchors = Object.keys(regularProps).some(k => k.startsWith('anchors.'));

    // Auto-generate id property (use widget name in lowercase)
    const autoId = widget.name.charAt(0).toLowerCase() + widget.name.slice(1);
    
    // Define property order for professional output
    const propertyOrder = [
      'id',
      'size', 'width', 'height',
      'minimum', 'maximum', 'value', 'percent',
      'text', 'image-source', 'color',
      'background-color', 'background', 'border-width', 'border-color',
      'padding', 'opacity',
      'anchors.fill', 'anchors.centerIn',
      'anchors.left', 'anchors.right', 'anchors.top', 'anchors.bottom',
      'anchors.horizontalCenter', 'anchors.verticalCenter',
      'margin-left', 'margin-right', 'margin-top', 'margin-bottom',
      'x', 'y', 'position'
    ];

    // Prepare properties to write
    const propsToWrite: Array<[string, string]> = [];

    // Add auto-generated id
    if (widget.id !== '__virtual_root__' && !regularProps['id']) {
      propsToWrite.push(['id', autoId]);
    }

    // Process properties in order
    for (const key of propertyOrder) {
      const value = regularProps[key];
      if (value !== '' && value !== undefined && widget.id !== '__virtual_root__') {
        // Skip metadata keys
        if (key.startsWith('__')) continue;

        // Skip x/y if anchors are defined
        if ((key === 'x' || key === 'y') && hasAnchors) continue;

        // Skip zero margins
        if ((key === 'margin-left' || key === 'margin-right' || key === 'margin-top' || key === 'margin-bottom') && value === '0') continue;

        propsToWrite.push([key, value]);
      }
    }

    // Add any remaining properties not in the order list
    for (const [key, value] of Object.entries(regularProps)) {
      if (!propertyOrder.includes(key) && value !== '' && value !== undefined && widget.id !== '__virtual_root__') {
        if (key.startsWith('__')) continue;
        if ((key === 'x' || key === 'y') && hasAnchors) continue;
        if ((key === 'margin-left' || key === 'margin-right' || key === 'margin-top' || key === 'margin-bottom') && value === '0') continue;
        
        // Skip if already added
        if (!propsToWrite.find(([k]) => k === key)) {
          propsToWrite.push([key, value]);
        }
      }
    }

    // Special handling for UIProgressBar: convert percent to value/minimum/maximum
    if (widget.type === 'UIProgressBar') {
      const hasPropValue = propsToWrite.find(([k]) => k === 'value');
      const hasPropPercent = propsToWrite.find(([k]) => k === 'percent');
      
      if (!hasPropValue && hasPropPercent) {
        // Remove percent and add value/minimum/maximum
        const percentIndex = propsToWrite.findIndex(([k]) => k === 'percent');
        const percentValue = propsToWrite[percentIndex][1];
        propsToWrite.splice(percentIndex, 1);
        
        // Add in proper order
        const sizeIndex = propsToWrite.findIndex(([k]) => k === 'size' || k === 'width' || k === 'height');
        const insertIndex = sizeIndex >= 0 ? sizeIndex + 1 : 0;
        propsToWrite.splice(insertIndex, 0, ['minimum', '0']);
        propsToWrite.splice(insertIndex + 1, 0, ['maximum', '100']);
        propsToWrite.splice(insertIndex + 2, 0, ['value', percentValue]);
      }
    }

    // Auto-add border-width when border-color exists
    const hasBorderColor = propsToWrite.find(([k]) => k === 'border-color');
    const hasBorderWidth = propsToWrite.find(([k]) => k === 'border-width');
    if (hasBorderColor && !hasBorderWidth) {
      const borderColorIndex = propsToWrite.findIndex(([k]) => k === 'border-color');
      propsToWrite.splice(borderColorIndex, 0, ['border-width', '1']);
    }

    // Write regular properties
    for (const [key, value] of propsToWrite) {
      // Special handling for 'text' property with tr() and !text: directive
      if (key === 'text') {
        const raw = (value ?? '').toString();
        const sanitized = raw.replace(/^['\"]+|['\"]+$/g, '');
        const useDirective = regularProps['__i18n.text'] === 'true';

        if (useDirective) {
          // Translatable text: use !text: tr('...') directive
          const escaped = sanitized.replace(/'/g, "\\'");
          lines.push(`${prefix}  !text: tr('${escaped}')`);
        } else {
          // Literal text: wrap in double quotes and escape internal double quotes
          const escaped = sanitized.replace(/"/g, '\\\"');
          lines.push(`${prefix}  ${key}: "${escaped}"`);
        }
      } else {
        lines.push(`${prefix}  ${key}: ${value}`);
      }
    }

    // Write event handlers (@onClick:, @onEscape:, etc.)
    for (const [eventKey, handler] of Object.entries(eventProps)) {
      lines.push(`${prefix}  ${eventKey}: ${handler}`);
    }

    // Write layout block
    if (Object.keys(layoutProps).length > 0 && widget.id !== '__virtual_root__') {
      lines.push(`${prefix}  layout:`);
      for (const [key, value] of Object.entries(layoutProps)) {
        lines.push(`${prefix}    ${key}: ${value}`);
      }
    }

    // Write state blocks ($hover:, $pressed:, etc.)
    for (const [stateName, stateProperties] of Object.entries(stateProps)) {
      if (Object.keys(stateProperties).length > 0 && widget.id !== '__virtual_root__') {
        lines.push(`${prefix}  ${stateName}:`);
        for (const [key, value] of Object.entries(stateProperties)) {
          lines.push(`${prefix}    ${key}: ${value}`);
        }
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

export interface I18nWarning {
  widgetId: string;
  widgetName: string;
  widgetType: string;
  message: string;
}

/**
 * Validates i18n usage and returns warnings for UI widgets with non-translated text
 */
export function validateI18nUsage(widgets: OTUIWidget[]): I18nWarning[] {
  const warnings: I18nWarning[] = [];
  const UI_WIDGETS = new Set(['UILabel', 'UIButton', 'UITextEdit', 'UIComboBox', 'UIDropDown', 'UITab', 'UIListItem']);

  function traverse(widget: OTUIWidget) {
    // Check if this is a UI widget with text
    if (UI_WIDGETS.has(widget.type) && widget.properties.text) {
      const isTranslated = widget.properties['__i18n.text'] === 'true';
      
      if (!isTranslated) {
        warnings.push({
          widgetId: widget.id,
          widgetName: widget.name,
          widgetType: widget.type,
          message: `UI widget "${widget.name}" uses non-translated text. Consider wrapping in tr() for better i18n support.`,
        });
      }
    }

    // Recursively check children
    for (const child of widget.children) {
      traverse(child);
    }
  }

  for (const widget of widgets) {
    traverse(widget);
  }

  return warnings;
}

// Sample OTUI for initial editor state
export const SAMPLE_OTUI = `EditorWindow < UIMiniWindow
  size: 800 600
  text: Sample Window

  MainPanel < UIPanel
    size: 780 580
    background-color: #1a1a1a

    Header < UIPanel
      size: 780 30
      background-color: #2a2a2a

      Title < UILabel
        text: Hello OTUI
        color: #ffffff

    ConfirmBtn < UIButton
      size: 120 30
      text: Confirm
      background-color: #3a5a7f
      color: #ffffff`;
