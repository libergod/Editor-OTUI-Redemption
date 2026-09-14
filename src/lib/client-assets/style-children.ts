// Expands the child widgets that an OTClient style declares.
//
// Styles like `MiniWindow` do not just set properties: they declare a whole
// sub-tree (header, bevels, close/minimize buttons, contents panel). OTClient
// instantiates those children whenever the style is used, and a module's own
// declarations MERGE into them by `id` rather than creating duplicates.
//
// The expansion is render-time only: synthetic children are derived from the
// stylesheets and never enter EditorState.rootWidgets.

import type { OTUIWidget, WidgetType } from '@/lib/otui-types';
import type { StyleNode } from './style-parser';
import type { StyleRegistry } from './style-registry';
import { getStyleName } from './otui-css';
import { getMockChildren } from './mock-data';
import { WIDGET_TYPES } from '@/lib/otui-types';

/** Marks widgets produced from a stylesheet rather than the edited document. */
export const SYNTHETIC_FLAG = '__synthetic';

export function isSynthetic(widget: OTUIWidget): boolean {
  return widget.properties[SYNTHETIC_FLAG] === 'true';
}

const NATIVE_TYPES = new Set<string>(WIDGET_TYPES.map((widget) => widget.type));
const NATIVE_ALIASES: Partial<Record<string, WidgetType>> = {
  Widget: 'UIWidget',
  Panel: 'UIPanel',
  Window: 'UIMiniWindow',
  MainWindow: 'UIMiniWindow',
  MiniWindow: 'UIMiniWindow',
  Label: 'UILabel',
  Button: 'UIButton',
  CheckBox: 'UICheckBox',
  TextEdit: 'UITextEdit',
  ProgressBar: 'UIProgressBar',
  ScrollablePanel: 'UIScrollArea',
  MiniWindowContents: 'UIScrollArea',
};

function styleNodeType(node: StyleNode, registry: StyleRegistry): WidgetType {
  const styleName = node.base ?? node.name;
  const nativeBase = registry.resolve(styleName)?.nativeBase ?? styleName;
  if (NATIVE_ALIASES[nativeBase]) return NATIVE_ALIASES[nativeBase];
  if (NATIVE_TYPES.has(nativeBase)) return nativeBase as WidgetType;
  if (nativeBase === 'UIWindow') return 'UIMiniWindow';
  return 'UIWidget';
}

function styleNodeToWidget(node: StyleNode, id: string, parentId: string, registry: StyleRegistry): OTUIWidget {
  const properties: Record<string, string> = {
    ...node.properties,
    [SYNTHETIC_FLAG]: 'true',
  };
  // A nested declaration's base is the style it instantiates.
  if (node.base) properties.__style = node.base;

  for (const [selector, props] of Object.entries(node.states)) {
    for (const [key, value] of Object.entries(props)) {
      properties[`${selector}.${key}`] = value;
    }
  }

  return {
    id,
    name: node.name || node.base || 'UIWidget',
    type: styleNodeType(node, registry),
    properties,
    children: node.children.map((child, index) => styleNodeToWidget(child, `${id}.${index}`, id, registry)),
    parentId,
  };
}

/** Deep-merges an authored widget onto a style-provided one, authored wins. */
function mergeOnto(base: OTUIWidget, override: OTUIWidget): OTUIWidget {
  const merged: OTUIWidget = {
    ...override,
    properties: { ...base.properties, ...override.properties },
    children: [...base.children],
    parentId: base.parentId,
  };
  delete merged.properties[SYNTHETIC_FLAG];

  for (const child of override.children) {
    const childId = child.properties.id;
    const matchIndex = childId
      ? merged.children.findIndex((existing) => existing.properties.id === childId)
      : -1;
    if (matchIndex >= 0) merged.children[matchIndex] = mergeOnto(merged.children[matchIndex], child);
    else merged.children.push(child);
  }

  return merged;
}

const cache = new WeakMap<
  OTUIWidget,
  { registry: StyleRegistry | null; mock: boolean; children: OTUIWidget[] }
>();

/**
 * The children a widget actually renders: everything its style declares, with
 * the widget's own children merged in by `id`.
 *
 * `mock` additionally fills runtime-populated containers (lists) with preview
 * stand-in rows. It must be passed identically to the layout pass and the
 * renderer, otherwise boxes and elements drift apart.
 */
export function expandChildren(
  widget: OTUIWidget,
  registry: StyleRegistry | null,
  mock = false,
): OTUIWidget[] {
  const cached = cache.get(widget);
  if (cached && cached.registry === registry && cached.mock === mock) return cached.children;

  let children: OTUIWidget[];

  const styleChildren = registry?.resolve(getStyleName(widget))?.children ?? [];
  if (styleChildren.length === 0) {
    children = widget.children;
  } else {
    const expanded = styleChildren.map((node, index) =>
      styleNodeToWidget(node, `${widget.id}::style.${index}`, widget.id, registry!),
    );

    for (const child of widget.children) {
      const childId = child.properties.id;
      const matchIndex = childId
        ? expanded.findIndex((existing) => existing.properties.id === childId)
        : -1;
      if (matchIndex >= 0) expanded[matchIndex] = mergeOnto(expanded[matchIndex], child);
      else expanded.push(child);
    }
    children = expanded;
  }

  if (mock) children = getMockChildren(widget, widget.properties, registry, children);

  cache.set(widget, { registry, mock, children });
  return children;
}
