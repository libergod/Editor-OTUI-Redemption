// Geometric resolution of OTClient anchors.
//
// OTClient positions widgets by anchoring their edges to a parent edge or to a
// sibling's edge, then applying margins. The Client Preview previously
// approximated sibling anchors with margins only (see docs/CLIENT_PREVIEW.md,
// gap #1); this module resolves them for real so the preview matches the client.

import type { OTUIWidget } from '@/lib/otui-types';
import type { StyleRegistry } from './style-registry';
import type { LuaBindings } from './lua-bindings';
import { getStyleName, resolveEffectiveProperties } from './otui-css';
import { getMockProperties } from './mock-data';
import { expandChildren, isSynthetic } from './style-children';

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type LayoutMap = Map<string, Box>;

export interface LayoutOptions {
  /** Fill runtime-populated widgets with preview stand-in data. */
  mock?: boolean;
  /** Values the module's Lua assigns, used together with `mock`. */
  bindings?: LuaBindings | null;
}

interface PreviewContext {
  mock: boolean;
  bindings: LuaBindings | null;
}

type Axis = 'h' | 'v';

const MAX_PASSES = 8;

function num(value: string | undefined, fallback = 0): number {
  if (value === undefined) return fallback;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function explicitSize(props: Record<string, string>): { width?: number; height?: number } {
  const result: { width?: number; height?: number } = {};
  if (props.size) {
    const [w, h] = props.size.trim().split(/\s+/).map(Number);
    if (Number.isFinite(w)) result.width = w;
    if (Number.isFinite(h)) result.height = h;
  }
  if (props.width !== undefined) result.width = num(props.width, result.width ?? 0);
  if (props.height !== undefined) result.height = num(props.height, result.height ?? 0);
  return result;
}

/** Effective properties, optionally topped up with preview mock data. */
function previewProperties(
  widget: OTUIWidget,
  registry: StyleRegistry | null,
  preview: PreviewContext,
  index = 0,
): Record<string, string> {
  const props = resolveEffectiveProperties(widget, registry);
  if (!preview.mock) return props;
  return { ...getMockProperties(widget, props, registry, index, preview.bindings), ...props };
}

function contentBox(box: Box, props: Record<string, string>): Box {
  const padding = props.padding ? num(props.padding) : 0;
  const left = num(props['padding-left'], padding);
  const top = num(props['padding-top'], padding);
  const right = num(props['padding-right'], padding);
  const bottom = num(props['padding-bottom'], padding);
  return {
    left,
    top,
    width: Math.max(0, box.width - left - right),
    height: Math.max(0, box.height - top - bottom),
  };
}

function applyManagedLayout(
  children: OTUIWidget[],
  parentBox: Box,
  parentProps: Record<string, string>,
  registry: StyleRegistry | null,
  boxes: LayoutMap,
  preview: PreviewContext,
): boolean {
  const type = parentProps['layout.type'];
  if (!['vertical', 'verticalBox', 'horizontal', 'horizontalBox', 'grid'].includes(type)) return false;

  const spacing = num(parentProps['layout.spacing']);
  if (type === 'grid') {
    const [cellWidth = 0, cellHeight = 0] = (parentProps['layout.cell-size'] ?? '').split(/\s+/).map(Number);
    if (!(cellWidth > 0 && cellHeight > 0)) return false;
    const cellSpacing = num(parentProps['layout.cell-spacing'], spacing);
    const configuredColumns = num(parentProps['layout.num-columns']);
    const columns = configuredColumns > 0
      ? configuredColumns
      : Math.max(1, Math.floor((parentBox.width + cellSpacing) / (cellWidth + cellSpacing)));
    children.forEach((child, index) => {
      const props = previewProperties(child, registry, preview, index);
      const size = explicitSize(props);
      const column = index % columns;
      const row = Math.floor(index / columns);
      boxes.set(child.id, {
        left: parentBox.left + column * (cellWidth + cellSpacing) + num(props['margin-left'], num(props.margin)),
        top: parentBox.top + row * (cellHeight + cellSpacing) + num(props['margin-top'], num(props.margin)),
        width: size.width ?? cellWidth,
        height: size.height ?? cellHeight,
      });
    });
    return true;
  }

  const vertical = type === 'vertical' || type === 'verticalBox';
  let cursor = vertical ? parentBox.top : parentBox.left;
  for (const [index, child] of children.entries()) {
    const props = previewProperties(child, registry, preview, index);
    if (props.visible === 'false') continue;
    const size = explicitSize(props);
    const intrinsic = intrinsicSize(child, props);
    const margin = num(props.margin);
    const before = num(vertical ? props['margin-top'] : props['margin-left'], margin);
    const after = num(vertical ? props['margin-bottom'] : props['margin-right'], margin);
    const crossBefore = num(vertical ? props['margin-left'] : props['margin-top'], margin);
    const crossAfter = num(vertical ? props['margin-right'] : props['margin-bottom'], margin);
    const mainLength = vertical ? (size.height ?? intrinsic.height) : (size.width ?? intrinsic.width);
    const crossLength = vertical
      ? (size.width ?? Math.max(0, parentBox.width - crossBefore - crossAfter))
      : (size.height ?? Math.max(0, parentBox.height - crossBefore - crossAfter));

    cursor += before;
    boxes.set(child.id, vertical ? {
      left: parentBox.left + crossBefore,
      top: cursor,
      width: crossLength,
      height: mainLength,
    } : {
      left: cursor,
      top: parentBox.top + crossBefore,
      width: mainLength,
      height: crossLength,
    });
    cursor += mainLength + after + spacing;
  }
  return true;
}

/** Rough intrinsic size for widgets that size themselves to their caption. */function intrinsicSize(widget: OTUIWidget, props: Record<string, string>): { width: number; height: number } {
  const raw = props.text ?? '';
  const text = raw.replace(/^tr\(['"](.*)['"]\)$/, '$1').replace(/^["']|["']$/g, '');
  const fontSize = Number(props.font?.match(/(\d+)px/)?.[1] ?? 11);
  const lineHeight = fontSize + 3;
  const lines = text.split('\n');
  const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);

  if (widget.type === 'UILabel' || widget.type === 'Label') {
    return { width: Math.ceil(longest * fontSize * 0.58), height: lines.length * lineHeight };
  }
  return { width: 0, height: 0 };
}

interface AnchorTarget {
  /** null means "the parent". */
  widgetId: string | null;
  edge: string;
}

function resolveTargetName(
  targetName: string,
  siblings: OTUIWidget[],
  index: number,
  byName: Map<string, OTUIWidget>,
): string | null | undefined {
  if (targetName === 'parent') return null;
  if (targetName === 'prev') return index > 0 ? siblings[index - 1].id : undefined;
  if (targetName === 'next') return index < siblings.length - 1 ? siblings[index + 1].id : undefined;
  return byName.get(targetName)?.id;
}

/** Numeric position of an edge on a resolved box, in the parent's coordinate space. */
function edgeValue(box: Box, edge: string): number | undefined {
  switch (edge) {
    case 'left':
      return box.left;
    case 'right':
      return box.left + box.width;
    case 'horizontalCenter':
      return box.left + box.width / 2;
    case 'top':
      return box.top;
    case 'bottom':
      return box.top + box.height;
    case 'verticalCenter':
      return box.top + box.height / 2;
    default:
      return undefined;
  }
}

/** Anchor declarations expanded from shorthands (`fill`, `centerIn`). */
function collectAnchors(props: Record<string, string>): Record<string, string> {
  const anchors: Record<string, string> = {};

  if (props['anchors.fill']) {
    const target = props['anchors.fill'];
    anchors.left = `${target}.left`;
    anchors.right = `${target}.right`;
    anchors.top = `${target}.top`;
    anchors.bottom = `${target}.bottom`;
  }
  if (props['anchors.centerIn']) {
    const target = props['anchors.centerIn'];
    anchors.horizontalCenter = `${target}.horizontalCenter`;
    anchors.verticalCenter = `${target}.verticalCenter`;
  }

  for (const [key, value] of Object.entries(props)) {
    if (!key.startsWith('anchors.')) continue;
    const side = key.slice('anchors.'.length);
    if (side === 'fill' || side === 'centerIn') continue;
    anchors[side] = value;
  }

  return anchors;
}

function resolveAxis(
  axis: Axis,
  anchors: Record<string, AnchorTarget & { side: string; margin: number }>,
  parentBox: Box,
  boxes: LayoutMap,
  size: number | undefined,
  intrinsic: number,
): { start: number; length: number } | null {
  const sides = axis === 'h' ? ['left', 'right', 'horizontalCenter'] : ['top', 'bottom', 'verticalCenter'];
  const parentLength = axis === 'h' ? parentBox.width : parentBox.height;

  const positions: Record<string, number> = {};
  for (const side of sides) {
    const anchor = anchors[side];
    if (!anchor) continue;
    // Parent anchors are expressed in the parent's own local box (origin 0,0).
    const targetBox = anchor.widgetId === null
      ? { left: 0, top: 0, width: parentBox.width, height: parentBox.height }
      : boxes.get(anchor.widgetId);
    if (!targetBox) return null; // dependency not resolved yet
    const value = edgeValue(targetBox, anchor.edge);
    if (value === undefined) continue;
    positions[side] = value + anchor.margin;
  }

  const startSide = axis === 'h' ? 'left' : 'top';
  const endSide = axis === 'h' ? 'right' : 'bottom';
  const centerSide = axis === 'h' ? 'horizontalCenter' : 'verticalCenter';

  const start = positions[startSide];
  const end = positions[endSide];
  const center = positions[centerSide];

  if (start !== undefined && end !== undefined) {
    return { start, length: Math.max(0, end - start) };
  }

  const length = size ?? (intrinsic || 0);

  if (start !== undefined) return { start, length };
  if (end !== undefined) return { start: end - length, length };
  if (center !== undefined) return { start: center - length / 2, length };

  // Unanchored and unsized widgets fall back to filling their parent, which
  // keeps hand-authored files (no anchors at all) usable in the preview.
  return { start: 0, length: size ?? (intrinsic || parentLength) };
}

/**
 * Scrollbar sliders are sized by UIScrollBar at runtime, not by anchors: the
 * stylesheet only says `anchors.centerIn: parent`. Without this the preview
 * draws a 12x12 dot in the middle of the track.
 */
function applyScrollBarGeometry(
  children: OTUIWidget[],
  parentBox: Box,
  parentProps: Record<string, string>,
  registry: StyleRegistry | null,
  boxes: LayoutMap,
  preview: PreviewContext,
): void {
  const byId = (id: string) => children.find((child) => child.properties.id === id);
  const slider = byId('sliderButton');
  const sliderBox = slider ? boxes.get(slider.id) : undefined;
  if (!slider || !sliderBox) return;

  const vertical = (parentProps.orientation ?? 'vertical') !== 'horizontal';
  const decrement = byId('decrementButton');
  const increment = byId('incrementButton');
  const decrementBox = decrement ? boxes.get(decrement.id) : undefined;
  const incrementBox = increment ? boxes.get(increment.id) : undefined;

  const trackStart = vertical
    ? (decrementBox ? decrementBox.top + decrementBox.height : parentBox.top)
    : (decrementBox ? decrementBox.left + decrementBox.width : parentBox.left);
  const trackEnd = vertical
    ? (incrementBox ? incrementBox.top : parentBox.top + parentBox.height)
    : (incrementBox ? incrementBox.left : parentBox.left + parentBox.width);
  const track = Math.max(0, trackEnd - trackStart);
  if (track === 0) return;

  const sliderProps = previewProperties(slider, registry, preview);
  const minimum = num(sliderProps.minimum, vertical ? sliderBox.height : sliderBox.width) || 12;

  // A real range gives us the exact slider; otherwise the preview shows a
  // half-filled bar so the widget reads as a scrollbar at a glance.
  const rangeMin = num(parentProps.minimum, 0);
  const rangeMax = num(parentProps.maximum, 0);
  const hasRange = rangeMax > rangeMin;
  const ratio = hasRange ? Math.min(1, num(parentProps.step, 1) / (rangeMax - rangeMin)) : preview.mock ? 0.45 : 1;
  const position = hasRange
    ? (num(parentProps.value, rangeMin) - rangeMin) / (rangeMax - rangeMin)
    : preview.mock ? 0.25 : 0;

  const length = Math.min(track, Math.max(minimum, Math.round(track * ratio)));
  const offset = Math.round(trackStart + (track - length) * Math.max(0, Math.min(1, position)));

  boxes.set(slider.id, vertical
    ? { left: sliderBox.left, top: offset, width: sliderBox.width, height: length }
    : { left: offset, top: sliderBox.top, width: length, height: sliderBox.height });
}

/**
 * Resolves absolute boxes (relative to each widget's parent) for the whole tree.
 * Runs multiple passes so sibling anchors converge regardless of declaration order.
 */
export function computeLayout(
  roots: OTUIWidget[],
  viewport: { width: number; height: number },
  registry: StyleRegistry | null,
  options: LayoutOptions = {},
): LayoutMap {
  const boxes: LayoutMap = new Map();
  const preview: PreviewContext = { mock: options.mock === true, bindings: options.bindings ?? null };

  const layoutChildren = (
    children: OTUIWidget[],
    parentBox: Box,
    parentProps: Record<string, string>,
    ancestorStyles: ReadonlySet<string>,
    depth: number,
  ) => {
    const byName = new Map<string, OTUIWidget>();
    for (const child of children) {
      const props = previewProperties(child, registry, preview);
      byName.set(child.name, child);
      if (props.id) byName.set(props.id, child);
    }

    const managed = applyManagedLayout(children, parentBox, parentProps, registry, boxes, preview);
    for (let pass = 0; !managed && pass < MAX_PASSES; pass++) {
      let resolvedThisPass = 0;

      children.forEach((child, index) => {
        if (boxes.has(child.id) && pass > 0) return;

        const props = previewProperties(child, registry, preview, index);
        const declaredAnchors = collectAnchors(props);
        const anchors: Record<string, AnchorTarget & { side: string; margin: number }> = {};
        let unresolvedDependency = false;

        for (const [side, value] of Object.entries(declaredAnchors)) {
          const match = value.trim().match(/^([\w]+)\.([\w]+)$/);
          if (!match) continue;
          const targetId = resolveTargetName(match[1], children, index, byName);
          if (targetId === undefined) continue; // no such sibling; ignore the anchor
          if (targetId !== null && !boxes.has(targetId)) {
            unresolvedDependency = true;
            continue;
          }
          // Margins always push the widget inward from the edge it anchors to.
          const margin = num(props[`margin-${side}`]) || num(props.margin);
          const signedMargin = side === 'right' || side === 'bottom' ? -margin : margin;
          anchors[side] = { side, widgetId: targetId, edge: match[2], margin: signedMargin };
        }

        if (unresolvedDependency && pass < MAX_PASSES - 1) return;

        const size = explicitSize(props);
        const intrinsic = intrinsicSize(child, props);

        const horizontal = resolveAxis('h', anchors, parentBox, boxes, size.width, intrinsic.width);
        const vertical = resolveAxis('v', anchors, parentBox, boxes, size.height, intrinsic.height);
        if (!horizontal || !vertical) return;

        const hasHorizontalAnchor = ['left', 'right', 'horizontalCenter'].some((s) => anchors[s]);
        const hasVerticalAnchor = ['top', 'bottom', 'verticalCenter'].some((s) => anchors[s]);

        boxes.set(child.id, {
          left: hasHorizontalAnchor ? horizontal.start : num(props.x, horizontal.start),
          top: hasVerticalAnchor ? vertical.start : num(props.y, vertical.start),
          width: horizontal.length,
          height: vertical.length,
        });
        resolvedThisPass++;
      });

      if (resolvedThisPass === 0) break;
    }

    applyScrollBarGeometry(children, parentBox, parentProps, registry, boxes, preview);

    for (const child of children) {
      const box = boxes.get(child.id);
      const props = previewProperties(child, registry, preview);
      const styleName = getStyleName(child);
      const repeatedStyle = isSynthetic(child) && ancestorStyles.has(styleName);
      const grandChildren = repeatedStyle || depth >= 64 ? child.children : expandChildren(child, registry, preview.mock);
      if (box && grandChildren.length > 0) {
        const nextAncestorStyles = new Set(ancestorStyles);
        nextAncestorStyles.add(styleName);
        layoutChildren(
          grandChildren,
          contentBox({ left: 0, top: 0, width: box.width, height: box.height }, props),
          props,
          nextAncestorStyles,
          depth + 1,
        );
      }
    }
  };

  for (const root of roots) {
    const props = previewProperties(root, registry, preview);
    const size = explicitSize(props);
    const fillParent = props['anchors.fill'] === 'parent';
    const width = fillParent ? viewport.width : size.width ?? viewport.width;
    const height = fillParent ? viewport.height : size.height ?? viewport.height;
    const centered = props['anchors.centerIn'] === 'parent';
    const horizontalCenter = centered || props['anchors.horizontalCenter'] === 'parent.horizontalCenter';
    const verticalCenter = centered || props['anchors.verticalCenter'] === 'parent.verticalCenter';
    const anchoredRight = props['anchors.right'] === 'parent.right';
    const anchoredBottom = props['anchors.bottom'] === 'parent.bottom';
    const box: Box = {
      left: horizontalCenter
        ? (viewport.width - width) / 2 + num(props['margin-left']) - num(props['margin-right'])
        : anchoredRight
          ? viewport.width - width - num(props['margin-right'], num(props.margin))
          : num(props.x, num(props['margin-left'], num(props.margin))),
      top: verticalCenter
        ? (viewport.height - height) / 2 + num(props['margin-top']) - num(props['margin-bottom'])
        : anchoredBottom
          ? viewport.height - height - num(props['margin-bottom'], num(props.margin))
          : num(props.y, num(props['margin-top'], num(props.margin))),
      width,
      height,
    };
    boxes.set(root.id, box);
    layoutChildren(expandChildren(root, registry, preview.mock), contentBox(box, props), props, new Set([getStyleName(root)]), 0);
  }

  return boxes;
}
