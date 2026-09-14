// Loads game sprites from an OTClient `data/things/<version>` asset folder.
//
// The pipeline mirrors the client: catalog-content.json maps sprite id ranges to
// `.bmp.lzma` sheets, appearances.dat (protobuf) maps an item/outfit id to the
// sprite ids it draws. Sheets are decompressed once and cached as canvases.

import type { ClientAssetSource } from './source';
import { decodeCipLzma } from './lzma';

const THINGS_DIR = 'data/things';
const SHEET_PIXELS = 384 * 384 * 4;

export interface SpriteSheetEntry {
  file: string;
  spriteType: number;
  firstSpriteId: number;
  lastSpriteId: number;
}

/** Sprite dimensions per catalog `spritetype`. */
const SPRITE_SIZES: Record<number, [number, number]> = {
  0: [32, 32],
  1: [32, 64],
  2: [64, 32],
  3: [64, 64],
};

export interface ThingsCatalog {
  version: string;
  sheets: SpriteSheetEntry[];
  appearancesFile: string | null;
}

/** Lists the asset versions present in data/things (e.g. "1525"). */
export async function listThingsVersions(source: ClientAssetSource): Promise<string[]> {
  const entries = await source.list(THINGS_DIR);
  return entries.filter((e) => e.kind === 'directory').map((e) => e.name).sort();
}

export async function loadThingsCatalog(
  source: ClientAssetSource,
  version: string,
): Promise<ThingsCatalog | null> {
  const text = await source.readText(`${THINGS_DIR}/${version}/catalog-content.json`);
  if (!text) return null;

  let raw: Array<Record<string, unknown>>;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }

  const sheets: SpriteSheetEntry[] = [];
  let appearancesFile: string | null = null;

  for (const entry of raw) {
    if (entry.type === 'sprite' && typeof entry.file === 'string') {
      sheets.push({
        file: entry.file,
        spriteType: Number(entry.spritetype ?? 0),
        firstSpriteId: Number(entry.firstspriteid ?? 0),
        lastSpriteId: Number(entry.lastspriteid ?? 0),
      });
    } else if (entry.type === 'appearances' && typeof entry.file === 'string') {
      appearancesFile = entry.file;
    }
  }

  sheets.sort((a, b) => a.firstSpriteId - b.firstSpriteId);
  return { version, sheets, appearancesFile };
}

// ---------------------------------------------------------------------------
// Sprite sheets
// ---------------------------------------------------------------------------

/** Reads a 32bpp bottom-up BMP into top-down RGBA, treating magenta as transparent. */
function bmpToImageData(bmp: Uint8Array): ImageData | null {
  if (bmp.length < 54 || bmp[0] !== 0x42 || bmp[1] !== 0x4d) return null;
  const view = new DataView(bmp.buffer, bmp.byteOffset, bmp.byteLength);

  const dataOffset = view.getUint32(10, true);
  const width = view.getInt32(18, true);
  const rawHeight = view.getInt32(22, true);
  const bitsPerPixel = view.getUint16(28, true);
  if (bitsPerPixel !== 32) return null;

  const height = Math.abs(rawHeight);
  const bottomUp = rawHeight > 0;
  if (dataOffset + width * height * 4 > bmp.length) return null;

  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const sourceRow = bottomUp ? height - 1 - y : y;
    let src = dataOffset + sourceRow * width * 4;
    let dst = y * width * 4;
    for (let x = 0; x < width; x++) {
      const b = bmp[src++];
      const g = bmp[src++];
      const r = bmp[src++];
      const a = bmp[src++];
      // The client keys out magenta rather than relying on the alpha channel.
      const transparent = r === 0xff && g === 0x00 && b === 0xff;
      pixels[dst++] = r;
      pixels[dst++] = g;
      pixels[dst++] = b;
      pixels[dst++] = transparent ? 0 : a === 0 ? 0xff : a;
    }
  }

  return new ImageData(pixels, width, height);
}

export interface SpriteRequest {
  /** Sprite id as referenced by appearances.dat. */
  spriteId: number;
}

/**
 * Decompresses sprite sheets on demand and crops individual sprites out of them.
 * Lookups are synchronous; misses schedule a load and notify via `onChange`.
 */
export class SpriteStore {
  private readonly sheets = new Map<string, HTMLCanvasElement | null>();
  private readonly sprites = new Map<number, string | null>();
  private readonly pending = new Set<string>();

  constructor(
    private readonly source: ClientAssetSource,
    private readonly catalog: ThingsCatalog,
    private readonly onChange: () => void,
  ) {}

  private findSheet(spriteId: number): SpriteSheetEntry | null {
    // Ranges are sorted and disjoint.
    let low = 0;
    let high = this.catalog.sheets.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      const sheet = this.catalog.sheets[mid];
      if (spriteId < sheet.firstSpriteId) high = mid - 1;
      else if (spriteId > sheet.lastSpriteId) low = mid + 1;
      else return sheet;
    }
    return null;
  }

  /** Data URL of the sprite, or null while it loads (or if it does not exist). */
  get(spriteId: number): string | null {
    if (this.sprites.has(spriteId)) return this.sprites.get(spriteId) ?? null;

    const sheet = this.findSheet(spriteId);
    if (!sheet) {
      this.sprites.set(spriteId, null);
      return null;
    }

    const cached = this.sheets.get(sheet.file);
    if (cached !== undefined) {
      const url = cached ? this.crop(cached, sheet, spriteId) : null;
      this.sprites.set(spriteId, url);
      return url;
    }

    if (!this.pending.has(sheet.file)) {
      this.pending.add(sheet.file);
      void this.loadSheet(sheet);
    }
    return null;
  }

  private crop(sheet: HTMLCanvasElement, entry: SpriteSheetEntry, spriteId: number): string | null {
    const [spriteWidth, spriteHeight] = SPRITE_SIZES[entry.spriteType] ?? SPRITE_SIZES[0];
    const columns = Math.floor(sheet.width / spriteWidth);
    if (columns === 0) return null;

    const index = spriteId - entry.firstSpriteId;
    const sx = (index % columns) * spriteWidth;
    const sy = Math.floor(index / columns) * spriteHeight;

    const canvas = document.createElement('canvas');
    canvas.width = spriteWidth;
    canvas.height = spriteHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sheet, sx, sy, spriteWidth, spriteHeight, 0, 0, spriteWidth, spriteHeight);
    return canvas.toDataURL('image/png');
  }

  private async loadSheet(entry: SpriteSheetEntry): Promise<void> {
    let canvas: HTMLCanvasElement | null = null;
    try {
      const url = await this.source.readUrl(
        `${THINGS_DIR}/${this.catalog.version}/${entry.file}`,
      );
      if (url) {
        const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
        const image = bmpToImageData(decodeCipLzma(bytes, SHEET_PIXELS + 1024));
        if (image) {
          canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          canvas.getContext('2d')?.putImageData(image, 0, 0);
        }
      }
    } catch {
      canvas = null;
    }
    this.sheets.set(entry.file, canvas);
    this.pending.delete(entry.file);
    this.onChange();
  }
}

// ---------------------------------------------------------------------------
// appearances.dat (protobuf)
// ---------------------------------------------------------------------------

class ProtoReader {
  pos = 0;
  constructor(readonly bytes: Uint8Array) {}

  get done(): boolean {
    return this.pos >= this.bytes.length;
  }

  varint(): number {
    let result = 0;
    let shift = 0;
    while (this.pos < this.bytes.length) {
      const byte = this.bytes[this.pos++];
      result += (byte & 0x7f) * 2 ** shift;
      if ((byte & 0x80) === 0) break;
      shift += 7;
    }
    return result;
  }

  /** Advances past a field whose contents are not needed. */
  skip(wireType: number): void {
    if (wireType === 0) this.varint();
    else if (wireType === 1) this.pos += 8;
    else if (wireType === 2) {
      // Read the length first: `pos += varint()` would capture the pre-varint pos.
      const length = this.varint();
      this.pos += length;
    } else if (wireType === 5) this.pos += 4;
    else throw new Error(`unsupported protobuf wire type ${wireType}`);
  }

  sub(): ProtoReader {
    const length = this.varint();
    const reader = new ProtoReader(this.bytes.subarray(this.pos, this.pos + length));
    this.pos += length;
    return reader;
  }
}

/** Sprite ids for one appearance, in draw order. */
export type AppearanceIndex = Map<number, number[]>;

export interface AppearanceIndexes {
  objects: AppearanceIndex;
  outfits: AppearanceIndex;
}

// SpriteInfo.sprite_id is field 5 and may be packed.
function readSpriteInfo(reader: ProtoReader): number[] {
  const ids: number[] = [];
  while (!reader.done) {
    const tag = reader.varint();
    const field = tag >>> 3;
    const wireType = tag & 7;
    if (field === 5) {
      if (wireType === 2) {
        const packed = reader.sub();
        while (!packed.done) ids.push(packed.varint());
      } else {
        ids.push(reader.varint());
      }
    } else {
      reader.skip(wireType);
    }
  }
  return ids;
}

function readAppearance(reader: ProtoReader): { id: number; spriteIds: number[] } | null {
  let id = -1;
  const spriteIds: number[] = [];
  while (!reader.done) {
    const tag = reader.varint();
    const field = tag >>> 3;
    const wireType = tag & 7;
    if (field === 1 && wireType === 0) {
      id = reader.varint();
    } else if (field === 2 && wireType === 2) {
      // FrameGroup: only sprite_info (field 3) matters here.
      const group = reader.sub();
      while (!group.done) {
        const groupTag = group.varint();
        if (groupTag >>> 3 === 3 && (groupTag & 7) === 2) spriteIds.push(...readSpriteInfo(group.sub()));
        else group.skip(groupTag & 7);
      }
    } else {
      reader.skip(wireType);
    }
  }
  return id >= 0 ? { id, spriteIds } : null;
}

/** Parses appearances.dat into id -> sprite id lookups for objects and outfits. */
export function parseAppearances(bytes: Uint8Array): AppearanceIndexes {
  const objects: AppearanceIndex = new Map();
  const outfits: AppearanceIndex = new Map();
  const reader = new ProtoReader(bytes);

  while (!reader.done) {
    const tag = reader.varint();
    const field = tag >>> 3;
    const wireType = tag & 7;
    if (wireType !== 2 || (field !== 1 && field !== 2)) {
      reader.skip(wireType);
      continue;
    }
    const appearance = readAppearance(reader.sub());
    if (!appearance || appearance.spriteIds.length === 0) continue;
    (field === 1 ? objects : outfits).set(appearance.id, appearance.spriteIds);
  }

  return { objects, outfits };
}

export async function loadAppearances(
  source: ClientAssetSource,
  catalog: ThingsCatalog,
): Promise<AppearanceIndexes | null> {
  if (!catalog.appearancesFile) return null;
  const url = await source.readUrl(`${THINGS_DIR}/${catalog.version}/${catalog.appearancesFile}`);
  if (!url) return null;
  try {
    const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
    return parseAppearances(bytes);
  } catch {
    return null;
  }
}
