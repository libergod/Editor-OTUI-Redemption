// Canvas Preview - Visual representation of the OTUI widget tree

import { OTUIWidget, WidgetType, WIDGET_TYPES } from '@/lib/otui-types';
import { useEditor } from '@/lib/editor-context';
import { createWidget } from '@/lib/otui-types';
import { t } from '@/lib/i18n';
import { useCallback, useState, useEffect, useRef } from 'react';
import { ResizeHandle } from './ResizeHandle';
import { WidgetContextMenu } from './WidgetContextMenu';
import { AlignmentGuides, computeAlignmentGuides, Guide, SpacingLabel } from './AlignmentGuides';
import { EditorHelpModal } from './EditorHelpModal';
import { RulerBars, RulerGuides, RulerGuide } from './RulerGuides';
import { HelpCircle, Ruler } from 'lucide-react';

function getWidgetDisplayStyle(widget: OTUIWidget): React.CSSProperties {
  const props = widget.properties;
  const style: React.CSSProperties = { position: 'relative' };

  // Absolute positioning when x/y provided
  if (props.x !== undefined || props.y !== undefined || props.position === 'absolute') {
    style.position = 'absolute';
    if (props.x !== undefined) style.left = Number(props.x);
    if (props.y !== undefined) style.top = Number(props.y);
  }

  if (props.size) {
    const [w, h] = props.size.split(' ').map(Number);
    if (w) style.width = w;
    if (h) style.height = h;
  }
  if (props.width) style.width = Number(props.width);
  if (props.height) style.height = Number(props.height);
  if (props['background-color']) style.backgroundColor = props['background-color'];
  if (props.color) style.color = props.color;
  if (props.opacity) style.opacity = Number(props.opacity);
  if (props.padding) {
    const vals = props.padding.split(' ').map(Number);
    if (vals.length === 1) style.padding = vals[0];
    else if (vals.length === 4) style.padding = `${vals[0]}px ${vals[1]}px ${vals[2]}px ${vals[3]}px`;
  }
  if (props['layout.type'] === 'vertical') {
    style.display = 'flex'; style.flexDirection = 'column';
    if (props['layout.spacing']) style.gap = Number(props['layout.spacing']);
  } else if (props['layout.type'] === 'horizontal') {
    style.display = 'flex'; style.flexDirection = 'row';
    if (props['layout.spacing']) style.gap = Number(props['layout.spacing']);
  } else if (props['layout.type'] === 'grid') {
    style.display = 'grid';
    if (props['layout.cell-size']) {
      const [cw, ch] = props['layout.cell-size'].split(' ').map(Number);
      style.gridTemplateColumns = `repeat(auto-fill, ${cw}px)`;
      style.gridAutoRows = `${ch}px`;
    }
  }
  if (props['anchors.fill'] === 'parent') { style.width = '100%'; style.height = '100%'; }
  if (props['anchors.centerIn'] === 'parent') {
    style.display = style.display || 'flex';
    style.alignItems = 'center'; style.justifyContent = 'center';
  }
  return style;
}

function getTypeColor(type: WidgetType): string {
  const map: Record<string, string> = {
    UIWidget: 'hsl(var(--editor-widget-border) / 0.4)',
    UIPanel: 'hsl(185, 50%, 40%, 0.3)',
    UIMiniWindow: 'hsl(260, 50%, 50%, 0.3)',
    UILabel: 'hsl(40, 70%, 50%, 0.3)',
    UIButton: 'hsl(120, 50%, 40%, 0.3)',
    UITextEdit: 'hsl(200, 60%, 45%, 0.3)',
    UIImage: 'hsl(300, 50%, 45%, 0.3)',
    UIProgressBar: 'hsl(150, 60%, 40%, 0.3)',
    UIScrollArea: 'hsl(185, 40%, 35%, 0.3)',
  };
  return map[type] || 'hsl(var(--editor-widget-border) / 0.3)';
}

function CanvasWidget({ widget, onDragUpdate }: { widget: OTUIWidget; onDragUpdate?: (guides: Guide[], spacings: SpacingLabel[]) => void }) {
  const { state, dispatch, pushHistory } = useEditor();
  const isSelected = state.selectedWidgetId === widget.id;
  const [isDragOver, setIsDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingWithCtrl, setIsDraggingWithCtrl] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'SELECT_WIDGET', id: widget.id });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dispatch({ type: 'SELECT_WIDGET', id: widget.id });
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragOver(false);
    const data = e.dataTransfer.getData('widget-type');
    if (data) {
      const { type, label } = JSON.parse(data);
      const newName = label.replace(/\s/g, '') + '_' + Math.random().toString(36).slice(2, 5);
      const newWidget = createWidget(newName, type, widget.id);
      dispatch({ type: 'ADD_WIDGET', widget: newWidget, parentId: widget.id });
      pushHistory('Add widget');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const style = getWidgetDisplayStyle(widget);
  const typeInfo = WIDGET_TYPES.find(t => t.type === widget.type);
  

  const renderContent = () => {
    const t = widget.type;
    const text = widget.properties.text?.replace(/"/g, '') || '';

    if (t === 'UILabel') return <span className="text-[11px] font-mono select-none pointer-events-none">{text || widget.name}</span>;
    if (t === 'UIButton') return (
      <div className="px-3 py-1 bg-secondary/60 border border-border rounded text-[11px] text-center select-none pointer-events-none">
        {text || 'Button'}
      </div>
    );
    if (t === 'UITextEdit') return (
      <div className="w-full h-full bg-secondary/30 border border-border rounded px-2 py-0.5 text-[11px] font-mono text-muted-foreground select-none pointer-events-none">
        {text || 'Text input...'}
      </div>
    );
    if (t === 'UIProgressBar') {
      const pct = Number(widget.properties.percent) || 50;
      return (
        <div className="w-full h-full bg-secondary/40 rounded overflow-hidden select-none pointer-events-none">
          <div className="h-full bg-primary/50 rounded" style={{ width: `${pct}%` }} />
        </div>
      );
    }
    if (t === 'UIImage') return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px] border border-dashed border-border rounded select-none pointer-events-none">
        🖼 Image
      </div>
    );
    if (t === 'UIMiniWindow') return (
      <>
        <div className="w-full h-6 bg-secondary/60 border-b border-border flex items-center px-2 text-[11px] font-semibold select-none pointer-events-none rounded-t">
          {text || 'Window'}
        </div>
        {widget.children.map(child => <CanvasWidget key={child.id} widget={child} />)}
      </>
    );
    return null;
  };

  const isMiniWindow = widget.type === 'UIMiniWindow';

  return (
    <>
      <div
        className={`widget-node ${isSelected ? 'selected' : ''} ${isDragOver ? 'drop-target' : ''} ${isDraggingWithCtrl ? 'border-2 border-green-400 shadow-lg shadow-green-400/50' : ''}`}
        style={{
          ...style,
          backgroundColor: style.backgroundColor || getTypeColor(widget.type),
        }}
        
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseDown={e => {
          // start drag only with left button and when this widget is selected
          if (!isSelected) return;
          if (e.button !== 0) return;
          e.stopPropagation();

          const startClientX = e.clientX;
          const startClientY = e.clientY;

          const widgetEl = e.currentTarget as HTMLElement;

          // find nearest positioned parent: first ancestor .widget-node (excluding self), fallback to .editor-canvas-bg
          const parentWidgetEl = widgetEl.parentElement?.closest('.widget-node');
          const containerEl = parentWidgetEl || widgetEl.closest('.editor-canvas-bg');
          const parentRect = containerEl ? (containerEl as HTMLElement).getBoundingClientRect() : { left: 0, top: 0 } as DOMRect;

          const rect = widgetEl.getBoundingClientRect();
          // compute original coords relative to parent/container
          const origX = widget.properties.x !== undefined ? Number(widget.properties.x) : rect.left - parentRect.left;
          const origY = widget.properties.y !== undefined ? Number(widget.properties.y) : rect.top - parentRect.top;

          // Collect sibling widgets for alignment guide computation
          const collectSiblingWidgets = (widgets: OTUIWidget[], currentId: string): Array<{ x: number; y: number; width: number; height: number; id: string }> => {
            const result: Array<{ x: number; y: number; width: number; height: number; id: string }> = [];
            widgets.forEach(w => {
              if (w.id !== currentId) {
                const x = w.properties.x !== undefined ? Number(w.properties.x) : 0;
                const y = w.properties.y !== undefined ? Number(w.properties.y) : 0;
                let width = 100, height = 100;
                if (w.properties.size) {
                  const [sw, sh] = w.properties.size.split(' ').map(Number);
                  width = sw || width;
                  height = sh || height;
                }
                if (w.properties.width) width = Number(w.properties.width);
                if (w.properties.height) height = Number(w.properties.height);
                result.push({ x, y, width, height, id: w.id });
              }
              result.push(...collectSiblingWidgets(w.children, currentId));
            });
            return result;
          };

          const siblingWidgets = collectSiblingWidgets(state.rootWidgets, widget.id);

          const snap = 4; // snap grid in px

          const onMove = (ev: MouseEvent) => {
            ev.preventDefault();
            const dx = ev.clientX - startClientX;
            const dy = ev.clientY - startClientY;

            // Track Ctrl key state for visual feedback
            setIsDraggingWithCtrl(ev.ctrlKey);

            // axis lock when holding Shift: choose dominant axis
            let ndx = dx;
            let ndy = dy;
            if (ev.shiftKey) {
              if (Math.abs(dx) > Math.abs(dy)) ndy = 0;
              else ndx = 0;
            }

            let newX = Math.round((origX + ndx) / snap) * snap;
            let newY = Math.round((origY + ndy) / snap) * snap;

            // Get widget size for alignment computation
            let wWidth = rect.width;
            let wHeight = rect.height;
            if (widget.properties.size) {
              const [sw, sh] = widget.properties.size.split(' ').map(Number);
              wWidth = sw || wWidth;
              wHeight = sh || wHeight;
            }
            if (widget.properties.width) wWidth = Number(widget.properties.width);
            if (widget.properties.height) wHeight = Number(widget.properties.height);

            // Compute alignment guides (visual only, no snap)
            const { guides, snapX, snapY, spacings } = computeAlignmentGuides(
              { x: newX, y: newY, width: wWidth, height: wHeight },
              siblingWidgets,
              8 // threshold for showing guides
            );

            // Don't apply snap - guides are visual only

            // clamp to container bounds
            const widgetW = rect.width;
            const widgetH = rect.height;
            const containerElNode = containerEl as HTMLElement | null;
            const containerW = containerElNode ? containerElNode.clientWidth : (parentRect.width || (window.innerWidth - parentRect.left));
            const containerH = containerElNode ? containerElNode.clientHeight : (parentRect.height || (window.innerHeight - parentRect.top));
            const maxX = Math.max(0, Math.round(containerW - widgetW));
            const maxY = Math.max(0, Math.round(containerH - widgetH));
            const clampedX = Math.min(maxX, Math.max(0, newX));
            const clampedY = Math.min(maxY, Math.max(0, newY));

            dispatch({ type: 'UPDATE_PROPERTY', widgetId: widget.id, key: 'x', value: String(clampedX) });
            dispatch({ type: 'UPDATE_PROPERTY', widgetId: widget.id, key: 'y', value: String(clampedY) });

            // Update guides visualization
            if (onDragUpdate) {
              onDragUpdate(guides, spacings);
            }
          };

          const onUp = (ev: MouseEvent) => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            setIsDraggingWithCtrl(false);
            
            // Auto-generate anchors ONLY if Ctrl key is held when dropping
            if (ev.ctrlKey) {
              const finalX = Number(widget.properties.x) || 0;
              const finalY = Number(widget.properties.y) || 0;
              const containerElNode = containerEl as HTMLElement | null;
              const containerW = containerElNode ? containerElNode.clientWidth : 800;
              const containerH = containerElNode ? containerElNode.clientHeight : 600;

              let widgetW = rect.width;
              let widgetH = rect.height;
              if (widget.properties.size) {
                const [sw, sh] = widget.properties.size.split(' ').map(Number);
                widgetW = sw || widgetW;
                widgetH = sh || widgetH;
              }
              if (widget.properties.width) widgetW = Number(widget.properties.width);
              if (widget.properties.height) widgetH = Number(widget.properties.height);

              const distanceLeft = finalX;
              const distanceTop = finalY;
              const distanceRight = containerW - (finalX + widgetW);
              const distanceBottom = containerH - (finalY + widgetH);

              const ANCHOR_THRESHOLD = 50; // px distance to consider anchor

              // Determine which edges to anchor (prefer closer edges)
              let anchorLeft = false, anchorTop = false, anchorRight = false, anchorBottom = false;

              // Horizontal anchoring (choose closer side)
              if (distanceLeft < ANCHOR_THRESHOLD && distanceLeft <= distanceRight) {
                anchorLeft = true;
              } else if (distanceRight < ANCHOR_THRESHOLD) {
                anchorRight = true;
              }

              // Vertical anchoring (choose closer side)
              if (distanceTop < ANCHOR_THRESHOLD && distanceTop <= distanceBottom) {
                anchorTop = true;
              } else if (distanceBottom < ANCHOR_THRESHOLD) {
                anchorBottom = true;
              }

              // Apply anchors and margins
              if (anchorLeft) {
                dispatch({ type: 'UPDATE_PROPERTY', widgetId: widget.id, key: 'anchors.left', value: 'parent.left' });
                dispatch({ type: 'UPDATE_PROPERTY', widgetId: widget.id, key: 'margin-left', value: String(finalX) });
                dispatch({ type: 'UPDATE_PROPERTY', widgetId: widget.id, key: 'x', value: '' }); // Remove x
              } else {
                dispatch({ type: 'UPDATE_PROPERTY', widgetId: widget.id, key: 'anchors.left', value: '' });
                dispatch({ type: 'UPDATE_PROPERTY', widgetId: widget.id, key: 'margin-left', value: '' });
              }

              if (anchorRight) {
                dispatch({ type: 'UPDATE_PROPERTY', widgetId: widget.id, key: 'anchors.right', value: 'parent.right' });
                dispatch({ type: 'UPDATE_PROPERTY', widgetId: widget.id, key: 'margin-right', value: String(distanceRight) });
              } else {
                dispatch({ type: 'UPDATE_PROPERTY', widgetId: widget.id, key: 'anchors.right', value: '' });
                dispatch({ type: 'UPDATE_PROPERTY', widgetId: widget.id, key: 'margin-right', value: '' });
              }

              if (anchorTop) {
                dispatch({ type: 'UPDATE_PROPERTY', widgetId: widget.id, key: 'anchors.top', value: 'parent.top' });
                dispatch({ type: 'UPDATE_PROPERTY', widgetId: widget.id, key: 'margin-top', value: String(finalY) });
                dispatch({ type: 'UPDATE_PROPERTY', widgetId: widget.id, key: 'y', value: '' }); // Remove y
              } else {
                dispatch({ type: 'UPDATE_PROPERTY', widgetId: widget.id, key: 'anchors.top', value: '' });
                dispatch({ type: 'UPDATE_PROPERTY', widgetId: widget.id, key: 'margin-top', value: '' });
              }

              if (anchorBottom) {
                dispatch({ type: 'UPDATE_PROPERTY', widgetId: widget.id, key: 'anchors.bottom', value: 'parent.bottom' });
                dispatch({ type: 'UPDATE_PROPERTY', widgetId: widget.id, key: 'margin-bottom', value: String(distanceBottom) });
              } else {
                dispatch({ type: 'UPDATE_PROPERTY', widgetId: widget.id, key: 'anchors.bottom', value: '' });
                dispatch({ type: 'UPDATE_PROPERTY', widgetId: widget.id, key: 'margin-bottom', value: '' });
              }

              pushHistory('Move widget with anchors');
            } else {
              pushHistory('Move widget');
            }
            
            // Clear guides
            if (onDragUpdate) {
              onDragUpdate([], []);
            }
          };

          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragOver(false)}
      >
        {isSelected && (
          <div className="absolute -top-4 left-0 text-[9px] font-mono text-primary bg-primary/10 px-1 rounded-t z-10 pointer-events-none">
            {widget.name}
          </div>
        )}
        {isDraggingWithCtrl && (
          <div className="absolute -top-4 right-0 text-[9px] font-bold text-green-600 bg-green-500/20 px-1.5 py-0.5 rounded-t z-10 pointer-events-none border border-green-400">
            ⚓ {t('canvas.autoAnchor')}
          </div>
        )}

        {renderContent()}

        {!isMiniWindow && widget.children.map(child => <CanvasWidget key={child.id} widget={child} onDragUpdate={onDragUpdate} />)}

        {/* Resize handles */}
        {isSelected && (
          <>
            <ResizeHandle widgetId={widget.id} position="right" />
            <ResizeHandle widgetId={widget.id} position="bottom" />
            <ResizeHandle widgetId={widget.id} position="bottom-right" />
          </>
        )}
      </div>

      {contextMenu && (
        <WidgetContextMenu
          widget={widget}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}

export function EditorCanvas() {
  const { state, dispatch, pushHistory } = useEditor();
  const [isDragOver, setIsDragOver] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [alignmentGuides, setAlignmentGuides] = useState<Guide[]>([]);
  const [spacingLabels, setSpacingLabels] = useState<SpacingLabel[]>([]);
  const [showRulers, setShowRulers] = useState(false);
  const [rulerGuides, setRulerGuides] = useState<RulerGuide[]>([]);
  const [showViewport, setShowViewport] = useState(true);
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 });
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Ctrl+R to toggle rulers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setShowRulers(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check if we have a virtual root (multiple root widgets)
  const isVirtualRoot = state.rootWidgets.length === 1 && state.rootWidgets[0].id === '__virtual_root__';
  const widgetsToRender = isVirtualRoot ? state.rootWidgets[0].children : state.rootWidgets;

  const handleDragUpdate = useCallback((guides: Guide[], spacings: SpacingLabel[]) => {
    setAlignmentGuides(guides);
    setSpacingLabels(spacings);
  }, []);

  const clearGuides = useCallback(() => {
    setAlignmentGuides([]);
    setSpacingLabels([]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const data = e.dataTransfer.getData('widget-type');
    if (data) {
      const { type, label } = JSON.parse(data);
      const newName = label.replace(/\s/g, '') + '_' + Math.random().toString(36).slice(2, 5);
      const newWidget = createWidget(newName, type, null);
      dispatch({ type: 'ADD_WIDGET', widget: newWidget, parentId: null });
      pushHistory('Add widget');
    }
  }, [dispatch, pushHistory]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="editor-panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{t('canvas.title')}</span>
          <button
            onClick={() => setShowHelp(true)}
            className="text-muted-foreground hover:text-primary transition-colors"
            title={t('ui.help')}
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowRulers(prev => !prev)}
            className={`transition-colors ${showRulers ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
            title={`${t('ui.rulers')} (Ctrl+R) - ${showRulers ? t('canvas.viewport.on') : t('canvas.viewport.off')}`}
          >
            <Ruler className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{t('canvas.viewport')}:</span>
            <input
              type="number"
              value={viewportSize.width}
              onChange={(e) => setViewportSize(prev => ({ ...prev, width: Number(e.target.value) || 800 }))}
              className="w-12 bg-background border border-border rounded px-1 text-[10px] text-center"
              min="320"
              max="1920"
            />
            <span className="text-[9px] text-muted-foreground">×</span>
            <input
              type="number"
              value={viewportSize.height}
              onChange={(e) => setViewportSize(prev => ({ ...prev, height: Number(e.target.value) || 600 }))}
              className="w-12 bg-background border border-border rounded px-1 text-[10px] text-center"
              min="240"
              max="1080"
            />
            <button
              onClick={() => setShowViewport(prev => !prev)}
              className={`ml-1 text-[9px] px-1.5 py-0.5 rounded transition-colors ${showViewport ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              title={t('canvas.viewport')}
            >
              {showViewport ? t('canvas.viewport.on') : t('canvas.viewport.off')}
            </button>
          </div>
          <span className="text-[10px] text-muted-foreground font-normal normal-case tracking-normal">
            {widgetsToRender.length} root widget{widgetsToRender.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div
        ref={canvasContainerRef}
        className={`flex-1 editor-canvas-bg overflow-auto ${isDragOver ? 'drop-target' : ''}`}
        style={{ position: 'relative' }}
        onClick={() => dispatch({ type: 'SELECT_WIDGET', id: null })}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragOver(false)}
      >
        {/* Ruler bars (top and left) */}
        {showRulers && (
          <RulerBars
            containerRef={canvasContainerRef}
            onCreateGuide={(type, position) => {
              const newGuide: RulerGuide = {
                id: `guide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                type,
                position
              };
              setRulerGuides(prev => [...prev, newGuide]);
            }}
          />
        )}

        {/* Ruler guides overlay */}
        {showRulers && (
          <RulerGuides
            guides={rulerGuides}
            showRulers={showRulers}
            onAddGuide={(type, position) => {
              const newGuide: RulerGuide = {
                id: `guide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                type,
                position
              };
              setRulerGuides(prev => [...prev, newGuide]);
            }}
            onRemoveGuide={id => setRulerGuides(prev => prev.filter(g => g.id !== id))}
            onUpdateGuide={(id, position) => {
              setRulerGuides(prev =>
                prev.map(g => (g.id === id ? { ...g, position } : g))
              );
            }}
          />
        )}

        <div 
          className="inline-flex flex-col gap-4" 
          style={{ position: 'relative', marginLeft: showRulers ? 32 : 24, marginTop: showRulers ? 32 : 24, paddingRight: 24, paddingBottom: 24 }}
        >
          {/* OTClient Viewport Boundary */}
          {showViewport && (
            <div
              className="absolute border-2 border-dashed border-primary/40 bg-primary/5 pointer-events-none z-0"
              style={{
                width: viewportSize.width,
                height: viewportSize.height,
                left: 0,
                top: 0
              }}
            >
              <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground px-2 py-0.5 rounded text-[9px] font-mono font-bold">
                OTClient Viewport: {viewportSize.width}×{viewportSize.height}px
              </div>
              <div className="absolute bottom-2 right-2 bg-primary/90 text-primary-foreground px-2 py-0.5 rounded text-[9px] font-mono">
                Drag widgets within this area for best compatibility
              </div>
            </div>
          )}

          {widgetsToRender.map(w => <CanvasWidget key={w.id} widget={w} onDragUpdate={handleDragUpdate} />)}
          {widgetsToRender.length === 0 && (
            <div className="text-muted-foreground text-sm flex items-center justify-center min-h-[300px] min-w-[400px] border border-dashed border-border rounded">
              Drag widgets here to start building
            </div>
          )}
          
          {/* Render alignment guides overlay */}
          <AlignmentGuides guides={alignmentGuides} spacings={spacingLabels} />
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && <EditorHelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
