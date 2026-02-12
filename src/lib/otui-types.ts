// OTUI Widget types and data model (OTClient Redemption Standard)

export type WidgetType =
  // Base
  | 'UIWidget'
  // Containers
  | 'UIPanel'
  | 'UIMiniWindow'
  | 'MiniWindow'
  | 'MiniWindowContents'
  | 'UIScrollArea'
  | 'UIScrollBar'
  | 'UIScrollPanel'
  // Text
  | 'UILabel'
  | 'Label'
  | 'UITextEdit'
  | 'TextEdit'
  // Buttons
  | 'UIButton'
  | 'Button'
  | 'UICheckBox'
  | 'CheckBox'
  | 'UIRadioGroup'
  // Images
  | 'UIImage'
  | 'UIItem'
  | 'UICreature'
  // Bars
  | 'UIProgressBar'
  // Game
  | 'UIGameMap'
  // Layout (deprecated, use layout property)
  | 'UIHorizontalLayout'
  | 'UIVerticalLayout'
  // Legacy support
  | 'UISeparator'
  | 'UITabBar'
  | 'UITab'
  | 'UIList'
  | 'UIListItem'
  | 'UIRadioButton'
  | 'UISlider'
  | 'UIComboBox'
  | 'UIDropDown';

export interface WidgetTypeInfo {
  type: WidgetType;
  label: string;
  icon: string;
  defaultProps: Record<string, string>;
  category: 'container' | 'display' | 'input' | 'layout' | 'game';
  description?: string;
}

export const WIDGET_TYPES: WidgetTypeInfo[] = [
  // Containers
  { type: 'UIWidget', label: 'Widget', icon: '□', defaultProps: { size: '100 100', 'background-color': '#1a1a1a', padding: '4' }, category: 'container', description: 'widget.UIWidget.desc' },
  { type: 'UIPanel', label: 'Panel', icon: '▢', defaultProps: { size: '200 150', 'background-color': '#2a2a2a', padding: '8', 'border-color': '#444' }, category: 'container', description: 'widget.UIPanel.desc' },
  { type: 'UIMiniWindow', label: 'Mini Window', icon: '▣', defaultProps: { size: '300 200', text: '"Window"', 'background-color': '#2a2a2a', padding: '6', 'border-color': '#555' }, category: 'container', description: 'widget.UIMiniWindow.desc' },
  { type: 'MiniWindow', label: 'MiniWindow', icon: '▣', defaultProps: { size: '300 200', text: '"Window"', 'background-color': '#2a2a2a' }, category: 'container', description: 'widget.UIMiniWindow.desc' },
  { type: 'MiniWindowContents', label: 'MiniWindow Contents', icon: '▤', defaultProps: { 'anchors.fill': 'parent', padding: '6' }, category: 'container', description: 'widget.UIMiniWindow.desc' },
  { type: 'UIScrollArea', label: 'Scroll Area', icon: '▥', defaultProps: { size: '200 150', 'background-color': '#1a1a1a', 'border-color': '#444' }, category: 'container', description: 'widget.UIScrollArea.desc' },
  { type: 'UIScrollPanel', label: 'Scroll Panel', icon: '▥', defaultProps: { size: '200 150', 'background-color': '#1a1a1a', 'border-color': '#444' }, category: 'container', description: 'widget.UIScrollArea.desc' },
  { type: 'UIScrollBar', label: 'Scroll Bar', icon: '▮', defaultProps: { size: '12 100', 'background-color': '#2a2a2a', 'border-color': '#444' }, category: 'container', description: 'widget.UIScrollArea.desc' },
  { type: 'UISeparator', label: 'Separator', icon: '─', defaultProps: { size: '200 2', 'background-color': '#444' }, category: 'container', description: 'widget.UISeparator.desc' },
  { type: 'UITabBar', label: 'Tab Bar', icon: '◰', defaultProps: { size: '300 24', 'background-color': '#2a2a2a', 'border-color': '#444' }, category: 'container', description: 'widget.UITabBar.desc' },
  { type: 'UITab', label: 'Tab', icon: '◲', defaultProps: { size: '100 20', text: '"Tab"', 'background-color': '#3a3a3a' }, category: 'container', description: 'widget.UITab.desc' },
  
  // Display
  { type: 'UILabel', label: 'UILabel', icon: 'T', defaultProps: { text: '"Label"', color: '#ccc' }, category: 'display', description: 'widget.UILabel.desc' },
  { type: 'Label', label: 'Label', icon: 'T', defaultProps: { text: '"Label"', color: '#ccc' }, category: 'display', description: 'widget.UILabel.desc' },
  { type: 'UIImage', label: 'Image', icon: '🖼', defaultProps: { size: '64 64', 'image-source': '"icons/image.png"', 'background-color': '#1a1a1a', 'border-color': '#444' }, category: 'display', description: 'widget.UIImage.desc' },
  { type: 'UIProgressBar', label: 'Progress Bar', icon: '▰', defaultProps: { size: '200 16', value: '50', minimum: '0', maximum: '100', 'background-color': '#2a2a2a', 'border-color': '#444' }, category: 'display', description: 'widget.UIProgressBar.desc' },
  { type: 'UIList', label: 'List', icon: '≡', defaultProps: { size: '200 150', 'background-color': '#1a1a1a', 'border-color': '#444', padding: '4' }, category: 'display', description: 'widget.UIList.desc' },
  { type: 'UIListItem', label: 'List Item', icon: '⋯', defaultProps: { size: '200 24', text: '"Item"', 'background-color': '#2a2a2a', color: '#ccc', padding: '4' }, category: 'display', description: 'widget.UIListItem.desc' },
  
  // Input
  { type: 'UIButton', label: 'UIButton', icon: '⬜', defaultProps: { size: '120 30', text: '"Button"', 'background-color': '#3a5a7f', color: '#fff', 'border-color': '#5a7a9f' }, category: 'input', description: 'widget.UIButton.desc' },
  { type: 'Button', label: 'Button', icon: '⬜', defaultProps: { size: '120 30', text: '"Button"', 'background-color': '#3a5a7f', color: '#fff' }, category: 'input', description: 'widget.UIButton.desc' },
  { type: 'UITextEdit', label: 'UITextEdit', icon: '✎', defaultProps: { size: '200 24', 'background-color': '#1a1a1a', color: '#ccc', 'border-color': '#444' }, category: 'input', description: 'widget.UITextEdit.desc' },
  { type: 'TextEdit', label: 'TextEdit', icon: '✎', defaultProps: { size: '200 24', 'background-color': '#1a1a1a', color: '#ccc' }, category: 'input', description: 'widget.UITextEdit.desc' },
  { type: 'UICheckBox', label: 'UICheckBox', icon: '☑', defaultProps: { size: '24 24', 'background-color': '#2a2a2a', 'border-color': '#444' }, category: 'input', description: 'widget.UICheckBox.desc' },
  { type: 'CheckBox', label: 'CheckBox', icon: '☑', defaultProps: { size: '24 24', 'background-color': '#2a2a2a' }, category: 'input', description: 'widget.UICheckBox.desc' },
  { type: 'UIRadioGroup', label: 'Radio Group', icon: '◎', defaultProps: { size: '100 24', 'background-color': '#2a2a2a', 'border-color': '#444' }, category: 'input', description: 'widget.UIRadioButton.desc' },
  { type: 'UIRadioButton', label: 'Radio Button', icon: '◉', defaultProps: { size: '24 24', 'background-color': '#2a2a2a', 'border-color': '#444' }, category: 'input', description: 'widget.UIRadioButton.desc' },
  { type: 'UISlider', label: 'Slider', icon: '▬', defaultProps: { size: '200 24', value: '50', 'background-color': '#2a2a2a', 'border-color': '#444' }, category: 'input', description: 'widget.UISlider.desc' },
  { type: 'UIComboBox', label: 'Combo Box', icon: '▼', defaultProps: { size: '150 24', 'background-color': '#2a2a2a', color: '#ccc', 'border-color': '#444', text: '"Select..."' }, category: 'input', description: 'widget.UIComboBox.desc' },
  { type: 'UIDropDown', label: 'Drop Down', icon: '▾', defaultProps: { size: '150 24', 'background-color': '#2a2a2a', color: '#ccc', 'border-color': '#444', text: '"Options"' }, category: 'input', description: 'widget.UIDropDown.desc' },
  
  // Layout (deprecated - use layout property instead)
  { type: 'UIHorizontalLayout', label: 'H Layout', icon: '↔', defaultProps: {}, category: 'layout', description: 'widget.UIHorizontalLayout.desc' },
  { type: 'UIVerticalLayout', label: 'V Layout', icon: '↕', defaultProps: {}, category: 'layout', description: 'widget.UIVerticalLayout.desc' },
  
  // Game/Special
  { type: 'UIItem', label: 'Item Slot', icon: '◈', defaultProps: { size: '32 32', 'background-color': '#1a1a1a', 'border-color': '#4a7a2a' }, category: 'game', description: 'widget.UIItem.desc' },
  { type: 'UICreature', label: 'Creature', icon: '◉', defaultProps: { size: '64 64', 'background-color': '#1a1a1a', 'border-color': '#4a7a2a' }, category: 'game', description: 'widget.UICreature.desc' },
  { type: 'UIGameMap', label: 'Game Map', icon: '🗺', defaultProps: { size: '352 352', 'background-color': '#000' }, category: 'game', description: 'Game Map Widget' },
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
  selectedWidgetIds: string[];
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
  desc?: string;
}

export const PROPERTY_GROUPS: PropertyGroup[] = [
  {
    label: 'Identity',
    properties: [
      { key: 'id', label: 'ID', type: 'text' },
      { key: 'visible', label: 'Visible', type: 'boolean', desc: 'prop.visible' },
      { key: 'enabled', label: 'Enabled', type: 'boolean', desc: 'prop.enabled' },
      { key: 'tooltip', label: 'Tooltip', type: 'text', desc: 'prop.tooltip' },
    ],
  },
  {
    label: 'Layout',
    properties: [
      { key: 'size', label: 'Size', type: 'size', desc: 'prop.size' },
      { key: 'x', label: 'X', type: 'number', desc: 'prop.x' },
      { key: 'y', label: 'Y', type: 'number', desc: 'prop.y' },
      { key: 'width', label: 'Width', type: 'number', desc: 'prop.width' },
      { key: 'height', label: 'Height', type: 'number', desc: 'prop.height' },
      { key: 'padding', label: 'Padding', type: 'text', desc: 'prop.padding' },
      { key: 'margin-top', label: 'Margin Top', type: 'number', desc: 'prop.marginTop' },
      { key: 'margin-bottom', label: 'Margin Bottom', type: 'number', desc: 'prop.marginBottom' },
      { key: 'margin-left', label: 'Margin Left', type: 'number', desc: 'prop.marginLeft' },
      { key: 'margin-right', label: 'Margin Right', type: 'number', desc: 'prop.marginRight' },
    ],
  },
  {
    label: 'Anchors',
    properties: [
      { key: 'anchors.left', label: 'Left', type: 'anchor', desc: 'prop.anchors.left' },
      { key: 'anchors.right', label: 'Right', type: 'anchor', desc: 'prop.anchors.right' },
      { key: 'anchors.top', label: 'Top', type: 'anchor', desc: 'prop.anchors.top' },
      { key: 'anchors.bottom', label: 'Bottom', type: 'anchor', desc: 'prop.anchors.bottom' },
      { key: 'anchors.centerIn', label: 'Center In', type: 'anchor', desc: 'prop.anchors.centerIn' },
      { key: 'anchors.fill', label: 'Fill', type: 'anchor', desc: 'prop.anchors.fill' },
      { key: 'anchors.leftTop', label: 'Left Top', type: 'anchor', desc: 'prop.anchors.leftTop' },
      { key: 'anchors.rightBottom', label: 'Right Bottom', type: 'anchor', desc: 'prop.anchors.rightBottom' },
      { key: 'anchors.horizontalCenter', label: 'Horizontal Center', type: 'anchor', desc: 'prop.anchors.horizontalCenter' },
      { key: 'anchors.verticalCenter', label: 'Vertical Center', type: 'anchor', desc: 'prop.anchors.verticalCenter' },
    ],
  },
  {
    label: 'Style',
    properties: [
      { key: 'background-color', label: 'Background', type: 'color', desc: 'prop.backgroundColor' },
      { key: 'color', label: 'Text Color', type: 'color', desc: 'prop.color' },
      { key: 'opacity', label: 'Opacity', type: 'number', desc: 'prop.opacity' },
      { key: 'font', label: 'Font', type: 'text', desc: 'prop.font' },
      { key: 'text', label: 'Text', type: 'text', desc: 'prop.text' },
      { key: 'image-source', label: 'Image Source', type: 'text', desc: 'prop.imageSource' },
      { key: 'border-width', label: 'Border Width', type: 'number', desc: 'prop.borderWidth' },
      { key: 'border-color', label: 'Border Color', type: 'color', desc: 'prop.borderColor' },
    ],
  },
  {
    label: 'Events',
    properties: [
      { key: 'onClick', label: 'On Click', type: 'text', desc: 'prop.onClick' },
      { key: 'onHover', label: 'On Hover', type: 'text', desc: 'prop.onHover' },
      { key: 'onMouseDown', label: 'On Mouse Down', type: 'text', desc: 'prop.onMouseDown' },
      { key: 'onMouseUp', label: 'On Mouse Up', type: 'text', desc: 'prop.onMouseUp' },
      { key: 'onDrag', label: 'On Drag', type: 'text', desc: 'prop.onDrag' },
      { key: 'onDrop', label: 'On Drop', type: 'text', desc: 'prop.onDrop' },
      { key: 'onEnter', label: 'On Enter', type: 'text', desc: 'prop.onEnter' },
      { key: 'onLeave', label: 'On Leave', type: 'text', desc: 'prop.onLeave' },
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
