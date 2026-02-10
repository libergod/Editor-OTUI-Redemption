// Canvas Preview - Visual representation of the OTUI widget tree

import { OTUIWidget, WidgetType } from '@/lib/otui-types';
import { useEditor } from '@/lib/editor-context';
import { createWidget } from '@/lib/otui-types';
import { useCallback, useState } from 'react';
import { ResizeHandle } from './ResizeHandle';
import { WidgetContextMenu } from './WidgetContextMenu';

function getWidgetDisplayStyle(widget: OTUIWidget): React.CSSProperties {
  const props = widget.properties;
  const style: React.CSSProperties = { position: 'relative' };

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

function CanvasWidget({ widget }: { widget: OTUIWidget }) {
  const { state, dispatch, pushHistory } = useEditor();
  const isSelected = state.selectedWidgetId === widget.id;
  const [isDragOver, setIsDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

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
        className={`widget-node ${isSelected ? 'selected' : ''} ${isDragOver ? 'drop-target' : ''}`}
        style={{
          ...style,
          backgroundColor: style.backgroundColor || getTypeColor(widget.type),
          minWidth: 40,
          minHeight: 20,
        }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragOver(false)}
      >
        {isSelected && (
          <div className="absolute -top-4 left-0 text-[9px] font-mono text-primary bg-primary/10 px-1 rounded-t z-10 pointer-events-none">
            {widget.name}
          </div>
        )}

        {renderContent()}

        {!isMiniWindow && widget.children.map(child => <CanvasWidget key={child.id} widget={child} />)}

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
        <span>Preview</span>
        <span className="text-[10px] text-muted-foreground font-normal normal-case tracking-normal">
          {state.rootWidgets.length} root widget{state.rootWidgets.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div
        className={`flex-1 editor-canvas-bg overflow-auto p-6 ${isDragOver ? 'drop-target' : ''}`}
        onClick={() => dispatch({ type: 'SELECT_WIDGET', id: null })}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragOver(false)}
      >
        <div className="inline-flex flex-col gap-4">
          {state.rootWidgets.map(w => <CanvasWidget key={w.id} widget={w} />)}
          {state.rootWidgets.length === 0 && (
            <div className="text-muted-foreground text-sm flex items-center justify-center min-h-[300px] min-w-[400px] border border-dashed border-border rounded">
              Drag widgets here to start building
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
