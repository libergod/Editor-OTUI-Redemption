// Owns the connection to a local OTClient installation and exposes the
// resolved style/font/image registries to the editor.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ClientAssetSource,
  DevBridgeAssetSource,
  DirectoryAssetSource,
  isDirectoryPickerSupported,
} from './source';
import { StyleRegistry, loadStyleRegistry } from './style-registry';
import { FontRegistry, loadFontRegistry } from './fonts';
import { ImageCache } from './images';
import {
  SpriteStore,
  listThingsVersions,
  loadAppearances,
  loadThingsCatalog,
  type AppearanceIndexes,
  type ThingsCatalog,
} from './things';
import type { SkinContext, ThingSpriteResolver } from './otui-css';
import { extractLuaBindings, type LuaBindings } from './lua-bindings';

export type ClientAssetsStatus = 'idle' | 'connecting' | 'ready' | 'error';

export interface ClientAssetsValue {
  status: ClientAssetsStatus;
  error: string | null;
  /** Where the assets come from (dev bridge path or picked folder name). */
  origin: string | null;
  source: ClientAssetSource | null;
  styles: StyleRegistry | null;
  fonts: FontRegistry | null;
  images: ImageCache | null;
  /** Bumped whenever a sprite finishes decoding, so renderers re-run. */
  revision: number;
  loadedStylesheets: string[];
  /** Asset version loaded from data/things, if any. */
  thingsVersion: string | null;
  /** True while the things folder is still being indexed. */
  thingsLoading: boolean;
  /** True while the editor should use real client assets instead of placeholders. */
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  connectDevBridge: () => Promise<void>;
  connectFolder: () => Promise<void>;
  installModuleStyles: (files: { path: string; text: string }[]) => StyleRegistry | null;
  /** Indexes a module's scripts so the preview can show the values they assign. */
  installModuleScripts: (scripts: { text: string }[]) => void;
  disconnect: () => void;
  canPickFolder: boolean;
  skin: SkinContext;
}

const ClientAssetsContext = createContext<ClientAssetsValue | null>(null);

const ENABLED_STORAGE_KEY = 'otui-editor.client-assets.enabled';

function readEnabledPreference(): boolean {
  if (typeof localStorage === 'undefined') return true;
  return localStorage.getItem(ENABLED_STORAGE_KEY) !== 'false';
}

export function ClientAssetsProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ClientAssetsStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string | null>(null);
  const [source, setSource] = useState<ClientAssetSource | null>(null);
  const [styles, setStyles] = useState<StyleRegistry | null>(null);
  const [fonts, setFonts] = useState<FontRegistry | null>(null);
  const [images, setImages] = useState<ImageCache | null>(null);
  const [loadedStylesheets, setLoadedStylesheets] = useState<string[]>([]);
  const [sprites, setSprites] = useState<SpriteStore | null>(null);
  const [appearances, setAppearances] = useState<AppearanceIndexes | null>(null);
  const [thingsVersion, setThingsVersion] = useState<string | null>(null);
  const [thingsLoading, setThingsLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [enabled, setEnabledState] = useState(readEnabledPreference);
  const [bindings, setBindings] = useState<LuaBindings | null>(null);

  const installModuleScripts = useCallback((scripts: { text: string }[]) => {
    setBindings(extractLuaBindings(scripts));
  }, []);

  const sourceRef = useRef<ClientAssetSource | null>(null);
  const baseStylesRef = useRef<StyleRegistry | null>(null);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    try {
      localStorage.setItem(ENABLED_STORAGE_KEY, String(next));
    } catch {
      /* storage unavailable (private mode) — preference is session-only */
    }
  }, []);

  const disconnect = useCallback(() => {
    sourceRef.current?.dispose();
    sourceRef.current = null;
    baseStylesRef.current = null;
    setSource(null);
    setStyles(null);
    setFonts(null);
    setImages(null);
    setSprites(null);
    setAppearances(null);
    setThingsVersion(null);
    setThingsLoading(false);
    setLoadedStylesheets([]);
    setOrigin(null);
    setError(null);
    setStatus('idle');
  }, []);
  const installModuleStyles = useCallback((files: { path: string; text: string }[]) => {    const baseStyles = baseStylesRef.current;
    if (!baseStyles) return null;
    const moduleStyles = baseStyles.clone();
    for (const file of files) moduleStyles.addStylesheet(file.text, file.path);
    setStyles(moduleStyles);
    setLoadedStylesheets([...moduleStyles.files]);
    setRevision((revision) => revision + 1);
    return moduleStyles;
  }, []);

  const loadThings = useCallback(async (next: ClientAssetSource) => {
    setThingsLoading(true);
    try {
      const versions = await listThingsVersions(next);
      // Highest version wins, matching what the client would load last.
      const version = versions.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).pop();
      if (!version) return;

      const catalog: ThingsCatalog | null = await loadThingsCatalog(next, version);
      if (!catalog) return;

      setSprites(new SpriteStore(next, catalog, () => setRevision((r) => r + 1)));
      setThingsVersion(version);
      setRevision((r) => r + 1);

      const indexes = await loadAppearances(next, catalog);
      if (indexes) {
        setAppearances(indexes);
        setRevision((r) => r + 1);
      }
    } finally {
      setThingsLoading(false);
    }
  }, []);

  const activate = useCallback(async (next: ClientAssetSource) => {
    setStatus('connecting');
    setError(null);
    try {
      const cache = new ImageCache(next, () => setRevision((r) => r + 1));
      const [styleResult, fontRegistry] = await Promise.all([
        loadStyleRegistry(next),
        loadFontRegistry(next),
      ]);

      if (styleResult.loaded.length === 0) {
        throw new Error('No stylesheets found in data/styles.');
      }

      sourceRef.current?.dispose();
      sourceRef.current = next;
      baseStylesRef.current = styleResult.registry;

      setSource(next);
      setImages(cache);
      setStyles(styleResult.registry);
      setFonts(fontRegistry);
      setLoadedStylesheets(styleResult.loaded);
      setOrigin(next.label);
      setStatus('ready');
      setRevision((r) => r + 1);

      // Game sprites are large and optional; index them in the background.
      void loadThings(next);
    } catch (err) {
      next.dispose();
      setError(err instanceof Error ? err.message : 'Failed to load client assets.');
      setStatus('error');
    }
  }, [loadThings]);

  const connectDevBridge = useCallback(async () => {
    const bridge = await DevBridgeAssetSource.create();
    if (!bridge) {
      setError('The dev asset bridge is unavailable. Set OTCLIENT_PATH and restart the dev server.');
      setStatus('error');
      return;
    }
    await activate(bridge);
  }, [activate]);

  const connectFolder = useCallback(async () => {
    try {
      const picked = await DirectoryAssetSource.pick();
      if (picked) await activate(picked);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open the selected folder.');
      setStatus('error');
    }
  }, [activate]);

  // Auto-connect to the sibling otclient repo when the dev bridge is running.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const bridge = await DevBridgeAssetSource.create();
      if (bridge && !cancelled) await activate(bridge);
      else if (bridge) bridge.dispose();
    })();
    return () => {
      cancelled = true;
    };
  }, [activate]);

  useEffect(() => () => sourceRef.current?.dispose(), []);

  const value = useMemo<ClientAssetsValue>(() => {
    const active = enabled && status === 'ready';

    const spriteResolver: ThingSpriteResolver | null =
      active && sprites && appearances
        ? (kind, id) => {
            const index = kind === 'item' ? appearances.objects : appearances.outfits;
            const spriteIds = index.get(id);
            return spriteIds && spriteIds.length > 0 ? sprites.get(spriteIds[0]) : null;
          }
        : null;

    return {
      status,
      error,
      origin,
      source,
      styles,
      fonts,
      images,
      revision,
      loadedStylesheets,
      thingsVersion,
      thingsLoading,
      enabled,
      setEnabled,
      connectDevBridge,
      connectFolder,
      installModuleStyles,
      installModuleScripts,
      disconnect,
      canPickFolder: isDirectoryPickerSupported(),
      skin: {
        registry: active ? styles : null,
        fonts: active ? fonts : null,
        images: active ? images : null,
        sprites: spriteResolver,
        bindings: active ? bindings : null,
      },
    };
  }, [
    status,
    error,
    origin,
    source,
    styles,
    fonts,
    images,
    sprites,
    appearances,
    revision,
    loadedStylesheets,
    thingsVersion,
    thingsLoading,
    enabled,
    setEnabled,
    connectDevBridge,
    connectFolder,
    installModuleStyles,
    installModuleScripts,
    bindings,
    disconnect,
  ]);

  return <ClientAssetsContext.Provider value={value}>{children}</ClientAssetsContext.Provider>;
}

export function useClientAssets(): ClientAssetsValue {
  const ctx = useContext(ClientAssetsContext);
  if (!ctx) throw new Error('useClientAssets must be used within a ClientAssetsProvider');
  return ctx;
}

/** Convenience hook for renderers: the skin context plus its invalidation key. */
export function useSkin(): SkinContext & { revision: number } {
  const { skin, revision } = useClientAssets();
  return useMemo(() => ({ ...skin, revision }), [skin, revision]);
}
