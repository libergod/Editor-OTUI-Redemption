// Main Editor Layout - Combines all panels

import { EditorProvider } from '@/lib/editor-context';
import { WidgetPalette } from './WidgetPalette';
import { HierarchyTree } from './HierarchyTree';
import { EditorCanvas } from './EditorCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { EditorToolbar } from './EditorToolbar';
import { ClientPreviewModal } from './ClientPreview';
import { ClientAssetsPanel } from './ClientAssetsPanel';
import { ClientAssetsProvider } from '@/lib/client-assets/client-assets-context';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useState } from 'react';
import { Monitor } from 'lucide-react';

export function OTUIEditor() {
  const [showClientPreview, setShowClientPreview] = useState(false);

  return (
    <ClientAssetsProvider>
    <EditorProvider>
      <div className="h-screen flex flex-col bg-editor-bg overflow-hidden">
        <EditorToolbar>
          <ClientAssetsPanel />
          <button
            onClick={() => setShowClientPreview(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            title="Preview as OTClient"
          >
            <Monitor className="w-3.5 h-3.5" />
            Client Preview
          </button>
        </EditorToolbar>

        <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
          {/* Left: Widgets + Hierarchy */}
          <ResizablePanel defaultSize={15} minSize={10} maxSize={30}>
            <div className="flex flex-col h-full border-r border-border">
              <div className="flex-1 min-h-0 overflow-hidden editor-panel border-b border-border">
                <WidgetPalette />
              </div>
              <div className="h-64 overflow-hidden editor-panel">
                <HierarchyTree />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Center: Canvas */}
          <ResizablePanel defaultSize={60} minSize={30}>
            <div className="h-full editor-panel">
              <EditorCanvas />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Right: Properties */}
          <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
            <div className="h-full border-l border-border editor-panel">
              <PropertiesPanel />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Status bar */}
        <div className="h-6 bg-editor-panel border-t border-border flex items-center px-3 text-[10px] text-muted-foreground shrink-0">
          <span>OTClient Redemption • OTUI Visual Editor</span>
          <span className="ml-auto font-mono">v1.0</span>
        </div>
      </div>

      {showClientPreview && <ClientPreviewModal onClose={() => setShowClientPreview(false)} />}
    </EditorProvider>
    </ClientAssetsProvider>
  );
}
