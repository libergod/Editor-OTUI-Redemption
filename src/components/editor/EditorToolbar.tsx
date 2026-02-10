// Editor Toolbar - Top bar with actions

import { useEditor } from '@/lib/editor-context';
import { serializeOTUI } from '@/lib/otui-parser';
import { parseOTUI } from '@/lib/otui-parser';
import { Undo2, Redo2, FileDown, FileUp, Trash2, Code, X } from 'lucide-react';
import { useState, useRef } from 'react';

export function EditorToolbar({ children }: { children?: React.ReactNode }) {
  const { state, dispatch, pushHistory } = useEditor();
  const [showCode, setShowCode] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const otui = serializeOTUI(state.rootWidgets);
    const blob = new Blob([otui], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'interface.otui';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const widgets = parseOTUI(text);
        dispatch({ type: 'SET_WIDGETS', widgets });
        pushHistory('Import file');
      } catch {
        alert('Failed to parse OTUI file');
      }
    };
    reader.readAsText(file);
  };

  const handleImportText = () => {
    try {
      const widgets = parseOTUI(importText);
      dispatch({ type: 'SET_WIDGETS', widgets });
      pushHistory('Import text');
      setShowImport(false);
      setImportText('');
    } catch {
      alert('Failed to parse OTUI');
    }
  };

  const otuiOutput = serializeOTUI(state.rootWidgets);

  return (
    <>
      <div className="h-10 bg-editor-panel border-b border-border flex items-center px-3 gap-1 shrink-0">
        <div className="flex items-center gap-0.5 mr-3">
          <span className="text-primary font-bold text-sm font-mono">OTUI</span>
          <span className="text-muted-foreground text-xs ml-1">Editor</span>
        </div>

        <div className="h-5 w-px bg-border mx-1" />

        <ToolbarBtn icon={Undo2} label="Undo" onClick={() => dispatch({ type: 'UNDO' })} disabled={state.historyIndex <= 0} />
        <ToolbarBtn icon={Redo2} label="Redo" onClick={() => dispatch({ type: 'REDO' })} disabled={state.historyIndex >= state.history.length - 1} />

        <div className="h-5 w-px bg-border mx-1" />

        <ToolbarBtn icon={FileUp} label="Import" onClick={() => setShowImport(true)} />
        <ToolbarBtn icon={FileDown} label="Export" onClick={handleExport} />
        <ToolbarBtn icon={Code} label="Code" onClick={() => setShowCode(!showCode)} active={showCode} />

        <input ref={fileInputRef} type="file" accept=".otui" className="hidden" onChange={handleImportFile} />

        <div className="flex-1" />

        <ToolbarBtn
          icon={Trash2}
          label="Clear All"
          onClick={() => { dispatch({ type: 'SET_WIDGETS', widgets: [] }); pushHistory('Clear'); }}
          variant="destructive"
        />
      </div>

      {/* Code output panel */}
      {showCode && (
        <div className="border-b border-border bg-editor-bg max-h-60 overflow-auto">
          <div className="flex items-center justify-between px-3 py-1 border-b border-border">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">OTUI Output</span>
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => { navigator.clipboard.writeText(otuiOutput); }}
            >
              <span className="text-[10px]">Copy</span>
            </button>
          </div>
          <pre className="p-3 text-[11px] font-mono text-foreground whitespace-pre leading-relaxed">
            {otuiOutput || '// Empty - add widgets to generate OTUI'}
          </pre>
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowImport(false)}>
          <div className="bg-card border border-border rounded-lg w-[600px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold">Import OTUI</span>
              <button onClick={() => setShowImport(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="p-4 flex flex-col gap-3 flex-1">
              <button
                className="text-xs text-primary hover:underline self-start"
                onClick={() => fileInputRef.current?.click()}
              >
                Or import from file...
              </button>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder="Paste OTUI content here..."
                className="flex-1 min-h-[200px] bg-secondary border border-border rounded p-3 text-[11px] font-mono text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <button
                onClick={handleImportText}
                className="self-end px-4 py-1.5 bg-primary text-primary-foreground rounded text-xs font-semibold hover:bg-primary/90"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ToolbarBtn({
  icon: Icon,
  label,
  onClick,
  disabled,
  active,
  variant,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  variant?: 'destructive';
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-secondary cursor-pointer'}
        ${active ? 'bg-secondary text-primary' : ''}
        ${variant === 'destructive' ? 'text-destructive hover:bg-destructive/10' : 'text-foreground'}
      `}
      title={label}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
