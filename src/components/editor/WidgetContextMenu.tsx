import { useEditor } from '@/lib/editor-context';
import { OTUIWidget } from '@/lib/otui-types';
import { useEffect, useRef } from 'react';
import { Copy, Trash2, CopyPlus, ArrowUp, ArrowDown, Eye, EyeOff, Clipboard } from 'lucide-react';
import { t } from '@/lib/i18n';

interface WidgetContextMenuProps {
  widget: OTUIWidget;
  position: { x: number; y: number };
  onClose: () => void;
}

export function WidgetContextMenu({ widget, position, onClose }: WidgetContextMenuProps) {
  const { dispatch, pushHistory, state } = useEditor();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [onClose]);

  const items = [
    {
      label: t('action.duplicate'),
      icon: CopyPlus,
      action: () => {
        dispatch({ type: 'DUPLICATE_WIDGET', id: widget.id });
        pushHistory('Duplicate widget');
      },
    },
    {
      label: t('action.copy'),
      icon: Copy,
      action: () => {
        dispatch({ type: 'SELECT_WIDGET', id: widget.id });
        // Store in clipboard via state
      },
    },
    {
      label: widget.properties.visible === 'false' ? t('action.show') : t('action.hide'),
      icon: widget.properties.visible === 'false' ? Eye : EyeOff,
      action: () => {
        dispatch({
          type: 'UPDATE_PROPERTY',
          widgetId: widget.id,
          key: 'visible',
          value: widget.properties.visible === 'false' ? 'true' : 'false',
        });
        pushHistory('Toggle visibility');
      },
    },
    {
      label: t('action.moveUp'),
      icon: ArrowUp,
      action: () => {
        // Move widget up in parent's children order
        dispatch({ type: 'MOVE_WIDGET', widgetId: widget.id, newParentId: widget.parentId, index: -1 });
        pushHistory('Move widget up');
      },
    },
    {
      label: t('action.moveDown'),
      icon: ArrowDown,
      action: () => {
        dispatch({ type: 'MOVE_WIDGET', widgetId: widget.id, newParentId: widget.parentId, index: 1 });
        pushHistory('Move widget down');
      },
    },
    { type: 'separator' as const },
    {
      label: t('action.delete'),
      icon: Trash2,
      danger: true,
      action: () => {
        dispatch({ type: 'REMOVE_WIDGET', id: widget.id });
        pushHistory('Delete widget');
      },
    },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[160px] bg-popover border border-border rounded-md shadow-xl py-1 text-xs"
      style={{ left: position.x, top: position.y }}
    >
      <div className="px-3 py-1 text-[10px] text-muted-foreground font-mono border-b border-border mb-1 truncate">
        {widget.name} ({widget.type})
      </div>
      {items.map((item, i) => {
        if ('type' in item && item.type === 'separator') {
          return <div key={i} className="h-px bg-border my-1" />;
        }
        const { label, icon: Icon, action, danger } = item as any;
        return (
          <button
            key={i}
            className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-secondary/80 text-left ${danger ? 'text-destructive hover:text-destructive' : 'text-foreground'}`}
            onClick={() => { action(); onClose(); }}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
