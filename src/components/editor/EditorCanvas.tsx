// Canvas Preview - Visual representation of the OTUI widget tree

import { OTUIWidget, WidgetType, findWidget } from '@/lib/otui-types';
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

function getWidgetRectFromProps(widget: OTUIWidget): { x: number; y: number; width: number; height: number } {
  const x = widget.properties.x !== undefined ? Number(widget.properties.x) : 0;
  const y = widget.properties.y !== undefined ? Number(widget.properties.y) : 0;
  let width = 100;
  let height = 100;
  if (widget.properties.size) {
    const [sw, sh] = widget.properties.size.split(' ').map(Number);
    if (sw) width = sw;
    if (sh) height = sh;
  }
  if (widget.properties.width) width = Number(widget.properties.width);
  if (widget.properties.height) height = Number(widget.properties.height);
  return { x, y, width, height };
}

function getParentSpacingLabels(
  draggedRect: { x: number; y: number; width: number; height: number },
  parentSize: { width: number; height: number }
): SpacingLabel[] {
  const labels: SpacingLabel[] = [];
  const centerX = draggedRect.x + draggedRect.width / 2;
  const centerY = draggedRect.y + draggedRect.height / 2;

  const leftGap = Math.max(0, draggedRect.x);
  const rightGap = Math.max(0, parentSize.width - (draggedRect.x + draggedRect.width));
  const topGap = Math.max(0, draggedRect.y);
  const bottomGap = Math.max(0, parentSize.height - (draggedRect.y + draggedRect.height));

  labels.push({ x: draggedRect.x / 2, y: centerY, value: Math.round(leftGap), orientation: 'horizontal' });
  labels.push({ x: draggedRect.x + draggedRect.width + rightGap / 2, y: centerY, value: Math.round(rightGap), orientation: 'horizontal' });
  labels.push({ x: centerX, y: draggedRect.y / 2, value: Math.round(topGap), orientation: 'vertical' });
  labels.push({ x: centerX, y: draggedRect.y + draggedRect.height + bottomGap / 2, value: Math.round(bottomGap), orientation: 'vertical' });

  return labels;
}

function CanvasWidget({ widget, onDragUpdate }: { widget: OTUIWidget; onDragUpdate?: (guides: Guide[], spacings: SpacingLabel[]) => void }) {
  const { state, dispatch, pushHistory } = useEditor();
  const isSelected = state.selectedWidgetIds.includes(widget.id);
  const [isDragOver, setIsDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingWithCtrl, setIsDraggingWithCtrl] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const toggle = e.ctrlKey || e.metaKey || e.shiftKey;
    dispatch({ type: 'SELECT_WIDGET', id: widget.id, mode: toggle ? 'toggle' : 'set' });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isSelected || state.selectedWidgetIds.length > 1) {
      dispatch({ type: 'SELECT_WIDGET', id: widget.id, mode: 'set' });
    }
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
        data-widget-id={widget.id}
        
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseDown={e => {
          if (e.button !== 0) return;
          e.stopPropagation();

          const toggleKey = e.ctrlKey || e.metaKey || e.shiftKey;
          let nextSelectedIds = state.selectedWidgetIds;

          if (!isSelected) {
            if (toggleKey) {
              nextSelectedIds = [...state.selectedWidgetIds, widget.id];
              dispatch({ type: 'SELECT_WIDGET', id: widget.id, mode: 'add' });
            } else {
              nextSelectedIds = [widget.id];
              dispatch({ type: 'SELECT_WIDGET', id: widget.id, mode: 'set' });
            }
          } else if (!toggleKey && state.selectedWidgetIds.length > 1) {
            nextSelectedIds = [widget.id];
            dispatch({ type: 'SELECT_WIDGET', id: widget.id, mode: 'set' });
          }

          const startClientX = e.clientX;
          const startClientY = e.clientY;

          const widgetEl = e.currentTarget as HTMLElement;

          const rootEl = widgetEl.closest('.editor-canvas-root') as HTMLElement | null;
          const canvasEl = widgetEl.closest('.editor-canvas-bg') as HTMLElement | null;

          // find nearest positioned parent: first ancestor .widget-node (excluding self), fallback to canvas
          const parentWidgetEl = widgetEl.parentElement?.closest('.widget-node');
          const containerEl = parentWidgetEl || canvasEl;
          if (!containerEl || !rootEl) return;

          const parentRect = containerEl.getBoundingClientRect();
          const rootRect = rootEl.getBoundingClientRect();

          const rect = widgetEl.getBoundingClientRect();
          const movingWidgetIds = nextSelectedIds.filter(id => {
            const w = findWidget(state.rootWidgets, id);
            return w && w.parentId === widget.parentId;
          });
          if (movingWidgetIds.length === 0) movingWidgetIds.push(widget.id);

          const moveItems = movingWidgetIds
            .map(id => {
              const w = findWidget(state.rootWidgets, id);
              const el = rootEl.querySelector(`[data-widget-id="${id}"]`) as HTMLElement | null;
              if (!w || !el) return null;
              const elRect = el.getBoundingClientRect();
              const origX = w.properties.x !== undefined ? Number(w.properties.x) : elRect.left - parentRect.left;
              const origY = w.properties.y !== undefined ? Number(w.properties.y) : elRect.top - parentRect.top;
              return { id, widget: w, origX, origY, width: elRect.width, height: elRect.height };
            })
            .filter((item): item is { id: string; widget: OTUIWidget; origX: number; origY: number; width: number; height: number } => Boolean(item));

          if (moveItems.length === 0) return;

          const primary = moveItems.find(item => item.id === widget.id) || moveItems[0];

          const groupMinX = Math.min(...moveItems.map(item => item.origX));
          const groupMinY = Math.min(...moveItems.map(item => item.origY));
          const groupMaxX = Math.max(...moveItems.map(item => item.origX + item.width));
          const groupMaxY = Math.max(...moveItems.map(item => item.origY + item.height));
          const groupWidth = groupMaxX - groupMinX;
          const groupHeight = groupMaxY - groupMinY;

          const parentSize = {
            width: containerEl.clientWidth,
            height: containerEl.clientHeight,
          };

          const parentWidget = widget.parentId ? findWidget(state.rootWidgets, widget.parentId) : null;
          const siblingPool = parentWidget ? parentWidget.children : state.rootWidgets;
          const siblingWidgets = siblingPool
            .filter(w => !movingWidgetIds.includes(w.id))
            .map(w => ({ ...getWidgetRectFromProps(w), id: w.id }));

          siblingWidgets.push({ x: 0, y: 0, width: parentSize.width, height: parentSize.height, id: '__parent__' });

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

            let deltaX = Math.round((primary.origX + ndx) / snap) * snap - primary.origX;
            let deltaY = Math.round((primary.origY + ndy) / snap) * snap - primary.origY;

            const minDeltaX = -groupMinX;
            const maxDeltaX = parentSize.width - groupMaxX;
            const minDeltaY = -groupMinY;
            const maxDeltaY = parentSize.height - groupMaxY;

            deltaX = Math.min(maxDeltaX, Math.max(minDeltaX, deltaX));
            deltaY = Math.min(maxDeltaY, Math.max(minDeltaY, deltaY));

            moveItems.forEach(item => {
              const newX = Math.round(item.origX + deltaX);
              const newY = Math.round(item.origY + deltaY);
              dispatch({ type: 'UPDATE_PROPERTY', widgetId: item.id, key: 'x', value: String(newX) });
              dispatch({ type: 'UPDATE_PROPERTY', widgetId: item.id, key: 'y', value: String(newY) });
            });

            const draggedRect = {
              x: groupMinX + deltaX,
              y: groupMinY + deltaY,
              width: groupWidth,
              height: groupHeight,
            };

            const { guides, spacings } = computeAlignmentGuides(
              draggedRect,
              siblingWidgets,
              8
            );

            const parentSpacings = getParentSpacingLabels(draggedRect, parentSize);
            const offsetX = parentRect.left - rootRect.left;
            const offsetY = parentRect.top - rootRect.top;

            const offsetGuides = guides.map(g =>
              g.type === 'vertical'
                ? { ...g, position: g.position + offsetX }
                : { ...g, position: g.position + offsetY }
            );
            const offsetSpacings = [...spacings, ...parentSpacings].map(s => ({
              ...s,
              x: s.x + offsetX,
              y: s.y + offsetY,
            }));

            if (onDragUpdate) {
              onDragUpdate(offsetGuides, offsetSpacings);
            }
          };

          const onUp = (ev: MouseEvent) => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            setIsDraggingWithCtrl(false);
            
            // Auto-generate anchors ONLY if Ctrl key is held when dropping (single widget)
            if (ev.ctrlKey && moveItems.length === 1) {
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
              pushHistory(moveItems.length > 1 ? 'Move widgets' : 'Move widget');
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
          className="editor-canvas-root inline-flex flex-col gap-4" 
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
