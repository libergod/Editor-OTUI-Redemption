// Maps OTClient font names (e.g. "verdana-11px-antialised") to CSS.
//
// OTClient renders bitmap fonts described by data/fonts/otfont/*.otfont. The
// browser cannot use those textures directly, so each font is approximated with
// the matching TTF from data/fonts/ttf plus the metrics declared in the .otfont
// file (nominal px size from the name, line-height from `height`).

import type { ClientAssetSource } from './source';

export interface FontMetrics {
  name: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
}

const OTFONT_DIR = 'data/fonts/otfont';
const TTF_DIR = 'data/fonts/ttf';

/** TTF files registered as web fonts, keyed by the CSS family name they provide. */
const TTF_FAMILIES: Record<string, string[]> = {
  'OTC Verdana': ['Verdana.ttf', 'Verdana-Pro.ttf'],
  'OTC Verdana Bold': ['verdana-bold.ttf'],
  'OTC Verdana Italic': ['Verdana-Italic.ttf'],
  'OTC Terminus': ['TerminusTTF-4.49.3.ttf'],
  'OTC Terminus Bold': ['TerminusTTF-Bold-4.49.3.ttf'],
  'OTC Arial': ['arial.ttf'],
};

const FALLBACK_STACK = 'Verdana, Geneva, DejaVu Sans, sans-serif';

export const DEFAULT_FONT_METRICS: FontMetrics = {
  name: 'verdana-11px-antialised',
  fontFamily: `"OTC Verdana", ${FALLBACK_STACK}`,
  fontSize: 11,
  lineHeight: 14,
  fontWeight: 'normal',
  fontStyle: 'normal',
};

function familyFor(fontName: string, bold: boolean, italic: boolean): string {
  const lower = fontName.toLowerCase();
  if (lower.includes('terminus')) {
    return `"OTC Terminus${bold ? ' Bold' : ''}", "Courier New", monospace`;
  }
  if (lower.includes('cipsoft')) {
    // cipsoftFont is a chunky pixel face; Terminus is the closest shipped TTF.
    return `"OTC Terminus", "Courier New", monospace`;
  }
  if (lower.includes('sans')) {
    return `"OTC Arial", Arial, Helvetica, sans-serif`;
  }
  if (italic) return `"OTC Verdana Italic", ${FALLBACK_STACK}`;
  if (bold) return `"OTC Verdana Bold", ${FALLBACK_STACK}`;
  return `"OTC Verdana", ${FALLBACK_STACK}`;
}

function parseOtfont(text: string, fileName: string): FontMetrics | null {
  const get = (key: string): string | null => {
    const match = text.match(new RegExp(`^\\s*${key}\\s*:\\s*(.+)$`, 'm'));
    return match ? match[1].trim() : null;
  };

  const name = get('name') ?? fileName.replace(/\.otfont$/i, '');
  const lower = name.toLowerCase();
  const bold = lower.includes('bold') || lower.includes('-b');
  const italic = lower.includes('italic');

  const sizeMatch = lower.match(/(\d+)px/);
  const fontSize = sizeMatch ? Number(sizeMatch[1]) : 11;
  const declaredHeight = Number(get('height'));
  const lineHeight = Number.isFinite(declaredHeight) && declaredHeight > 0 ? declaredHeight : fontSize + 3;

  return {
    name,
    fontFamily: familyFor(name, bold, italic),
    fontSize,
    lineHeight,
    fontWeight: bold ? 'bold' : 'normal',
    fontStyle: italic ? 'italic' : 'normal',
  };
}

export class FontRegistry {
  private readonly fonts = new Map<string, FontMetrics>();

  get size(): number {
    return this.fonts.size;
  }

  add(metrics: FontMetrics): void {
    this.fonts.set(metrics.name, metrics);
  }

  /** Resolved metrics for an OTUI `font:` value, falling back to a name heuristic. */
  get(fontName: string | undefined): FontMetrics {
    if (!fontName) return DEFAULT_FONT_METRICS;
    const known = this.fonts.get(fontName);
    if (known) return known;

    const lower = fontName.toLowerCase();
    const bold = lower.includes('bold');
    const italic = lower.includes('italic');
    const sizeMatch = lower.match(/(\d+)px/);
    const fontSize = sizeMatch ? Number(sizeMatch[1]) : 11;
    return {
      name: fontName,
      fontFamily: familyFor(fontName, bold, italic),
      fontSize,
      lineHeight: fontSize + 3,
      fontWeight: bold ? 'bold' : 'normal',
      fontStyle: italic ? 'italic' : 'normal',
    };
  }
}

async function registerWebFonts(source: ClientAssetSource): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;

  await Promise.all(
    Object.entries(TTF_FAMILIES).map(async ([family, candidates]) => {
      for (const fileName of candidates) {
        const url = await source.readUrl(`${TTF_DIR}/${fileName}`);
        if (!url) continue;
        try {
          const face = new FontFace(family, `url("${url}")`);
          await face.load();
          document.fonts.add(face);
          return;
        } catch {
          /* try the next candidate */
        }
      }
    }),
  );
}

export async function loadFontRegistry(source: ClientAssetSource): Promise<FontRegistry> {
  const registry = new FontRegistry();

  const entries = await source.list(OTFONT_DIR);
  await Promise.all(
    entries
      .filter((entry) => entry.kind === 'file' && entry.name.toLowerCase().endsWith('.otfont'))
      .map(async (entry) => {
        const text = await source.readText(entry.path);
        if (!text) return;
        const metrics = parseOtfont(text, entry.name);
        if (metrics) registry.add(metrics);
      }),
  );

  await registerWebFonts(source);
  return registry;
}
