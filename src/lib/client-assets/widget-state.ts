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
 * A selector token is a flag that must be set, or a negated one that must not.
 * The stylesheets spell the same thing four ways: `$hover`, `hover` (in compound
 * selectors like `$on hover`), `!disabled` and `$!on`.
 */
function parseToken(token: string): { flag: string; negated: boolean } | null {
  let rest = token.startsWith('$') ? token.slice(1) : token;
  const negated = rest.startsWith('!');
  if (negated) rest = rest.slice(1);
  if (rest.startsWith('$')) rest = rest.slice(1);
  return rest.length > 0 ? { flag: rest, negated } : null;
}

function matches(tokens: string[], active: ReadonlySet<string>): boolean {
  let constraints = 0;
  for (const token of tokens) {
    const parsed = parseToken(token);
    if (!parsed) continue;
    constraints++;
    if (active.has(parsed.flag) === parsed.negated) return false;
  }
  return constraints > 0;
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

/** The states a widget rests in, before any pointer interaction. */
export function restingStates(props: Record<string, string>, mock: boolean): Set<string> {
  const states = intrinsicStates(props);
  // A scrollbar skins itself only once it has something to scroll (`$!on:
  // width: 0`); with preview data the window is populated, so show it that way.
  if (mock && props.orientation !== undefined) states.add('on');
  return states;
}

/**
 * `props` with every matching state block applied on top.
 *
 * Precedence mirrors normal property resolution: blocks the widget declares
 * itself beat anything inherited from its style chain, and within each group a
 * compound selector (`$on hover`) beats the plain one it refines.
 *
 * Runs even when nothing is active, because negative selectors such as
 * `$!on: width: 0` describe the *resting* appearance.
 */
export function applyStates(
  widget: Pick<OTUIWidget, 'type' | 'properties'>,
  props: Record<string, string>,
  registry: StyleRegistry | null,
  active: ReadonlySet<string>,
): Record<string, string> {
  const inherited: StateBlock[] = [];
  const resolved = registry?.resolve(getStyleName(widget));
  if (resolved) {
    for (const [selector, properties] of Object.entries(resolved.states)) {
      inherited.push({ tokens: tokenize(selector), properties });
    }
  }

  const byTokenCount = (a: StateBlock, b: StateBlock) => a.tokens.length - b.tokens.length;
  const applicable = [
    ...inherited.filter((block) => matches(block.tokens, active)).sort(byTokenCount),
    ...localBlocks(props).filter((block) => matches(block.tokens, active)).sort(byTokenCount),
  ];
  if (applicable.length === 0) return props;

  const merged = { ...props };
  for (const block of applicable) Object.assign(merged, block.properties);
  return merged;
}
