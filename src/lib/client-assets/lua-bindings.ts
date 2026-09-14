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

export interface LuaBinding {
  text?: string;
  imageSource?: string;
  visible?: boolean;
}

export type LuaBindings = Map<string, LuaBinding>;

/** `getChildById('x')` / `recursiveGetChildById('x')` / `getChildById("x")`. */
const CHILD_LOOKUP = /(?:recursiveG|g)etChildById\(\s*['"](\w+)['"]\s*\)/;
const LOCAL_LOOKUP = new RegExp(
  String.raw`\b(?:local\s+)?(\w+)\s*=\s*[^\n]*?${CHILD_LOOKUP.source}`,
  'g',
);
const DIRECT_CALL = new RegExp(
  String.raw`${CHILD_LOOKUP.source}\s*:\s*(setText|setImageSource|setVisible)\(\s*([^)]*)\)`,
  'g',
);
const VARIABLE_CALL = /\b(\w+)\s*:\s*(setText|setImageSource|setVisible)\(\s*([^)]*)\)/g;
/** `prey.title:setText('Locked')` — children are reachable as fields by id. */
const FIELD_CALL = /\.(\w+)\s*:\s*(setText|setImageSource|setVisible)\(\s*([^)]*)\)/g;

/** Unwraps `tr('x')`, `"x"` and `'x'`; returns null for computed expressions. */
function literal(argument: string): string | null {
  const trimmed = argument.trim().replace(/^tr\(\s*/, '').replace(/\s*\)$/, '');
  const match = trimmed.match(/^(['"])([\s\S]*)\1$/);
  if (!match) return null;
  // Lua escapes that matter for display.
  return match[2].replace(/\\n/g, '\n').replace(/\\(['"\\])/g, '$1');
}

function record(bindings: LuaBindings, id: string, method: string, argument: string): void {
  const binding = bindings.get(id) ?? {};
  if (method === 'setVisible') {
    const value = argument.trim();
    if (value === 'true' || value === 'false') binding.visible = value === 'true';
  } else {
    const value = literal(argument);
    if (value === null) return;
    if (method === 'setText') binding.text = value;
    else binding.imageSource = value;
  }
  bindings.set(id, binding);
}

/**
 * Maps widget id -> values assigned by the scripts. Only literal assignments are
 * kept; anything computed at runtime is left for the generic mock data.
 *
 * Later assignments win, matching the order the module executes them in.
 */
export function extractLuaBindings(scripts: { text: string }[]): LuaBindings {
  const bindings: LuaBindings = new Map();

  for (const script of scripts) {
    // Weakest first: an explicit getChildById lookup beats a field access.
    for (const match of script.text.matchAll(FIELD_CALL)) {
      record(bindings, match[1], match[2], match[3]);
    }

    for (const match of script.text.matchAll(DIRECT_CALL)) {
      record(bindings, match[1], match[2], match[3]);
    }

    // Two-step form: the child is stored in a variable before being configured.
    const variableToId = new Map<string, string>();
    for (const match of script.text.matchAll(LOCAL_LOOKUP)) {
      variableToId.set(match[1], match[2]);
    }
    for (const match of script.text.matchAll(VARIABLE_CALL)) {
      const id = variableToId.get(match[1]);
      if (id) record(bindings, id, match[2], match[3]);
    }
  }

  return bindings;
}
