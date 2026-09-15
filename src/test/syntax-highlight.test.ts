import { describe, expect, it } from 'vitest';
import { highlightLua, highlightOTUI, type Token, type TokenKind } from '@/lib/syntax-highlight';

/** The kind assigned to the first token whose text matches `text`. */
function kindOf(lines: Token[][], text: string): TokenKind | undefined {
  for (const tokens of lines) {
    const match = tokens.find((token) => token.text === text);
    if (match) return match.kind;
  }
  return undefined;
}

/** Highlighting must never lose or reorder a single character. */
function rendered(lines: Token[][]): string {
  return lines.map((tokens) => tokens.map((token) => token.text).join('')).join('\n');
}

describe('otui highlighting', () => {
  const source = [
    'PreyTracker < MiniWindow',
    "  !text: tr('Prey')",
    '  image-clip: 28 0 14 14',
    '  color: #dfdfdfff',
    '  anchors.top: parent.top',
    '  @onClick: modules.game_prey.toggle()',
    '  $hover !disabled:',
    '    opacity: 0.5',
    '  // trailing comment',
  ].join('\n');
  const lines = highlightOTUI(source);

  it('round-trips the source exactly', () => {
    expect(rendered(lines)).toBe(source);
  });

  it('separates declarations from their base style', () => {
    expect(kindOf(lines, 'PreyTracker')).toBe('declaration');
    expect(kindOf(lines, 'MiniWindow')).toBe('base');
  });

  it('classifies the prefixed property forms', () => {
    expect(kindOf(lines, '!text')).toBe('directive');
    expect(kindOf(lines, '@onClick')).toBe('event');
    expect(kindOf(lines, '$hover !disabled')).toBe('state');
    expect(kindOf(lines, 'image-clip')).toBe('property');
  });

  it('classifies values', () => {
    expect(kindOf(lines, '#dfdfdfff')).toBe('color');
    expect(kindOf(lines, '28')).toBe('number');
    expect(kindOf(lines, 'parent.top')).toBe('anchor');
    expect(kindOf(lines, "'Prey'")).toBe('string');
  });

  it('keeps comments out of the code', () => {
    expect(kindOf(lines, '// trailing comment')).toBe('comment');
  });
});

describe('lua highlighting', () => {
  const source = [
    '-- sponsored by kivera-global.com',
    'local function check()',
    "  local title = window:getChildById('miniwindowTitle')",
    "  title:setText('Prey')",
    '  connect(g_game, { onGameStart = check })',
    'end',
  ].join('\n');
  const lines = highlightLua(source);

  it('round-trips the source exactly', () => {
    expect(rendered(lines)).toBe(source);
  });

  it('classifies keywords, builtins, calls and literals', () => {
    expect(kindOf(lines, 'local')).toBe('keyword');
    expect(kindOf(lines, 'g_game')).toBe('builtin');
    expect(kindOf(lines, 'getChildById')).toBe('function');
    expect(kindOf(lines, "'Prey'")).toBe('string');
    expect(kindOf(lines, '-- sponsored by kivera-global.com')).toBe('comment');
  });

  it('carries block comments across lines', () => {
    const block = highlightLua('--[[\nstill a comment\n]]\nlocal x = 1');
    expect(block[1][0].kind).toBe('comment');
    expect(kindOf([block[3]], 'local')).toBe('keyword');
  });
});
