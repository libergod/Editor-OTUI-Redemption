// OTUI Widget types and data model

export type WidgetType =
  | 'UIWidget'
  | 'UIPanel'
  | 'UILabel'
  | 'UIButton'
  | 'UIImage'
  | 'UITextEdit'
  | 'UIProgressBar'
  | 'UIScrollArea'
  | 'UIMiniWindow'
  | 'UIHorizontalLayout'
  | 'UIVerticalLayout'
  | 'UIItem'
  | 'UICreature';

export interface WidgetTypeInfo {
  type: WidgetType;
  label: string;
  icon: string;
  defaultProps: Record<string, string>;
  category: 'container' | 'display' | 'input' | 'layout' | 'special';
}

export const WIDGET_TYPES: WidgetTypeInfo[] = [
  { type: 'UIWidget', label: 'Widget', icon: '□', defaultProps: { size: '100 100' }, category: 'container' },
  { type: 'UIPanel', label: 'Panel', icon: '▢', defaultProps: { size: '200 150' }, category: 'container' },
  { type: 'UIMiniWindow', label: 'Mini Window', icon: '▣', defaultProps: { size: '300 200', text: '"Window"' }, category: 'container' },
  { type: 'UIScrollArea', label: 'Scroll Area', icon: '▥', defaultProps: { size: '200 150' }, category: 'container' },
  { type: 'UILabel', label: 'Label', icon: 'T', defaultProps: { text: '"Label"' }, category: 'display' },
  { type: 'UIImage', label: 'Image', icon: '🖼', defaultProps: { size: '64 64', 'image-source': '""' }, category: 'display' },
  { type: 'UIProgressBar', label: 'Progress Bar', icon: '▰', defaultProps: { size: '200 16', percent: '50' }, category: 'display' },
  { type: 'UIButton', label: 'Button', icon: '⬜', defaultProps: { size: '120 30', text: '"Button"' }, category: 'input' },
  { type: 'UITextEdit', label: 'Text Edit', icon: '✎', defaultProps: { size: '200 24' }, category: 'input' },
  { type: 'UIHorizontalLayout', label: 'H Layout', icon: '↔', defaultProps: {}, category: 'layout' },
  { type: 'UIVerticalLayout', label: 'V Layout', icon: '↕', defaultProps: {}, category: 'layout' },
  { type: 'UIItem', label: 'Item', icon: '◈', defaultProps: { size: '32 32' }, category: 'special' },
  { type: 'UICreature', label: 'Creature', icon: '◉', defaultProps: { size: '64 64' }, category: 'special' },
];

export interface OTUIWidget {
  id: string;
  name: string;
  type: WidgetType;
  properties: Record<string, string>;
  children: OTUIWidget[];
  parentId: string | null;
}

export interface EditorState {
  rootWidgets: OTUIWidget[];
  selectedWidgetId: string | null;
  clipboard: OTUIWidget | null;
  history: HistoryEntry[];
  historyIndex: number;
}

export interface HistoryEntry {
  rootWidgets: OTUIWidget[];
  label: string;
}

export interface PropertyGroup {
  label: string;
  properties: PropertyDef[];
}

export interface PropertyDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'size' | 'color' | 'select' | 'anchor' | 'boolean';
  options?: string[];
}

export const PROPERTY_GROUPS: PropertyGroup[] = [
  {
    label: 'Identity',
    properties: [
      { key: 'id', label: 'ID', type: 'text' },
      { key: 'visible', label: 'Visible', type: 'boolean' },
      { key: 'enabled', label: 'Enabled', type: 'boolean' },
      { key: 'tooltip', label: 'Tooltip', type: 'text' },
    ],
  },
  {
    label: 'Layout',
    properties: [
      { key: 'size', label: 'Size', type: 'size' },
      { key: 'width', label: 'Width', type: 'number' },
      { key: 'height', label: 'Height', type: 'number' },
      { key: 'padding', label: 'Padding', type: 'text' },
      { key: 'margin-top', label: 'Margin Top', type: 'number' },
      { key: 'margin-bottom', label: 'Margin Bottom', type: 'number' },
      { key: 'margin-left', label: 'Margin Left', type: 'number' },
      { key: 'margin-right', label: 'Margin Right', type: 'number' },
    ],
  },
  {
    label: 'Anchors',
    properties: [
      { key: 'anchors.left', label: 'Left', type: 'anchor' },
      { key: 'anchors.right', label: 'Right', type: 'anchor' },
      { key: 'anchors.top', label: 'Top', type: 'anchor' },
      { key: 'anchors.bottom', label: 'Bottom', type: 'anchor' },
      { key: 'anchors.centerIn', label: 'Center In', type: 'anchor' },
      { key: 'anchors.fill', label: 'Fill', type: 'anchor' },
    ],
  },
  {
    label: 'Style',
    properties: [
      { key: 'background-color', label: 'Background', type: 'color' },
      { key: 'color', label: 'Text Color', type: 'color' },
      { key: 'opacity', label: 'Opacity', type: 'number' },
      { key: 'font', label: 'Font', type: 'text' },
      { key: 'text', label: 'Text', type: 'text' },
      { key: 'image-source', label: 'Image Source', type: 'text' },
      { key: 'border-width', label: 'Border Width', type: 'number' },
      { key: 'border-color', label: 'Border Color', type: 'color' },
    ],
  },
  {
    label: 'Events',
    properties: [
      { key: 'onClick', label: 'On Click', type: 'text' },
      { key: 'onHover', label: 'On Hover', type: 'text' },
    ],
  },
];

// Helper to generate unique IDs
let idCounter = 0;
export function generateWidgetId(): string {
  return `widget_${++idCounter}_${Date.now().toString(36)}`;
}

export function createWidget(name: string, type: WidgetType, parentId: string | null = null): OTUIWidget {
  const typeInfo = WIDGET_TYPES.find(t => t.type === type);
  return {
    id: generateWidgetId(),
    name,
    type,
    properties: { ...(typeInfo?.defaultProps || {}) },
    children: [],
    parentId,
  };
}

export function findWidget(widgets: OTUIWidget[], id: string): OTUIWidget | null {
  for (const w of widgets) {
    if (w.id === id) return w;
    const found = findWidget(w.children, id);
    if (found) return found;
  }
  return null;
}

export function removeWidget(widgets: OTUIWidget[], id: string): OTUIWidget[] {
  return widgets
    .filter(w => w.id !== id)
    .map(w => ({ ...w, children: removeWidget(w.children, id) }));
}

export function deepCloneWidget(widget: OTUIWidget, newParentId: string | null = null): OTUIWidget {
  const newId = generateWidgetId();
  return {
    ...widget,
    id: newId,
    name: widget.name + '_copy',
    parentId: newParentId,
    children: widget.children.map(c => deepCloneWidget(c, newId)),
  };
}
