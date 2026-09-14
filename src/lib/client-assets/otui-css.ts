// Shared data layer used by BOTH renderers (EditorCanvas and ClientPreview).
//
// This is NOT a renderer: it only resolves "what does OTClient say this widget
// looks like" (inherited style properties -> CSS skin). Each renderer keeps its
// own layout/positioning logic, as documented in docs/CLIENT_PREVIEW.md.

import type { CSSProperties } from 'react';
import type { OTUIWidget } from '@/lib/otui-types';
import type { StyleRegistry } from './style-registry';
import type { FontRegistry } from './fonts';
import type { LuaBindings } from './lua-bindings';
import { ImageCache, normalizeColor } from './images';

/** The OTClient style a widget derives from, e.g. "FlatPanel" or "UIButton". */
export function getStyleName(widget: Pick<OTUIWidget, 'type' | 'properties'>): string {
  return widget.properties.__style || widget.type;
}

/**
 * Widget properties merged with everything inherited from the OTClient
 * stylesheets. Widget-local declarations always win.
 */
export function resolveEffectiveProperties(
  widget: Pick<OTUIWidget, 'type' | 'properties'>,
  registry: StyleRegistry | null,
): Record<string, string> {
  if (!registry) return widget.properties;
  const resolved = registry.resolve(getStyleName(widget));
  if (!resolved) return widget.properties;
  return { ...resolved.properties, ...widget.properties };
}

/** Pseudo-state overrides ($hover, $pressed, ...) including inherited ones. */
export function resolveStateProperties(
  widget: Pick<OTUIWidget, 'type' | 'properties'>,
  registry: StyleRegistry | null,
  state: string,
): Record<string, string> {
  if (!registry) return {};
  const resolved = registry.resolve(getStyleName(widget));
  if (!resolved) return {};
  const merged: Record<string, string> = {};
  for (const [selector, props] of Object.entries(resolved.states)) {
    // Selectors may be compound, e.g. "$hover !disabled".
    if (selector.split(/\s+/).includes(state)) Object.assign(merged, props);
  }
  return merged;
}

export interface SkinContext {
  registry: StyleRegistry | null;
  fonts: FontRegistry | null;
  images: ImageCache | null;
  /** Resolves `item-id` / `outfit-id` to a game sprite, when things are loaded. */
  sprites: ThingSpriteResolver | null;
  /** Values the loaded module's Lua assigns to widget ids, for the preview. */
  bindings: LuaBindings | null;
}

/** Looks up a game sprite for an appearance id; null while loading or missing. */
export type ThingSpriteResolver = (kind: 'item' | 'outfit', id: number) => string | null;

function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** "1" -> [1,1,1,1]; "1 2" -> [1,2,1,2]; "1 2 3 4" -> [1,2,3,4] (top right bottom left). */
function parseBox(value: string): [number, number, number, number] | null {
  const parts = value.trim().split(/\s+/).map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return null;
  if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
  if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
  if (parts.length === 4) return [parts[0], parts[1], parts[2], parts[3]];
  return null;
}

function resolveImageBorders(props: Record<string, string>): [number, number, number, number] | null {
  const uniform = props['image-border'] ? parseBox(props['image-border']) : null;
  const top = parseNumber(props['image-border-top']) ?? uniform?.[0] ?? 0;
  const right = parseNumber(props['image-border-right']) ?? uniform?.[1] ?? 0;
  const bottom = parseNumber(props['image-border-bottom']) ?? uniform?.[2] ?? 0;
  const left = parseNumber(props['image-border-left']) ?? uniform?.[3] ?? 0;
  if (top === 0 && right === 0 && bottom === 0 && left === 0) return null;
  return [top, right, bottom, left];
}

/** Per-side overrides win over the shorthand, matching OTClient. */
function resolveBox(
  props: Record<string, string>,
  shorthand: string,
): [number, number, number, number] | null {
  const uniform = props[shorthand] ? parseBox(props[shorthand]) : null;
  const top = parseNumber(props[`${shorthand}-top`]) ?? uniform?.[0];
  const right = parseNumber(props[`${shorthand}-right`]) ?? uniform?.[1];
  const bottom = parseNumber(props[`${shorthand}-bottom`]) ?? uniform?.[2];
  const left = parseNumber(props[`${shorthand}-left`]) ?? uniform?.[3];
  if (top === undefined && right === undefined && bottom === undefined && left === undefined) return null;
  return [top ?? 0, right ?? 0, bottom ?? 0, left ?? 0];
}

/** "x y" pairs such as `image-size` and `image-offset`. */
function parsePair(value: string | undefined): [number, number] | null {
  if (!value) return null;
  const parts = value.trim().split(/\s+/).map(Number);
  if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return null;
  return [parts[0], parts[1]];
}

export interface TextSkin {
  fontSize: number;
  lineHeight: string;
  offsetX: number;
  offsetY: number;
  align: string;
}

/**
 * CSS for the visual "skin" of a widget: background image (with sprite clipping
 * and 9-slice borders), colors, opacity, padding and font.
 *
 * Returns an empty object when no client folder is connected, letting callers
 * fall back to their placeholder styling.
 */
export function getSkinStyle(props: Record<string, string>, ctx: SkinContext): CSSProperties {
  const style: CSSProperties = {};

  const color = normalizeColor(props.color);
  if (color) style.color = color;

  const background = normalizeColor(props['background-color'] ?? props.background);
  if (background) style.backgroundColor = background;

  const opacity = parseNumber(props.opacity);
  if (opacity !== undefined) style.opacity = opacity;

  const padding = resolveBox(props, 'padding');
  if (padding) style.padding = `${padding[0]}px ${padding[1]}px ${padding[2]}px ${padding[3]}px`;

  const borderWidth = resolveBox(props, 'border-width');
  const borderColor = normalizeColor(props['border-color']);
  if (borderWidth) {
    style.borderWidth = `${borderWidth[0]}px ${borderWidth[1]}px ${borderWidth[2]}px ${borderWidth[3]}px`;
    style.borderStyle = 'solid';
    style.borderColor = borderColor ?? 'transparent';
  }

  if (ctx.fonts) {
    const metrics = ctx.fonts.get(props.font);
    style.fontFamily = metrics.fontFamily;
    style.fontSize = metrics.fontSize;
    style.lineHeight = `${metrics.lineHeight}px`;
    style.fontWeight = metrics.fontWeight;
    style.fontStyle = metrics.fontStyle;
  }

  const source = props['image-source'];
  if (source && ctx.images) {
    const image = ctx.images.get({
      source,
      clip: props['image-clip'],
      color: normalizeColor(props['image-color']),
    });

    if (image) {
      const borders = resolveImageBorders(props);
      if (borders) {
        // 9-slice: corners stay fixed, edges/center are stretched like OTClient.
        style.borderImageSource = `url("${image.url}")`;
        style.borderImageSlice = `${borders[0]} ${borders[1]} ${borders[2]} ${borders[3]} fill`;
        style.borderImageWidth = `${borders[0]}px ${borders[1]}px ${borders[2]}px ${borders[3]}px`;
        style.borderImageRepeat = 'stretch';
        style.borderStyle = 'solid';
        style.borderColor = 'transparent';
        style.borderWidth = `${borders[0]}px ${borders[1]}px ${borders[2]}px ${borders[3]}px`;
      } else {
        style.backgroundImage = `url("${image.url}")`;
        style.backgroundRepeat = props['image-repeated'] === 'true' ? 'repeat' : 'no-repeat';

        // `image-size` draws the texture at a fixed size regardless of the widget box.
        const imageSize = parsePair(props['image-size']);
        const imageOffset = parsePair(props['image-offset']);

        if (imageSize) {
          style.backgroundSize = `${imageSize[0]}px ${imageSize[1]}px`;
          style.backgroundPosition = 'center';
        } else if (props['image-repeated'] === 'true') {
          style.backgroundSize = 'auto';
        } else if (props['image-fixed-ratio'] === 'true') {
          style.backgroundSize = 'contain';
          style.backgroundPosition = 'center';
        } else if (props['image-auto-resize'] === 'true') {
          style.backgroundSize = 'auto';
          style.width ??= image.width;
          style.height ??= image.height;
        } else {
          style.backgroundSize = '100% 100%';
        }

        if (imageOffset) style.backgroundPosition = `${imageOffset[0]}px ${imageOffset[1]}px`;
        style.imageRendering = 'pixelated';
      }
    }
  }

  return style;
}

/** Text placement metrics (`text-offset`, `text-align`) for a widget's caption. */
export function getTextSkin(props: Record<string, string>, ctx: SkinContext): TextSkin {
  const metrics = ctx.fonts?.get(props.font);
  const offset = props['text-offset']?.trim().split(/\s+/).map(Number) ?? [];
  const align = props['text-align']?.trim().toLowerCase() ?? 'center';

  return {
    fontSize: metrics?.fontSize ?? 11,
    lineHeight: `${metrics?.lineHeight ?? 14}px`,
    offsetX: Number.isFinite(offset[0]) ? offset[0] : 0,
    offsetY: Number.isFinite(offset[1]) ? offset[1] : 0,
    align,
  };
}

/**
 * CSS for a widget's `icon-source` overlay, drawn on top of the skin.
 * Returns null when the widget has no icon or no client assets are connected.
 */
export function getIconStyle(props: Record<string, string>, ctx: SkinContext): CSSProperties | null {
  const source = props['icon-source'];
  if (!source || !ctx.images) return null;

  const icon = ctx.images.get({
    source,
    clip: props['icon-clip'],
    color: normalizeColor(props['icon-color']),
  });
  if (!icon) return null;

  const size = parsePair(props['icon-size']) ?? [icon.width, icon.height];
  const offset = parsePair(props['icon-offset']) ?? [0, 0];

  return {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: size[0],
    height: size[1],
    transform: `translate(calc(-50% + ${offset[0]}px), calc(-50% + ${offset[1]}px))`,
    backgroundImage: `url("${icon.url}")`,
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
    pointerEvents: 'none',
  };
}

/** CSS for a widget's game sprite (`item-id` / `outfit-id`), or null if unavailable. */
export function getThingStyle(props: Record<string, string>, ctx: SkinContext): CSSProperties | null {
  if (!ctx.sprites) return null;

  const itemId = parseNumber(props['item-id']);
  const outfitId = parseNumber(props['outfit-id']);
  const url =
    itemId !== undefined
      ? ctx.sprites('item', itemId)
      : outfitId !== undefined
        ? ctx.sprites('outfit', outfitId)
        : null;
  if (!url) return null;

  return {
    position: 'absolute',
    inset: 0,
    backgroundImage: `url("${url}")`,
    backgroundSize: 'contain',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
    pointerEvents: 'none',
  };
}

/** Maps OTClient `text-align` to CSS flex alignment. */
export function textAlignToFlex(align: string): { justifyContent: string; alignItems: string } {
  const horizontal = align.includes('left') ? 'flex-start' : align.includes('right') ? 'flex-end' : 'center';
  const vertical = align.includes('top') ? 'flex-start' : align.includes('bottom') ? 'flex-end' : 'center';
  return { justifyContent: horizontal, alignItems: vertical };
}
