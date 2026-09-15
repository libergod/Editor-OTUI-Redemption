// Minimal token-level highlighters for the code view.
//
// OTUI is line-oriented (indentation is the only structure), so a per-line
// tokenizer is enough and avoids pulling a full grammar engine into the bundle.
// Token kinds follow the categories an OTUI language server exposes:
// declarations (`Name < Base`), properties, `$state` selectors, `@events`,
// `!directives`, `&aliases`, anchors, colors and embedded Lua.

export type TokenKind =
  | 'plain'
  | 'comment'
  | 'declaration'
  | 'operator'
  | 'base'
  | 'property'
  | 'event'
  | 'directive'
  | 'alias'
  | 'state'
  | 'string'
  | 'number'
  | 'color'
  | 'keyword'
  | 'anchor'
  | 'builtin'
  | 'function';

export interface Token {
  text: string;
  kind: TokenKind;
}

export type Language = 'otui' | 'lua';

function push(tokens: Token[], text: string, kind: TokenKind): void {
  if (text.length > 0) tokens.push({ text, kind });
}

// ---------------------------------------------------------------------------
// OTUI
// ---------------------------------------------------------------------------

const OTUI_VALUE_KEYWORDS = new Set([
  'true',
  'false',
  'parent',
  'prev',
  'next',
  'self',
  'none',
  'alpha',
  'vertical',
  'horizontal',
  'verticalBox',
  'horizontalBox',
  'grid',
  'center',
  'left',
  'right',
  'top',
  'bottom',
]);

/** Index of the comment marker (`//` or `--`) outside of quotes, or -1. */
function commentStart(line: string): number {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === quote && line[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if ((ch === '/' && line[i + 1] === '/') || (ch === '-' && line[i + 1] === '-')) return i;
  }
  return -1;
}

function otuiValueTokens(value: string): Token[] {
  const tokens: Token[] = [];
  // Colors, quoted strings, tr(), numbers, anchors (`parent.left`) and words.
  const pattern =
    /(#[0-9a-fA-F]{3,8})|("[^"]*"|'[^']*')|\b(tr)\b|(\b[A-Za-z_][\w-]*\.[A-Za-z_][\w.]*)|(-?\d+(?:\.\d+)?)|([A-Za-z_][\w-]*)/g;
  let last = 0;
  for (const match of value.matchAll(pattern)) {
    push(tokens, value.slice(last, match.index), 'plain');
    last = match.index + match[0].length;
    if (match[1]) push(tokens, match[0], 'color');
    else if (match[2]) push(tokens, match[0], 'string');
    else if (match[3]) push(tokens, match[0], 'function');
    else if (match[4]) push(tokens, match[0], 'anchor');
    else if (match[5]) push(tokens, match[0], 'number');
    else push(tokens, match[0], OTUI_VALUE_KEYWORDS.has(match[0]) ? 'keyword' : 'plain');
  }
  push(tokens, value.slice(last), 'plain');
  return tokens;
}

function highlightOTUILine(line: string): Token[] {
  const tokens: Token[] = [];

  const comment = commentStart(line);
  const code = comment >= 0 ? line.slice(0, comment) : line;
  const trailing = comment >= 0 ? line.slice(comment) : '';

  const indent = code.match(/^\s*/)?.[0] ?? '';
  const body = code.slice(indent.length);
  push(tokens, indent, 'plain');

  if (body.length === 0) {
    push(tokens, trailing, 'comment');
    return tokens;
  }

  // `Name < Base`
  const declaration = body.match(/^([A-Za-z_]\w*)(\s*<\s*)([A-Za-z_]\w*)(\s*)$/);
  if (declaration) {
    push(tokens, declaration[1], 'declaration');
    push(tokens, declaration[2], 'operator');
    push(tokens, declaration[3], 'base');
    push(tokens, declaration[4], 'plain');
    push(tokens, trailing, 'comment');
    return tokens;
  }

  // `key: value`, including the !/@/&/$ prefixed forms.
  const property = body.match(/^([!@&$]?[A-Za-z_][\w\-.]*(?:\s+[!$][\w!]+)*)(\s*:\s*)([\s\S]*)$/);
  if (property) {
    const key = property[1];
    const kind: TokenKind = key.startsWith('@')
      ? 'event'
      : key.startsWith('!')
        ? 'directive'
        : key.startsWith('&')
          ? 'alias'
          : key.startsWith('$')
            ? 'state'
            : 'property';
    push(tokens, key, kind);
    push(tokens, property[2], 'operator');
    // `@event:` and `!expr:` values are Lua, not OTUI values.
    if (kind === 'event' || kind === 'directive' || kind === 'alias') {
      tokens.push(...highlightLuaLine(property[3]));
    } else {
      tokens.push(...otuiValueTokens(property[3]));
    }
    push(tokens, trailing, 'comment');
    return tokens;
  }

  // A bare name instantiates a style.
  push(tokens, body, /^[A-Z]/.test(body) ? 'base' : 'plain');
  push(tokens, trailing, 'comment');
  return tokens;
}

export function highlightOTUI(text: string): Token[][] {
  return text.split('\n').map(highlightOTUILine);
}

// ---------------------------------------------------------------------------
// Lua
// ---------------------------------------------------------------------------

const LUA_KEYWORDS = new Set([
  'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function', 'goto', 'if', 'in',
  'local', 'nil', 'not', 'or', 'repeat', 'return', 'then', 'true', 'until', 'while',
]);

/** OTClient's Lua environment, worth colouring apart from user code. */
const LUA_BUILTINS = new Set([
  'g_game', 'g_ui', 'g_window', 'g_mouse', 'g_keyboard', 'g_settings', 'g_resources', 'g_sounds',
  'g_things', 'g_logger', 'g_platform', 'g_modules', 'g_effects', 'g_app', 'g_clock',
  'modules', 'connect', 'disconnect', 'scheduleEvent', 'addEvent', 'removeEvent', 'tr', 'self',
  'string', 'table', 'math', 'os', 'io', 'pairs', 'ipairs', 'type', 'tonumber', 'tostring', 'print',
]);

function highlightLuaLine(line: string): Token[] {
  const tokens: Token[] = [];
  const pattern =
    /(--\[\[[\s\S]*?\]\]|--.*$)|(\[\[[\s\S]*?\]\]|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b0[xX][0-9a-fA-F]+\b|\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)(\s*\()|([A-Za-z_]\w*)/g;

  let last = 0;
  for (const match of line.matchAll(pattern)) {
    push(tokens, line.slice(last, match.index), 'plain');
    last = match.index + match[0].length;

    if (match[1]) push(tokens, match[0], 'comment');
    else if (match[2]) push(tokens, match[0], 'string');
    else if (match[3]) push(tokens, match[0], 'number');
    else if (match[4]) {
      // An identifier immediately followed by `(` is a call.
      push(tokens, match[4], LUA_KEYWORDS.has(match[4]) ? 'keyword' : LUA_BUILTINS.has(match[4]) ? 'builtin' : 'function');
      push(tokens, match[5], 'plain');
    } else {
      const word = match[6];
      push(tokens, word, LUA_KEYWORDS.has(word) ? 'keyword' : LUA_BUILTINS.has(word) ? 'builtin' : 'plain');
    }
  }
  push(tokens, line.slice(last), 'plain');
  return tokens;
}

export function highlightLua(text: string): Token[][] {
  const lines = text.split('\n');
  const result: Token[][] = [];
  let inBlockComment = false;

  for (const line of lines) {
    if (inBlockComment) {
      const close = line.indexOf(']]');
      if (close < 0) {
        result.push([{ text: line, kind: 'comment' }]);
        continue;
      }
      inBlockComment = false;
      const tokens: Token[] = [{ text: line.slice(0, close + 2), kind: 'comment' }];
      tokens.push(...highlightLuaLine(line.slice(close + 2)));
      result.push(tokens);
      continue;
    }

    const open = line.match(/--\[\[/);
    if (open && !line.slice(open.index).includes(']]')) {
      inBlockComment = true;
      const tokens = highlightLuaLine(line.slice(0, open.index));
      tokens.push({ text: line.slice(open.index), kind: 'comment' });
      result.push(tokens);
      continue;
    }

    result.push(highlightLuaLine(line));
  }

  return result;
}

export function highlight(text: string, language: Language): Token[][] {
  return language === 'lua' ? highlightLua(text) : highlightOTUI(text);
}
