// Editor Toolbar - Top bar with actions

import { useEditor } from '@/lib/editor-context';
import { serializeOTUI, parseOTUI, validateI18nUsage, I18nWarning } from '@/lib/otui-parser';
import { validateOTUI, autoFixOTUI, OTUIValidationResult } from '@/lib/otui-validator';
import { t, setLang, getLang } from '@/lib/i18n';
import { Undo2, Redo2, FileDown, FileUp, Trash2, Code, X, BookOpen } from 'lucide-react';
import { useState, useRef } from 'react';
import { CodeComparisonModal } from './CodeComparisonModal';
import { CodeBlock } from './CodeBlock';
import { OTUIStandardReference } from './OTUIStandardReference';
import { useClientAssets } from '@/lib/client-assets/client-assets-context';
import { OTUIWidget } from '@/lib/otui-types';

export function EditorToolbar({ children, onWarningsUpdate }: { children?: React.ReactNode; onWarningsUpdate?: (warnings: I18nWarning[]) => void }) {
  const { state, dispatch, pushHistory } = useEditor();
  const { moduleScripts } = useClientAssets();
  const [showCode, setShowCode] = useState(false);
  const [codeTab, setCodeTab] = useState('otui');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showStandardRef, setShowStandardRef] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Auto-fix validation states
  const [showComparison, setShowComparison] = useState(false);
  const [originalWidgets, setOriginalWidgets] = useState<OTUIWidget[]>([]);
  const [fixedWidgets, setFixedWidgets] = useState<OTUIWidget[]>([]);
  const [validationResult, setValidationResult] = useState<OTUIValidationResult | null>(null);
  const [pendingImportSource, setPendingImportSource] = useState<'file' | 'text'>('file');

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
        if (!text || text.trim().length === 0) {
          alert('File is empty');
          return;
        }
        const widgets = parseOTUI(text);
        if (!widgets || widgets.length === 0) {
          alert('No valid widgets found in file. Check the OTUI format.');
          return;
        }
        
        // Validate OTUI for OTClient Redemption compatibility
        const validation = validateOTUI(widgets);
        
        if (validation.needsAutoFix || validation.score < 100) {
          // Auto-fix issues
          const fixed = autoFixOTUI(widgets);
          
          // Show comparison modal
          setOriginalWidgets(widgets);
          setFixedWidgets(fixed);
          setValidationResult(validation);
          setPendingImportSource('file');
          setShowComparison(true);
        } else {
          // No issues, import directly
          applyImport(widgets, 'file');
        }
        
        e.target.value = ''; // Reset file input
      } catch (err) {
        console.error('Import error:', err);
        alert(`Failed to import OTUI file: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };
    reader.readAsText(file);
  };

  const applyImport = (widgets: OTUIWidget[], source: 'file' | 'text') => {
    dispatch({ type: 'SET_WIDGETS', widgets });
    pushHistory(`Import ${source}`);
    
    // Validate i18n usage and notify parent
    const warnings = validateI18nUsage(widgets);
    onWarningsUpdate?.(warnings);
    
    if (source === 'text') {
      setShowImport(false);
      setImportText('');
    }
  };

  const handleAcceptFixed = () => {
    applyImport(fixedWidgets, pendingImportSource);
    setShowComparison(false);
  };

  const handleKeepOriginal = () => {
    applyImport(originalWidgets, pendingImportSource);
    setShowComparison(false);
  };

  const handleImportText = () => {
    try {
      if (!importText || importText.trim().length === 0) {
        alert('Please paste OTUI code first');
        return;
      }
      const widgets = parseOTUI(importText);
      if (!widgets || widgets.length === 0) {
        alert('No valid widgets found. Supported formats:\n\n' +
          '1) WidgetName < UIPanel\n' +
          '2) UIPanel WidgetName\n' +
          '3) WidgetName: UIPanel\n\n' +
          'Example:\n' +
          'MyPanel < UIPanel\n' +
          '  size: 200 150\n' +
          '  background-color: #2a2a2a');
        return;
      }
      
      // Validate OTUI for OTClient Redemption compatibility
      const validation = validateOTUI(widgets);
      
      if (validation.needsAutoFix || validation.score < 100) {
        // Auto-fix issues
        const fixed = autoFixOTUI(widgets);
        
        // Show comparison modal
        setOriginalWidgets(widgets);
        setFixedWidgets(fixed);
        setValidationResult(validation);
        setPendingImportSource('text');
        setShowComparison(true);
      } else {
        // No issues, import directly
        applyImport(widgets, 'text');
      }
    } catch (err) {
      console.error('Import error:', err);
      alert(`Failed to parse OTUI:\n${err instanceof Error ? err.message : 'Unknown error'}\n\nSupported formats:\n1) WidgetName < UIPanel\n2) UIPanel WidgetName\n3) WidgetName: UIPanel`);
    }
  };

  const otuiOutput = serializeOTUI(state.rootWidgets);

  // One tab per source the editor knows about: the generated OTUI plus every
  // Lua script of the module currently open.
  const codeTabs = [
    {
      id: 'otui',
      label: 'OTUI Output',
      code: otuiOutput,
      language: 'otui' as const,
      path: '',
      empty: '// Empty - add widgets to generate OTUI',
    },
    ...moduleScripts.map((script) => ({
      id: script.path,
      label: script.path.split('/').pop() ?? 'Lua',
      code: script.text,
      language: 'lua' as const,
      path: script.path,
      empty: '-- Empty script',
    })),
  ];
  if (moduleScripts.length === 0) {
    codeTabs.push({
      id: 'lua',
      label: 'Lua',
      code: '',
      language: 'lua' as const,
      path: '',
      empty: '-- Open an OTClient module to load its Lua source',
    });
  }
  const activeTab = codeTabs.find((tab) => tab.id === codeTab) ?? codeTabs[0];

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
        <ToolbarBtn icon={BookOpen} label="OTUI Standard" onClick={() => setShowStandardRef(true)} />
        <ToolbarBtn icon={Code} label="Code" onClick={() => setShowCode(!showCode)} active={showCode} />

        <input ref={fileInputRef} type="file" accept=".otui" className="hidden" onChange={handleImportFile} />

        <div className="flex-1" />

        {children}

        <ToolbarBtn
          icon={Trash2}
          label="Clear All"
          onClick={() => { dispatch({ type: 'SET_WIDGETS', widgets: [] }); pushHistory('Clear'); }}
          variant="destructive"
        />
        <div className="ml-2 flex items-center gap-2">
          <select value={getLang()} onChange={e => { setLang(e.target.value); }} className="bg-secondary/80 border border-border rounded px-1 py-0.5 text-[11px]">
            <option value="en">EN</option>
            <option value="pt">PT-BR</option>
          </select>
        </div>
      </div>

      {/* Code output panel */}
      {showCode && (
        <div className="border-b border-border bg-editor-bg flex flex-col max-h-72">
          <div className="flex items-center gap-1 px-3 py-1 border-b border-border shrink-0">
            {codeTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCodeTab(tab.id)}
                className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold transition-colors ${
                  codeTab === tab.id
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <div className="flex-1" />
            {activeTab.path && (
              <span className="text-[10px] text-muted-foreground/60 font-mono mr-2">{activeTab.path}</span>
            )}
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => { navigator.clipboard.writeText(activeTab.code); }}
            >
              <span className="text-[10px]">Copy</span>
            </button>
          </div>
          <div className="overflow-auto">
            <CodeBlock code={activeTab.code} language={activeTab.language} emptyMessage={activeTab.empty} />
          </div>
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowImport(false)}>
          <div className="bg-card border border-border rounded-lg w-[600px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold">{t('import.title')}</span>
              <button onClick={() => setShowImport(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="p-4 flex flex-col gap-3 flex-1">
              <button
                className="text-xs text-primary hover:underline self-start"
                onClick={() => fileInputRef.current?.click()}
              >
                {t('import.fromFile')}
              </button>
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder={t('import.placeholder')}
                className="flex-1 min-h-[200px] bg-secondary border border-border rounded p-3 text-[11px] font-mono text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <button
                onClick={handleImportText}
                className="self-end px-4 py-1.5 bg-primary text-primary-foreground rounded text-xs font-semibold hover:bg-primary/90"
              >
                {t('import.button')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Comparison Modal */}
      {showComparison && validationResult && (
        <CodeComparisonModal
          onClose={() => setShowComparison(false)}
          onAcceptFixed={handleAcceptFixed}
          onKeepOriginal={handleKeepOriginal}
          originalCode={serializeOTUI(originalWidgets)}
          fixedCode={serializeOTUI(fixedWidgets)}
          validation={validationResult}
        />
      )}

      {/* OTUI Standard Reference Modal */}
      <OTUIStandardReference
        isOpen={showStandardRef}
        onClose={() => setShowStandardRef(false)}
      />
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
