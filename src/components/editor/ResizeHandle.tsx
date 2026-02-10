import { useCallback, useEffect, useState } from 'react';
import { useEditor } from '@/lib/editor-context';

type HandlePosition = 'right' | 'bottom' | 'bottom-right';

interface ResizeHandleProps {
  widgetId: string;
  position: HandlePosition;
}

export function ResizeHandle({ widgetId, position }: ResizeHandleProps) {
  const { state, dispatch, pushHistory } = useEditor();
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState({ w: 0, h: 0 });

  const widget = state.rootWidgets.reduce(function find(acc: any, w: any): any {
    if (w.id === widgetId) return w;
    return w.children.reduce(find, acc);
  }, null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });

    let w = 100, h = 100;
    if (widget) {
      if (widget.properties.size) {
        const parts = widget.properties.size.split(' ').map(Number);
        w = parts[0] || 100;
        h = parts[1] || 100;
      }
      if (widget.properties.width) w = Number(widget.properties.width) || w;
      if (widget.properties.height) h = Number(widget.properties.height) || h;
    }
    setStartSize({ w, h });
  }, [widget]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startPos.x;
      const dy = e.clientY - startPos.y;

      if (position === 'right' || position === 'bottom-right') {
        const newW = Math.max(20, startSize.w + dx);
        dispatch({ type: 'UPDATE_PROPERTY', widgetId, key: 'width', value: String(Math.round(newW)) });
        // Also update size property
        if (position === 'bottom-right') {
          const newH = Math.max(20, startSize.h + dy);
          dispatch({ type: 'UPDATE_PROPERTY', widgetId, key: 'height', value: String(Math.round(newH)) });
          dispatch({ type: 'UPDATE_PROPERTY', widgetId, key: 'size', value: `${Math.round(newW)} ${Math.round(newH)}` });
        } else {
          dispatch({ type: 'UPDATE_PROPERTY', widgetId, key: 'size', value: `${Math.round(newW)} ${startSize.h}` });
        }
      }
      if (position === 'bottom' && position !== 'bottom-right') {
        const newH = Math.max(20, startSize.h + dy);
        dispatch({ type: 'UPDATE_PROPERTY', widgetId, key: 'height', value: String(Math.round(newH)) });
        dispatch({ type: 'UPDATE_PROPERTY', widgetId, key: 'size', value: `${startSize.w} ${Math.round(newH)}` });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      pushHistory('Resize widget');
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startPos, startSize, position, widgetId, dispatch, pushHistory]);

  const positionClasses: Record<HandlePosition, string> = {
    'right': 'top-1/2 -right-1 -translate-y-1/2 cursor-ew-resize w-2 h-6',
    'bottom': '-bottom-1 left-1/2 -translate-x-1/2 cursor-ns-resize h-2 w-6',
    'bottom-right': '-bottom-1 -right-1 cursor-nwse-resize w-3 h-3',
  };

  return (
    <div
      className={`absolute z-20 rounded-sm ${positionClasses[position]} ${isDragging ? 'bg-primary' : 'bg-primary/60 hover:bg-primary'}`}
      onMouseDown={handleMouseDown}
    />
  );
}
