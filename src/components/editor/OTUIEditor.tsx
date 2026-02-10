// Main Editor Layout - Combines all panels

import { EditorProvider } from '@/lib/editor-context';
import { WidgetPalette } from './WidgetPalette';
import { HierarchyTree } from './HierarchyTree';
import { EditorCanvas } from './EditorCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { EditorToolbar } from './EditorToolbar';

export function OTUIEditor() {
  return (
    <EditorProvider>
      <div className="h-screen flex flex-col bg-editor-bg overflow-hidden">
        <EditorToolbar />

        <div className="flex flex-1 min-h-0">
          {/* Left: Widgets + Hierarchy */}
          <div className="w-52 flex flex-col border-r border-border shrink-0">
            <div className="flex-1 min-h-0 overflow-hidden editor-panel border-b border-border">
              <WidgetPalette />
            </div>
            <div className="h-64 overflow-hidden editor-panel">
              <HierarchyTree />
            </div>
          </div>

          {/* Center: Canvas */}
          <div className="flex-1 min-w-0 editor-panel">
            <EditorCanvas />
          </div>

          {/* Right: Properties */}
          <div className="w-64 border-l border-border shrink-0 editor-panel">
            <PropertiesPanel />
          </div>
        </div>

        {/* Status bar */}
        <div className="h-6 bg-editor-panel border-t border-border flex items-center px-3 text-[10px] text-muted-foreground shrink-0">
          <span>OTClient Redemption • OTUI Visual Editor</span>
          <span className="ml-auto font-mono">v1.0</span>
        </div>
      </div>
    </EditorProvider>
  );
}
