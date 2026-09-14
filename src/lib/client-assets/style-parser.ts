// Parser for OTClient stylesheets (data/styles/*.otui).
//
// Deliberately separate from src/lib/otui-parser.ts: that parser normalizes
// declarations into the editor's OTUIWidget model (mapping names to WidgetType).
// Style resolution needs the *verbatim* names and inheritance chain
// ("FlatPanel < Panel < UIWidget"), so this keeps everything as written.

export interface StyleNode {
  /** Declared name, e.g. "FlatPanel". Empty for anonymous nested widgets. */
  name: string;
  /** Declared base style, e.g. "Panel". Null when the declaration is bare. */
  base: string | null;
  properties: Record<string, string>;
  /** Keyed by the raw state selector, e.g. "$hover !disabled". */
  states: Record<string, Record<string, string>>;
  children: StyleNode[];
  /** Origin file, useful for diagnostics. */
  source: string;
}

interface Line {
  indent: number;
  text: string;
}

function measureIndent(raw: string): number {
  let count = 0;
  for (const ch of raw) {
    if (ch === ' ') count += 1;
    else if (ch === '\t') count += 2;
    else break;
  }
  return count;
}

function stripComment(raw: string): string {
  // Only strip comments outside of quotes so values like "a//b" survive.
  let quote: string | null = null;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (quote) {
      if (ch === quote && raw[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '/' && raw[i + 1] === '/') return raw.slice(0, i);
    if (ch === '-' && raw[i + 1] === '-') return raw.slice(0, i);
  }
  return raw;
}

const DECLARATION_RE = /^([A-Za-z_][\w]*)\s*<\s*([A-Za-z_][\w]*)\s*$/;
const BARE_DECLARATION_RE = /^([A-Za-z_][\w]*)\s*$/;
const PROPERTY_RE = /^([!@&]?[A-Za-z_][\w\-.]*)\s*:\s*(.*)$/;
const STATE_RE = /^(\$[^:]+):\s*$/;

export function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function createNode(name: string, base: string | null, source: string): StyleNode {
  return { name, base, properties: {}, states: {}, children: [], source };
}

/**
 * Parses a stylesheet into top-level style definitions.
 * Unknown/odd lines are ignored rather than throwing — stylesheets ship with
 * constructs (Lua blocks, directives) the editor does not need to understand.
 */
export function parseStylesheet(text: string, source = '<memory>'): StyleNode[] {
  const lines: Line[] = [];
  for (const raw of text.split('\n')) {
    const withoutComment = stripComment(raw);
    const trimmed = withoutComment.trim();
    if (!trimmed || trimmed === '{' || trimmed === '}') continue;
    lines.push({ indent: measureIndent(withoutComment), text: trimmed });
  }

  const roots: StyleNode[] = [];
  const stack: { node: StyleNode; indent: number }[] = [];
  // Active `$state:` block, applied to the node it is nested under.
  let stateContext: { node: StyleNode; selector: string; indent: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const { indent, text } = lines[i];

    if (stateContext && indent <= stateContext.indent) stateContext = null;
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop();

    const stateMatch = text.match(STATE_RE);
    if (stateMatch && stack.length > 0) {
      const selector = stateMatch[1].trim();
      const owner = stack[stack.length - 1].node;
      owner.states[selector] ??= {};
      stateContext = { node: owner, selector, indent };
      continue;
    }

    const propertyMatch = text.match(PROPERTY_RE);
    if (propertyMatch && stack.length > 0) {
      const key = propertyMatch[1];
      let value = propertyMatch[2].trim();

      // Multi-line blocks: `@onClick: |` followed by an indented Lua body.
      if (value === '|') {
        const body: string[] = [];
        while (i + 1 < lines.length && lines[i + 1].indent > indent) {
          body.push(lines[++i].text);
        }
        value = body.join('\n');
      }

      // `layout:` introduces a nested block of layout.* properties.
      if (key === 'layout' && value === '') {
        const owner = stack[stack.length - 1].node;
        while (i + 1 < lines.length && lines[i + 1].indent > indent) {
          const inner = lines[++i].text.match(PROPERTY_RE);
          if (inner) owner.properties[`layout.${inner[1]}`] = inner[2].trim();
        }
        continue;
      }

      if (stateContext) stateContext.node.states[stateContext.selector][key] = value;
      else stack[stack.length - 1].node.properties[key] = value;
      continue;
    }

    // Widget declaration.
    let node: StyleNode | null = null;
    const declaration = text.match(DECLARATION_RE);
    if (declaration) {
      node = createNode(declaration[1], declaration[2], source);
    } else {
      const bare = text.match(BARE_DECLARATION_RE);
      // A bare name instantiates an existing style. At root it is loadUI's
      // runtime widget; nested it is a child of the surrounding style/widget.
      if (bare) node = stack.length === 0 ? createNode(bare[1], null, source) : createNode('', bare[1], source);
    }
    if (!node) continue;

    if (stack.length === 0) roots.push(node);
    else stack[stack.length - 1].node.children.push(node);
    stack.push({ node, indent });
  }

  return roots;
}
