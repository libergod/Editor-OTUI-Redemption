// Interaction states ($hover, $pressed, $on, ...) for the Client Preview.
//
// OTClient re-skins a widget whenever its state flags change: `Button` swaps
// `image-clip` on $pressed, `TabButton` on $on, scrollbar sliders fade out on
// $disabled. The stylesheets carry all of that information, so the preview can
// reproduce it faithfully instead of drawing a single static frame.
//
// Three sources of state declarations are merged, weakest first:
//   1. the style chain resolved from data/styles (`ResolvedStyle.states`)
//   2. synthetic children, which flatten their blocks into `"$sel.key"` props
//   3. the edited document itself, which uses the same `"$sel.key"` encoding

import type { OTUIWidget } from '@/lib/otui-types';
import type { StyleRegistry } from './style-registry';
import { getStyleName } from './otui-css';

/** State flags the preview can simulate, without the leading `$`. */
export type InteractionState =
  | 'hover'
  | 'pressed'
  | 'checked'
  | 'on'
  | 'disabled'
  | 'focus'
  | 'active'
  | 'first'
  | 'middle'
  | 'last'
  | 'alternate'
  | 'dragging'
  | 'hidden'
  | 'mobile';

interface StateBlock {
  /** Tokens of the selector, e.g. ["$hover", "!disabled"]. */
  tokens: string[];
  properties: Record<string, string>;
}

/**
 * A selector matches when every `$flag` token is active and every `!flag`
 * token is not. OTClient writes both `$hover !disabled` and `$hover $on`.
 */
function matches(tokens: string[], active: ReadonlySet<string>): boolean {
  for (const token of tokens) {
    if (token.startsWith('!')) {
      if (active.has(token.slice(1).replace(/^\$/, ''))) return false;
    } else if (token.startsWith('$')) {
      const flag = token.slice(1);
      // `$!on` is the stylesheet spelling of "not on".
      if (flag.startsWith('!')) {
        if (active.has(flag.slice(1))) return false;
      } else if (!active.has(flag)) {
        return false;
      }
    }
  }
  return tokens.length > 0;
}

function tokenize(selector: string): string[] {
  return selector.trim().split(/\s+/).filter(Boolean);
}

/** Widget-local blocks, encoded by the parser as `"$hover.image-clip"`. */
function localBlocks(props: Record<string, string>): StateBlock[] {
  const bySelector = new Map<string, Record<string, string>>();
  for (const [key, value] of Object.entries(props)) {
    if (!key.startsWith('$')) continue;
    const separator = key.indexOf('.');
    if (separator < 0) continue;
    const selector = key.slice(0, separator);
    const property = key.slice(separator + 1);
    const block = bySelector.get(selector) ?? {};
    block[property] = value;
    bySelector.set(selector, block);
  }
  return [...bySelector].map(([selector, properties]) => ({ tokens: tokenize(selector), properties }));
}

/** States a widget is permanently in because of its own properties. */
export function intrinsicStates(props: Record<string, string>): Set<string> {
  const states = new Set<string>();
  if (props.enabled === 'false') states.add('disabled');
  if (props.checked === 'true') states.add('checked');
  if (props.on === 'true') states.add('on');
  if (props.focus === 'true') states.add('focus');
  return states;
}

/**
 * `props` with every matching state block applied on top. Blocks are sorted by
 * selector length so a compound selector (`$hover !disabled`) wins over the
 * plain one it refines, matching the client's "most specific last" behaviour.
 */
export function applyStates(
  widget: Pick<OTUIWidget, 'type' | 'properties'>,
  props: Record<string, string>,
  registry: StyleRegistry | null,
  active: ReadonlySet<string>,
): Record<string, string> {
  if (active.size === 0) return props;

  const blocks: StateBlock[] = [];
  const resolved = registry?.resolve(getStyleName(widget));
  if (resolved) {
    for (const [selector, properties] of Object.entries(resolved.states)) {
      blocks.push({ tokens: tokenize(selector), properties });
    }
  }
  blocks.push(...localBlocks(props));

  const applicable = blocks.filter((block) => matches(block.tokens, active));
  if (applicable.length === 0) return props;
  applicable.sort((a, b) => a.tokens.length - b.tokens.length);

  const merged = { ...props };
  for (const block of applicable) Object.assign(merged, block.properties);
  return merged;
}
