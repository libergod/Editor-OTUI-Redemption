// Toolbar control for connecting the editor to a local OTClient installation.

import { useEffect, useMemo, useState } from 'react';
import { FileCode2, FolderOpen, Loader2, Plug, RefreshCw, Unplug } from 'lucide-react';
import { useClientAssets } from '@/lib/client-assets/client-assets-context';
import { useEditor } from '@/lib/editor-context';
import { parseOTUI } from '@/lib/otui-parser';
import type { AssetEntry } from '@/lib/client-assets/source';
import { loadModuleBundle, materializeModule, type ModuleBundle } from '@/lib/client-assets/module-loader';

const MODULES_DIR = 'modules';

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'ready' ? 'bg-emerald-500' : status === 'error' ? 'bg-red-500' : status === 'connecting' ? 'bg-amber-400' : 'bg-zinc-500';
  return <span className={`w-1.5 h-1.5 rounded-full ${color}`} />;
}

function ModuleBrowser({ onClose, onLoaded }: { onClose: () => void; onLoaded: (bundle: ModuleBundle) => void }) {
  const { source, installModuleStyles } = useClientAssets();
  const { dispatch, pushHistory } = useEditor();
  const [modules, setModules] = useState<AssetEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [files, setFiles] = useState<AssetEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!source) return;
    void source.list(MODULES_DIR).then((entries) => {
      setModules(entries.filter((e) => e.kind === 'directory').sort((a, b) => a.name.localeCompare(b.name)));
    });
  }, [source]);

  useEffect(() => {
    if (!source || !selected) {
      setFiles([]);
      return;
    }
    void source.list(selected).then((entries) => setFiles(entries.filter((entry) => entry.kind === 'file')));
  }, [source, selected]);

  const visibleModules = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return needle ? modules.filter((m) => m.name.toLowerCase().includes(needle)) : modules;
  }, [modules, filter]);

  const openFile = async (entry: AssetEntry) => {
    if (!source) return;
    setError(null);
    const text = await source.readText(entry.path);
    if (!text) {
      setError(`Could not read ${entry.name}.`);
      return;
    }
    try {
      dispatch({ type: 'SET_WIDGETS', widgets: parseOTUI(text) });
      pushHistory(`Open ${entry.name}`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to parse ${entry.name}.`);
    }
  };

  const openModule = async (entry: AssetEntry) => {
    if (!source) return;
    setError(null);
    try {
      const bundle = await loadModuleBundle(source, entry.path);
      const registry = installModuleStyles(bundle.uiFiles);
      if (!registry) throw new Error('Client styles are not ready.');
      const widgets = materializeModule(bundle, registry);
      if (widgets.length === 0) throw new Error('The module scripts do not load or create a visible UI root.');
      dispatch({ type: 'SET_WIDGETS', widgets });
      pushHistory(`Open module ${bundle.entry.name}`);
      onLoaded(bundle);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${entry.name}.`);
    }
  };

  const descriptor = files.find((file) => file.name.toLowerCase().endsWith('.otmod'));
  const otuiFiles = files.filter((file) => file.name.toLowerCase().endsWith('.otui'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-editor-panel border border-border rounded w-[640px] max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-2 border-b border-border flex items-center gap-2">
          <FolderOpen className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">Open OTClient module</span>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter modules..."
            className="ml-auto bg-secondary/50 border border-border rounded px-2 py-0.5 text-[11px] outline-none"
          />
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-2">
          <ul className="overflow-auto border-r border-border">
            {visibleModules.map((module) => (
              <li key={module.path}>
                <button
                  onClick={() => setSelected(module.path)}
                  className={`w-full text-left px-3 py-1 text-[11px] font-mono hover:bg-secondary/60 ${
                    selected === module.path ? 'bg-secondary text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {module.name}
                </button>
              </li>
            ))}
            {visibleModules.length === 0 && (
              <li className="px-3 py-2 text-[11px] text-muted-foreground">No modules found.</li>
            )}
          </ul>

          <div className="overflow-auto">
            {descriptor && (
              <button
                onClick={() => void openModule(descriptor)}
                className="m-3 mb-2 w-[calc(100%-1.5rem)] flex items-center justify-center gap-1.5 rounded bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <FileCode2 className="w-3.5 h-3.5" /> Open complete module
              </button>
            )}
            <ul className="border-t border-border pt-1">
            {otuiFiles.map((file) => (
              <li key={file.path}>
                <button
                  onClick={() => void openFile(file)}
                  className="w-full text-left px-3 py-1 text-[11px] font-mono text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                >
                  {file.name}
                </button>
              </li>
            ))}
            {selected && !descriptor && otuiFiles.length === 0 && (
              <li className="px-3 py-2 text-[11px] text-muted-foreground">No module descriptor or OTUI files found.</li>
            )}
            {!selected && <li className="px-3 py-2 text-[11px] text-muted-foreground">Select a module.</li>}
            </ul>
          </div>
        </div>

        {error && <div className="px-3 py-2 border-t border-border text-[11px] text-red-400">{error}</div>}
      </div>
    </div>
  );
}

export function ClientAssetsPanel() {
  const {
    status,
    error,
    origin,
    enabled,
    setEnabled,
    connectDevBridge,
    connectFolder,
    disconnect,
    canPickFolder,
    loadedStylesheets,
    thingsVersion,
    thingsLoading,
  } = useClientAssets();
  const [open, setOpen] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [loadedModule, setLoadedModule] = useState<ModuleBundle | null>(null);

  const label = status === 'ready' ? (enabled ? 'Client assets' : 'Client assets (off)') : 'No client';

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          title="Connect the editor to your OTClient folder"
        >
          {status === 'connecting' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <StatusDot status={status} />}
          {label}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 z-50 w-80 bg-editor-panel border border-border rounded shadow-lg p-3 space-y-2">
            <div className="text-[11px] text-muted-foreground">
              Renders the canvas and preview with the real styles, fonts and images from your OTClient
              installation.
            </div>

            {status === 'ready' && (
              <>
                <div className="text-[11px] font-mono break-all text-foreground/80">{origin}</div>
                <div className="text-[10px] text-muted-foreground">
                  {loadedStylesheets.length} stylesheets loaded
                </div>
                {loadedModule && (
                  <div className="rounded border border-border bg-secondary/30 p-2 text-[10px] text-muted-foreground">
                    <div className="font-mono text-foreground">{loadedModule.entry.name}</div>
                    <div>{loadedModule.modules.length - 1} dependencies, {loadedModule.scripts.length} Lua scripts, {loadedModule.uiFiles.length} OTUI files</div>
                    {loadedModule.uiFiles
                      .filter((file) => file.moduleName === loadedModule.entry.name)
                      .map((file) => (
                        <div key={file.path} className="font-mono text-foreground/80">
                          {file.path.split('/').pop()}: {file.lineCount} lines, {file.definitionCount} definitions
                        </div>
                      ))}
                    <div>
                      Total with dependencies: {loadedModule.uiFiles.reduce((total, file) => total + file.lineCount, 0)} lines,{' '}
                      {loadedModule.uiFiles.reduce((total, file) => total + file.definitionCount, 0)} definitions
                    </div>
                    {loadedModule.warnings.map((warning) => <div key={warning} className="text-amber-400">{warning}</div>)}
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground">
                  {thingsLoading
                    ? 'Indexing game sprites...'
                    : thingsVersion
                      ? `Game sprites: assets ${thingsVersion}`
                      : 'No game sprites (data/things)'}
                </div>
                <label className="flex items-center gap-2 text-[11px]">
                  <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                  Use client assets for rendering
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setBrowsing(true);
                      setOpen(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-[11px] bg-secondary hover:bg-secondary/80"
                  >
                    <FolderOpen className="w-3 h-3" /> Modules
                  </button>
                  <button
                    onClick={disconnect}
                    className="flex items-center justify-center gap-1 px-2 py-1 rounded text-[11px] bg-secondary hover:bg-secondary/80"
                  >
                    <Unplug className="w-3 h-3" /> Disconnect
                  </button>
                </div>
              </>
            )}

            {status !== 'ready' && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => void connectDevBridge()}
                  className="flex items-center justify-center gap-1 px-2 py-1 rounded text-[11px] bg-secondary hover:bg-secondary/80"
                >
                  <RefreshCw className="w-3 h-3" /> Use local dev bridge
                </button>
                <button
                  onClick={() => void connectFolder()}
                  disabled={!canPickFolder}
                  className="flex items-center justify-center gap-1 px-2 py-1 rounded text-[11px] bg-secondary hover:bg-secondary/80 disabled:opacity-40"
                >
                  <Plug className="w-3 h-3" /> Pick OTClient folder...
                </button>
                {!canPickFolder && (
                  <div className="text-[10px] text-muted-foreground">
                    Folder picking requires a Chromium-based browser.
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground">
                  The dev bridge reads <span className="font-mono">../otclient</span> or the folder in{' '}
                  <span className="font-mono">OTCLIENT_PATH</span>.
                </div>
              </div>
            )}

            {error && <div className="text-[11px] text-red-400">{error}</div>}
          </div>
        )}
      </div>

      {browsing && <ModuleBrowser onClose={() => setBrowsing(false)} onLoaded={setLoadedModule} />}
    </>
  );
}
