// Reads the values a module's Lua sets on its widgets.
//
// An .otui file only describes the empty shell: `miniwindowTitle` has no text,
// `miniwindowIcon` has no image, and the prey slots are blank until the server
// answers. The module script is where those values live:
//
//   local titleWidget = preyTracker:getChildById('miniwindowTitle')
//   titleWidget:setText('Prey')
//   iconWidget:setImageSource('/images/game/prey/icon-prey-widget')
//
// Extracting them statically lets the preview show the window the way the
// module actually presents it, instead of generic placeholders.

/** OTUI properties keyed by widget id, as assigned by the scripts. */
export type LuaBindings = Map<string, Record<string, string>>;

/** Marks a widget whose .otui anchors were dropped by `breakAnchors()`. */
export const BROKEN_ANCHORS = '__breakAnchors';

/**
 * Setters the preview can map onto an OTUI property. Everything else a module
 * calls is behaviour the editor does not model.
 */
const SETTERS: Record<string, string> = {
  setText: 'text',
  setColoredText: 'text',
  setTooltip: 'tooltip',
  setImageSource: 'image-source',
  setImageClip: 'image-clip',
  setImageColor: 'image-color',
  setImageSize: 'image-size',
  setIcon: 'icon-source',
  setIconSource: 'icon-source',
  setIconClip: 'icon-clip',
  setColor: 'color',
  setBackgroundColor: 'background-color',
  setOpacity: 'opacity',
  setVisible: 'visible',
  setEnabled: 'enabled',
  setOn: 'on',
  setChecked: 'checked',
  setValue: 'value',
  setPercent: 'percent',
  setMinimum: 'minimum',
  setMaximum: 'maximum',
  setItemId: 'item-id',
  setOutfitId: 'outfit-id',
  setWidth: 'width',
  setHeight: 'height',
  setPhantom: 'phantom',
  setMargin: 'margin',
  setMarginTop: 'margin-top',
  setMarginRight: 'margin-right',
  setMarginBottom: 'margin-bottom',
  setMarginLeft: 'margin-left',
};

/** `AnchorTop` -> the `anchors.top` side it names. */
const ANCHOR_EDGES: Record<string, string> = {
  Left: 'left',
  Right: 'right',
  Top: 'top',
  Bottom: 'bottom',
  VerticalCenter: 'verticalCenter',
  HorizontalCenter: 'horizontalCenter',
};

const SETTER_NAMES = Object.keys(SETTERS).join('|');

/** `getChildById('x')` / `recursiveGetChildById('x')` / `getChildById("x")`. */
const CHILD_LOOKUP = /(?:recursiveG|g)etChildById\(\s*['"](\w+)['"]\s*\)/;
const LOCAL_LOOKUP = new RegExp(
  String.raw`\b(?:local\s+)?(\w+)\s*=\s*[^\n]*?${CHILD_LOOKUP.source}`,
  'g',
);
const DIRECT_CALL = new RegExp(
  String.raw`${CHILD_LOOKUP.source}\s*:\s*(${SETTER_NAMES})\(\s*([^)]*)\)`,
  'g',
);
const VARIABLE_CALL = new RegExp(String.raw`\b(\w+)\s*:\s*(${SETTER_NAMES})\(\s*([^)]*)\)`, 'g');
/** `prey.title:setText('Locked')` — children are reachable as fields by id. */
const FIELD_CALL = new RegExp(String.raw`\.(\w+)\s*:\s*(${SETTER_NAMES})\(\s*([^)]*)\)`, 'g');

/** `lockButton:breakAnchors()` drops everything the .otui declared. */
const BREAK_ANCHORS = /\b(\w+)\s*:\s*breakAnchors\(\s*\)/g;
/** `lockButton:addAnchor(AnchorRight, minimizeButton:getId(), AnchorLeft)`. */
const ADD_ANCHOR =
  /\b(\w+)\s*:\s*addAnchor\(\s*Anchor(\w+)\s*,\s*(?:['"](\w+)['"]|(\w+)\s*:\s*getId\(\s*\))\s*,\s*Anchor(\w+)\s*\)/g;

/**
 * Unwraps `tr('x')`, `"x"`, `'x'`, booleans and numbers.
 * Returns null for anything computed at runtime.
 */
function literal(argument: string): string | null {
  const trimmed = argument.trim().replace(/^tr\(\s*/, '').replace(/\s*\)$/, '');
  if (/^(true|false)$/.test(trimmed)) return trimmed;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return trimmed;

  const quoted = trimmed.match(/^(['"])([\s\S]*)\1$/);
  if (!quoted) return null;
  // Lua escapes that matter for display.
  return quoted[2].replace(/\\n/g, '\n').replace(/\\(['"\\])/g, '$1');
}

function record(bindings: LuaBindings, id: string, setter: string, argument: string): void {
  const property = SETTERS[setter];
  const value = literal(argument);
  if (!property || value === null) return;
  bindings.set(id, { ...bindings.get(id), [property]: value });
}

/**
 * Maps widget id -> properties assigned by the scripts. Only literal
 * assignments are kept; anything computed at runtime is left to the mock data.
 *
 * Later assignments win, matching the order the module executes them in, and an
 * explicit `getChildById` lookup outranks a bare field access.
 */
export function extractLuaBindings(scripts: { text: string }[]): LuaBindings {
  const bindings: LuaBindings = new Map();

  for (const script of scripts) {
    // Built first so `addAnchor(..., other:getId(), ...)` can be resolved.
    const variableToId = new Map<string, string>();
    for (const match of script.text.matchAll(LOCAL_LOOKUP)) {
      variableToId.set(match[1], match[2]);
    }

    // Weakest first: an explicit getChildById lookup beats a field access.
    for (const match of script.text.matchAll(FIELD_CALL)) {
      record(bindings, match[1], match[2], match[3]);
    }

    for (const match of script.text.matchAll(DIRECT_CALL)) {
      record(bindings, match[1], match[2], match[3]);
    }

    for (const match of script.text.matchAll(VARIABLE_CALL)) {
      const id = variableToId.get(match[1]);
      if (id) record(bindings, id, match[2], match[3]);
    }

    for (const match of script.text.matchAll(BREAK_ANCHORS)) {
      const id = variableToId.get(match[1]);
      if (id) bindings.set(id, { ...bindings.get(id), [BROKEN_ANCHORS]: 'true' });
    }

    for (const match of script.text.matchAll(ADD_ANCHOR)) {
      const id = variableToId.get(match[1]);
      const side = ANCHOR_EDGES[match[2]];
      const target = match[3] ?? variableToId.get(match[4]);
      const edge = ANCHOR_EDGES[match[5]];
      if (!id || !side || !target || !edge) continue;
      bindings.set(id, { ...bindings.get(id), [`anchors.${side}`]: `${target}.${edge}` });
    }
  }

  return bindings;
}

/**
 * The subset of a binding that must override the .otui rather than back it:
 * geometry the script mutates after the file has been loaded.
 */
export function layoutOverrides(binding: Record<string, string> | undefined): Record<string, string> {
  if (!binding) return {};
  const overrides: Record<string, string> = {};
  for (const [key, value] of Object.entries(binding)) {
    if (key.startsWith('anchors.') || key.startsWith('margin') || key === BROKEN_ANCHORS) {
      overrides[key] = value;
    }
  }
  return overrides;
}
