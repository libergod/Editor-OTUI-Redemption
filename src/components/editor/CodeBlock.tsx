// Syntax-highlighted, line-numbered code view for the OTUI/Lua tabs.

import { useMemo } from 'react';
import { highlight, type Language, type TokenKind } from '@/lib/syntax-highlight';

const TOKEN_CLASS: Record<TokenKind, string> = {
  plain: 'text-foreground/85',
  comment: 'text-emerald-600/70 italic',
  declaration: 'text-yellow-300',
  operator: 'text-muted-foreground',
  base: 'text-sky-300',
  property: 'text-violet-300',
  event: 'text-pink-400',
  directive: 'text-orange-300',
  alias: 'text-teal-300',
  state: 'text-rose-400',
  string: 'text-amber-200',
  number: 'text-lime-300',
  color: 'text-cyan-300',
  keyword: 'text-blue-400',
  anchor: 'text-indigo-300',
  builtin: 'text-fuchsia-300',
  function: 'text-yellow-200',
};

export function CodeBlock({
  code,
  language,
  emptyMessage,
}: {
  code: string;
  language: Language;
  emptyMessage: string;
}) {
  const lines = useMemo(() => (code ? highlight(code, language) : []), [code, language]);

  if (lines.length === 0) {
    return <div className="p-3 text-[11px] font-mono text-muted-foreground">{emptyMessage}</div>;
  }

  const gutterWidth = `${String(lines.length).length + 1}ch`;

  return (
    <pre className="p-3 text-[11px] font-mono leading-relaxed whitespace-pre">
      {lines.map((tokens, index) => (
        <div key={index}>
          <span
            className="inline-block select-none text-muted-foreground/40 pr-3 text-right"
            style={{ width: gutterWidth }}
          >
            {index + 1}
          </span>
          {tokens.map((token, tokenIndex) => (
            <span key={tokenIndex} className={TOKEN_CLASS[token.kind]}>
              {token.text}
            </span>
          ))}
        </div>
      ))}
    </pre>
  );
}
