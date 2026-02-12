// Editor Help Modal - Shows keyboard shortcuts and editor features

import { X, Mouse, Move, Maximize2, Copy, Trash2, Keyboard, Ruler } from 'lucide-react';

interface EditorHelpModalProps {
  onClose: () => void;
}

export function EditorHelpModal({ onClose }: EditorHelpModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg w-[700px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Editor Canvas - Help & Shortcuts</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Basic Operations */}
          <div>
            <h3 className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
              <Mouse className="w-3.5 h-3.5" />
              Basic Operations
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-3 p-2 bg-secondary/30 rounded">
                <span className="font-mono text-primary min-w-[120px]">Drag & Drop</span>
                <span className="text-muted-foreground">Drag widgets from the left palette onto the canvas to create new elements</span>
              </div>
              <div className="flex items-start gap-3 p-2 bg-secondary/30 rounded">
                <span className="font-mono text-primary min-w-[120px]">Click</span>
                <span className="text-muted-foreground">Click on any widget to select it and view/edit its properties</span>
              </div>
              <div className="flex items-start gap-3 p-2 bg-secondary/30 rounded">
                <span className="font-mono text-primary min-w-[120px]">Right Click</span>
                <span className="text-muted-foreground">Right-click on a widget to open context menu (duplicate, delete, etc.)</span>
              </div>
            </div>
          </div>

          {/* Moving & Resizing */}
          <div>
            <h3 className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5" />
              Moving & Positioning
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-3 p-2 bg-secondary/30 rounded">
                <span className="font-mono text-primary min-w-[120px]">Drag Widget</span>
                <span className="text-muted-foreground">Select a widget, then drag it to reposition. Snaps to 4px grid automatically</span>
              </div>
              <div className="flex items-start gap-3 p-2 bg-secondary/30 rounded">
                <span className="font-mono text-primary min-w-[120px]">Ctrl + Drop</span>
                <span className="text-muted-foreground">Hold Ctrl when dropping a widget near an edge (within 50px) to auto-generate anchors (anchors.left, margin-left, etc.)</span>
              </div>
              <div className="flex items-start gap-3 p-2 bg-secondary/30 rounded">
                <span className="font-mono text-primary min-w-[120px]">Shift + Drag</span>
                <span className="text-muted-foreground">Hold Shift while dragging to lock movement to horizontal or vertical axis</span>
              </div>
              <div className="flex items-start gap-3 p-2 bg-secondary/30 rounded">
                <span className="font-mono text-primary min-w-[120px]">Smart Guides</span>
                <span className="text-muted-foreground">Blue alignment lines appear when widgets align with each other (edges, centers)</span>
              </div>
              <div className="flex items-start gap-3 p-2 bg-secondary/30 rounded">
                <span className="font-mono text-primary min-w-[120px]">Spacing Labels</span>
                <span className="text-muted-foreground">Distance in pixels is shown between nearby widgets during drag/resize</span>
              </div>
            </div>
          </div>

          {/* Resizing */}
          <div>
            <h3 className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5" />
              Resizing
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-3 p-2 bg-secondary/30 rounded">
                <span className="font-mono text-primary min-w-[120px]">Resize Handles</span>
                <span className="text-muted-foreground">When a widget is selected, drag the handles on the right, bottom, or corner to resize</span>
              </div>
              <div className="flex items-start gap-3 p-2 bg-secondary/30 rounded">
                <span className="font-mono text-primary min-w-[120px]">Properties Panel</span>
                <span className="text-muted-foreground">Type exact width/height values in the Properties panel on the right for precise control</span>
              </div>
            </div>
          </div>

          {/* Ruler Guides */}
          <div>
            <h3 className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5" />
              Ruler Guides (Photoshop-style)
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-3 p-2 bg-secondary/30 rounded">
                <span className="font-mono text-primary min-w-[120px]">Ctrl+R</span>
                <span className="text-muted-foreground">Toggle ruler bars on/off (or click ruler icon in header)</span>
              </div>
              <div className="flex items-start gap-3 p-2 bg-secondary/30 rounded">
                <span className="font-mono text-primary min-w-[120px]">Create Guide</span>
                <span className="text-muted-foreground">Drag from horizontal ruler (top) to create horizontal guide, drag from vertical ruler (left) to create vertical guide</span>
              </div>
              <div className="flex items-start gap-3 p-2 bg-secondary/30 rounded">
                <span className="font-mono text-primary min-w-[120px]">Move Guide</span>
                <span className="text-muted-foreground">Click and drag any guide line to reposition it</span>
              </div>
              <div className="flex items-start gap-3 p-2 bg-secondary/30 rounded">
                <span className="font-mono text-primary min-w-[120px]">Guide Actions</span>
                <span className="text-muted-foreground">Click on guide to open menu with delete/duplicate options</span>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h3 className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5" />
              Keyboard Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded">
                <kbd className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-[10px] font-mono">Ctrl+Z</kbd>
                <span className="text-muted-foreground">Undo</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded">
                <kbd className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-[10px] font-mono">Ctrl+Y</kbd>
                <span className="text-muted-foreground">Redo</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded">
                <kbd className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-[10px] font-mono">Delete</kbd>
                <span className="text-muted-foreground">Delete selected widget</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded">
                <kbd className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-[10px] font-mono">Ctrl+D</kbd>
                <span className="text-muted-foreground">Duplicate widget</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded">
                <kbd className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-[10px] font-mono">Ctrl+R</kbd>
                <span className="text-muted-foreground">Toggle rulers</span>
              </div>
            </div>
          </div>

          {/* Viewport & Canvas */}
          <div>
            <h3 className="text-xs font-semibold text-primary mb-2">Viewport & Canvas</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-3 p-2 bg-secondary/30 rounded">
                <span className="font-mono text-primary min-w-[120px]">Viewport Boundary</span>
                <span className="text-muted-foreground">Shows OTClient game window area (default 800×600px). Keep UI elements inside for best compatibility</span>
              </div>
              <div className="flex items-start gap-3 p-2 bg-secondary/30 rounded">
                <span className="font-mono text-primary min-w-[120px]">Custom Size</span>
                <span className="text-muted-foreground">Adjust viewport width/height in header to match your OTClient resolution</span>
              </div>
              <div className="flex items-start gap-3 p-2 bg-secondary/30 rounded">
                <span className="font-mono text-primary min-w-[120px]">Toggle ON/OFF</span>
                <span className="text-muted-foreground">Click ON/OFF button to show/hide viewport boundary while working</span>
              </div>
            </div>
          </div>

          {/* Export & Preview */}
          <div>
            <h3 className="text-xs font-semibold text-primary mb-2">Export & Preview</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-3 p-2 bg-secondary/30 rounded">
                <span className="font-mono text-primary min-w-[120px]">Client Preview</span>
                <span className="text-muted-foreground">Click the "Client Preview" button in toolbar to see how your UI will look in OTClient</span>
              </div>
              <div className="flex items-start gap-3 p-2 bg-secondary/30 rounded">
                <span className="font-mono text-primary min-w-[120px]">Export OTUI</span>
                <span className="text-muted-foreground">Use "Export" button to download your .otui file compatible with OTClient Redemption</span>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-primary/10 border border-primary/30 rounded p-3">
            <h4 className="text-xs font-semibold text-primary mb-2">💡 Pro Tips</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Keep widgets inside the 800×600 viewport boundary for standard OTClient compatibility</li>
              <li>Adjust viewport size if your OTClient uses different resolution (e.g., 1024×768)</li>
              <li>Hold Ctrl when dropping widgets near edges for automatic anchor generation</li>
              <li>Use anchors (anchors.left, anchors.top, etc.) for responsive layouts</li>
              <li>Avoid fixed x/y - prefer anchors relative to siblings (e.g., anchors.left: avatar.right)</li>
              <li>Set margins with anchors for precise positioning relative to parent</li>
              <li>The editor auto-generates professional code: id properties, border-width, value for progress bars</li>
              <li>Use tr('text') for translatable UI text (set in Properties panel)</li>
              <li>Nest widgets by dropping them onto container widgets (UIPanel, UIMiniWindow)</li>
              <li>Use ruler guides (Ctrl+R) for consistent alignment across multiple widgets</li>
              <li>Drag widgets in Hierarchy tree to reorganize parent-child relationships</li>
              <li>Check i18n warnings (⚠ icon) to ensure all UI text is translatable</li>
            </ul>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-primary text-primary-foreground rounded text-xs font-semibold hover:bg-primary/90"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
