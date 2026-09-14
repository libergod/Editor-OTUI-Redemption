// Resolves OTUI `image-source` values into browser-usable images.
//
// OTClient draws a widget's image as a sprite region (`image-clip`) of a source
// texture, optionally tinted (`image-color`) and optionally 9-sliced
// (`image-border`). The browser cannot express "clip + 9-slice" with plain CSS,
// so the requested region is cropped (and tinted) onto a canvas once and cached
// as a data URL, which is then used as a `border-image`/`background-image`.

import type { ClientAssetSource } from './source';

export interface ImageRequest {
  /** Raw OTUI value, e.g. "/images/ui/buttons" or "images/ui/panel_flat.png". */
  source: string;
  /** "x y width height", if the widget clips the texture. */
  clip?: string;
  /** "#rrggbb[aa]" multiply tint. */
  color?: string;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];

/** Turns an OTUI image-source value into a path relative to the OTClient root. */
export function toAssetPath(source: string): string {
  let value = source.trim().replace(/^["']|["']$/g, '').replace(/\\/g, '/');
  if (!value) return '';
  value = value.replace(/^\/+/, '');
  if (!value.startsWith('data/')) value = `data/${value}`;
  return value;
}

/** Candidate file paths for a source that may or may not carry an extension. */
export function assetPathCandidates(source: string): string[] {
  const base = toAssetPath(source);
  if (!base) return [];
  const lower = base.toLowerCase();
  if (IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))) return [base];
  return IMAGE_EXTENSIONS.map((ext) => base + ext);
}

export function parseRect(value: string | undefined): Rect | null {
  if (!value) return null;
  const parts = value.trim().split(/\s+/).map(Number);
  if (parts.length < 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [x, y, width, height] = parts;
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

/** Normalizes `#rgb`, `#rrggbb`, `#rrggbbaa` and `alpha` forms into CSS. */
export function normalizeColor(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/^["']|["']$/g, '');
  if (!trimmed) return undefined;
  if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) return trimmed;
  if (/^(alpha|none)$/i.test(trimmed)) return 'transparent';
  return trimmed;
}

function hexToRgba(color: string): { r: number; g: number; b: number; a: number } | null {
  const match = color.trim().match(/^#([0-9a-f]{3,8})$/i);
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3 || hex.length === 4) hex = [...hex].map((c) => c + c).join('');
  if (hex.length !== 6 && hex.length !== 8) return null;
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
  };
}

export interface ResolvedImage {
  /** Data/object URL of the cropped + tinted region. */
  url: string;
  width: number;
  height: number;
}

function requestKey(request: ImageRequest): string {
  return `${request.source}|${request.clip ?? ''}|${request.color ?? ''}`;
}

async function decode(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = url;
  await image.decode();
  return image;
}

function crop(image: HTMLImageElement, clip: Rect | null, color: string | undefined): ResolvedImage | null {
  const region = clip ?? { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
  if (region.width <= 0 || region.height <= 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = region.width;
  canvas.height = region.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, region.x, region.y, region.width, region.height, 0, 0, region.width, region.height);

  const tint = color ? hexToRgba(color) : null;
  // OTClient multiplies the texture by image-color; #ffffff is a no-op.
  if (tint && !(tint.r === 255 && tint.g === 255 && tint.b === 255 && tint.a === 1)) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgb(${tint.r}, ${tint.g}, ${tint.b})`;
    ctx.fillRect(0, 0, region.width, region.height);
    // Restore the source alpha channel, which `multiply` does not preserve.
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(image, region.x, region.y, region.width, region.height, 0, 0, region.width, region.height);
    ctx.globalCompositeOperation = 'source-over';
    if (tint.a < 1) {
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = `rgba(0, 0, 0, ${tint.a})`;
      ctx.fillRect(0, 0, region.width, region.height);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  return { url: canvas.toDataURL('image/png'), width: region.width, height: region.height };
}

/**
 * Caches resolved sprite regions. Lookups are synchronous (so React render
 * stays sync); misses schedule a load and notify via `onChange` when ready.
 */
export class ImageCache {
  private readonly resolved = new Map<string, ResolvedImage | null>();
  private readonly pending = new Set<string>();

  constructor(
    private readonly source: ClientAssetSource,
    private readonly onChange: () => void,
  ) {}

  /** Returns the cropped image if cached, otherwise null and starts loading it. */
  get(request: ImageRequest): ResolvedImage | null {
    const key = requestKey(request);
    if (this.resolved.has(key)) return this.resolved.get(key) ?? null;
    if (!this.pending.has(key)) {
      this.pending.add(key);
      void this.load(key, request);
    }
    return null;
  }

  private async load(key: string, request: ImageRequest): Promise<void> {
    let result: ResolvedImage | null = null;
    try {
      for (const candidate of assetPathCandidates(request.source)) {
        const url = await this.source.readUrl(candidate);
        if (!url) continue;
        const image = await decode(url);
        result = crop(image, parseRect(request.clip), request.color);
        break;
      }
    } catch {
      result = null;
    }
    this.resolved.set(key, result);
    this.pending.delete(key);
    this.onChange();
  }
}
