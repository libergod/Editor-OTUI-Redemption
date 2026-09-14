// Builds a queryable database of OTClient styles with inheritance resolved.

import { parseStylesheet, StyleNode } from './style-parser';
import type { ClientAssetSource } from './source';

export interface ResolvedStyle {
  name: string;
  /** Inheritance chain from the style itself up to the native base, e.g. ["FlatPanel", "Panel", "UIWidget"]. */
  chain: string[];
  /** The native OTClient class at the end of the chain, e.g. "UIWidget". */
  nativeBase: string;
  properties: Record<string, string>;
  states: Record<string, Record<string, string>>;
  children: StyleNode[];
}

const STYLE_DIR = 'data/styles';
const MAX_INHERITANCE_DEPTH = 32;

/**
 * Native OTClient classes carry no skin of their own; the stylesheets define a
 * same-named style that does (`Button < UIButton`). Widgets typed as the native
 * class fall back to that style so the editor matches the client.
 */
const NATIVE_STYLE_ALIASES: Record<string, string[]> = {
  UIWidget: ['Widget'],
  UIPanel: ['Panel'],
  UIButton: ['Button'],
  UILabel: ['Label'],
  UITextEdit: ['TextEdit'],
  UICheckBox: ['CheckBox'],
  UIRadioButton: ['CheckBox'],
  UIComboBox: ['ComboBox'],
  UIDropDown: ['ComboBox'],
  UIProgressBar: ['ProgressBar'],
  UIScrollArea: ['ScrollablePanel', 'Panel'],
  UIScrollPanel: ['ScrollablePanel', 'Panel'],
  UIScrollBar: ['VerticalScrollBar', 'ScrollBar'],
  UIMiniWindow: ['MiniWindow'],
  UISeparator: ['HorizontalSeparator', 'Separator'],
  UITabBar: ['TabBar'],
  UITab: ['TabBarButton', 'TabButton'],
  UIList: ['TextList', 'List'],
  UIListItem: ['ListLabel', 'Label'],
  UISlider: ['ScrollBarSlider', 'HorizontalScrollBar'],
  UIItem: ['Item'],
  UICreature: ['Creature'],
  UIImage: ['UIImage'],
};

export class StyleRegistry {
  private readonly definitions = new Map<string, StyleNode>();
  private readonly resolveCache = new Map<string, ResolvedStyle | null>();
  private readonly loadedFiles: string[] = [];

  get files(): readonly string[] {
    return this.loadedFiles;
  }

  get styleNames(): string[] {
    return [...this.definitions.keys()].sort();
  }

  clone(): StyleRegistry {
    const registry = new StyleRegistry();
    for (const [name, definition] of this.definitions) registry.definitions.set(name, definition);
    registry.loadedFiles.push(...this.loadedFiles);
    return registry;
  }

  addStylesheet(text: string, source: string): void {
    for (const node of parseStylesheet(text, source)) {
      // OTClient imports only top-level `Name < Base` nodes as styles. A bare
      // node is the runtime root passed to createWidgetFromOTML by loadUI.
      if (node.name && node.base) this.definitions.set(node.name, node);
    }
    this.loadedFiles.push(source);
    this.resolveCache.clear();
  }

  has(name: string): boolean {
    return this.definitions.has(name);
  }

  /** Merged properties/states for `name`, or null when the style is unknown. */
  resolve(name: string): ResolvedStyle | null {
    if (this.resolveCache.has(name)) return this.resolveCache.get(name) ?? null;

    if (!this.definitions.has(name)) {
      const resolved = this.resolveNativeAlias(name);
      this.resolveCache.set(name, resolved);
      return resolved;
    }

    const chain: string[] = [];
    const seen = new Set<string>();
    let cursor: string | null = name;

    while (cursor && !seen.has(cursor) && chain.length < MAX_INHERITANCE_DEPTH) {
      seen.add(cursor);
      chain.push(cursor);
      cursor = this.definitions.get(cursor)?.base ?? null;
    }

    const properties: Record<string, string> = {};
    const states: Record<string, Record<string, string>> = {};
    let children: StyleNode[] = [];

    // Walk base -> derived so derived declarations win.
    for (let i = chain.length - 1; i >= 0; i--) {
      const node = this.definitions.get(chain[i]);
      if (!node) continue;
      Object.assign(properties, node.properties);
      for (const [selector, props] of Object.entries(node.states)) {
        states[selector] = { ...(states[selector] ?? {}), ...props };
      }
      if (node.children.length > 0) children = [...children, ...node.children];
    }

    const resolved: ResolvedStyle = {
      name,
      chain,
      nativeBase: chain[chain.length - 1],
      properties,
      states,
      children,
    };
    this.resolveCache.set(name, resolved);
    return resolved;
  }

  private resolveNativeAlias(name: string): ResolvedStyle | null {
    for (const alias of NATIVE_STYLE_ALIASES[name] ?? []) {
      if (alias === name) continue;
      const resolved = this.resolve(alias);
      if (resolved) return { ...resolved, name };
    }
    return null;
  }
}

export interface StyleLoadResult {
  registry: StyleRegistry;
  loaded: string[];
  failed: string[];
}

/** Reads every `data/styles/*.otui` file from the given client folder. */
export async function loadStyleRegistry(source: ClientAssetSource): Promise<StyleLoadResult> {
  const registry = new StyleRegistry();
  const loaded: string[] = [];
  const failed: string[] = [];

  const entries = await source.list(STYLE_DIR);
  const stylesheets = entries
    .filter((entry) => entry.kind === 'file' && entry.name.toLowerCase().endsWith('.otui'))
    // Numeric prefixes (10-, 20-, 30-) encode load order in OTClient.
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));

  for (const entry of stylesheets) {
    const text = await source.readText(entry.path);
    if (text === null) {
      failed.push(entry.name);
      continue;
    }
    registry.addStylesheet(text, entry.name);
    loaded.push(entry.name);
  }

  return { registry, loaded, failed };
}
