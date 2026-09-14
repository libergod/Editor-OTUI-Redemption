// Abstraction over a local OTClient installation ("client folder").
//
// Two implementations exist:
//  - DevBridgeAssetSource:  talks to the Vite dev middleware (vite-otclient-plugin.ts)
//  - DirectoryAssetSource:  uses the File System Access API on a user-picked folder
//
// All paths are POSIX-style and relative to the OTClient root, e.g.
// "data/styles/10-buttons.otui" or "modules/game_healthinfo/healthinfo.otui".

export type AssetEntryKind = 'file' | 'directory';

export interface AssetEntry {
  name: string;
  path: string;
  kind: AssetEntryKind;
}

export interface ClientAssetSource {
  readonly kind: 'dev-bridge' | 'directory';
  /** Human readable origin, shown in the UI. */
  readonly label: string;
  readText(path: string): Promise<string | null>;
  /** A URL usable in `src`/`url()` for the given binary asset, or null if missing. */
  readUrl(path: string): Promise<string | null>;
  list(path: string): Promise<AssetEntry[]>;
  dispose(): void;
}

export function normalizeAssetPath(path: string): string {
  return path
    .replace(/\\/g, '/')
    .split('/')
    .filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..')
    .join('/');
}

// ---------------------------------------------------------------------------
// Dev bridge
// ---------------------------------------------------------------------------

export async function isDevBridgeAvailable(): Promise<boolean> {
  try {
    const res = await fetch('/otclient-api/info');
    if (!res.ok) return false;
    const body = (await res.json()) as { available?: boolean };
    return body.available === true;
  } catch {
    return false;
  }
}

export class DevBridgeAssetSource implements ClientAssetSource {
  readonly kind = 'dev-bridge' as const;

  constructor(readonly label: string) {}

  static async create(): Promise<DevBridgeAssetSource | null> {
    try {
      const res = await fetch('/otclient-api/info');
      if (!res.ok) return null;
      const body = (await res.json()) as { available?: boolean; root?: string };
      if (!body.available) return null;
      return new DevBridgeAssetSource(body.root ?? 'dev bridge');
    } catch {
      return null;
    }
  }

  private url(path: string): string {
    return `/otclient-fs/${normalizeAssetPath(path)}`;
  }

  async readText(path: string): Promise<string | null> {
    try {
      const res = await fetch(this.url(path));
      return res.ok ? await res.text() : null;
    } catch {
      return null;
    }
  }

  async readUrl(path: string): Promise<string | null> {
    // The bridge streams files directly; no probe needed (a HEAD round-trip here
    // only adds latency and is aborted by the dev server for binary streams).
    return this.url(path);
  }

  async list(path: string): Promise<AssetEntry[]> {
    try {
      const res = await fetch(`/otclient-api/list?path=${encodeURIComponent(normalizeAssetPath(path))}`);
      if (!res.ok) return [];
      const body = (await res.json()) as { entries?: AssetEntry[] };
      return body.entries ?? [];
    } catch {
      return [];
    }
  }

  dispose(): void {
    /* nothing to release */
  }
}

// ---------------------------------------------------------------------------
// File System Access API
// ---------------------------------------------------------------------------

export function isDirectoryPickerSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export class DirectoryAssetSource implements ClientAssetSource {
  readonly kind = 'directory' as const;
  private objectUrls = new Map<string, string>();

  constructor(
    private readonly root: FileSystemDirectoryHandle,
    readonly label: string,
  ) {}

  static async pick(): Promise<DirectoryAssetSource | null> {
    if (!isDirectoryPickerSupported()) {
      throw new Error('This browser does not support picking a folder. Use Chrome or Edge.');
    }
    const picker = (
      window as unknown as {
        showDirectoryPicker: (opts?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
      }
    ).showDirectoryPicker;

    let handle: FileSystemDirectoryHandle;
    try {
      handle = await picker({ mode: 'read' });
    } catch {
      return null; // user cancelled
    }

    const source = new DirectoryAssetSource(handle, handle.name);
    const probe = await source.resolveDirectory('data/styles');
    if (!probe) {
      throw new Error(
        `"${handle.name}" does not look like an OTClient folder (no data/styles directory found).`,
      );
    }
    return source;
  }

  private async resolveDirectory(path: string): Promise<FileSystemDirectoryHandle | null> {
    const segments = normalizeAssetPath(path).split('/').filter(Boolean);
    let dir = this.root;
    for (const segment of segments) {
      try {
        dir = await dir.getDirectoryHandle(segment);
      } catch {
        return null;
      }
    }
    return dir;
  }

  private async resolveFile(path: string): Promise<File | null> {
    const segments = normalizeAssetPath(path).split('/').filter(Boolean);
    const fileName = segments.pop();
    if (!fileName) return null;
    const dir = await this.resolveDirectory(segments.join('/'));
    if (!dir) return null;
    try {
      const fileHandle = await dir.getFileHandle(fileName);
      return await fileHandle.getFile();
    } catch {
      return null;
    }
  }

  async readText(path: string): Promise<string | null> {
    const file = await this.resolveFile(path);
    return file ? await file.text() : null;
  }

  async readUrl(path: string): Promise<string | null> {
    const key = normalizeAssetPath(path);
    const cached = this.objectUrls.get(key);
    if (cached) return cached;
    const file = await this.resolveFile(key);
    if (!file) return null;
    const url = URL.createObjectURL(file);
    this.objectUrls.set(key, url);
    return url;
  }

  async list(path: string): Promise<AssetEntry[]> {
    const dir = await this.resolveDirectory(path);
    if (!dir) return [];
    const base = normalizeAssetPath(path);
    const entries: AssetEntry[] = [];
    const iterable = dir as unknown as AsyncIterable<[string, FileSystemHandle]>;
    for await (const [name, handle] of iterable) {
      entries.push({
        name,
        path: base ? `${base}/${name}` : name,
        kind: handle.kind === 'directory' ? 'directory' : 'file',
      });
    }
    return entries;
  }

  dispose(): void {
    for (const url of this.objectUrls.values()) URL.revokeObjectURL(url);
    this.objectUrls.clear();
  }
}
