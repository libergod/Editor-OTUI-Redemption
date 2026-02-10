// Widget Palette - Left panel with draggable widget types

import { WIDGET_TYPES, WidgetTypeInfo } from '@/lib/otui-types';

const categories = [
  { key: 'container', label: 'Containers' },
  { key: 'display', label: 'Display' },
  { key: 'input', label: 'Input' },
  { key: 'layout', label: 'Layout' },
  { key: 'special', label: 'Special' },
] as const;

export function WidgetPalette() {
  const handleDragStart = (e: React.DragEvent, info: WidgetTypeInfo) => {
    e.dataTransfer.setData('widget-type', JSON.stringify({ type: info.type, label: info.label }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="editor-panel-header">Widgets</div>
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {categories.map(cat => {
          const items = WIDGET_TYPES.filter(w => w.category === cat.key);
          if (items.length === 0) return null;
          return (
            <div key={cat.key}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
                {cat.label}
              </div>
              <div className="grid grid-cols-2 gap-1">
                {items.map(info => (
                  <div
                    key={info.type}
                    draggable
                    onDragStart={e => handleDragStart(e, info)}
                    className="flex flex-col items-center gap-0.5 p-2 rounded-sm cursor-grab
                      bg-secondary/50 hover:bg-secondary border border-transparent hover:border-primary/30
                      text-xs text-secondary-foreground transition-colors select-none active:cursor-grabbing"
                  >
                    <span className="text-base leading-none">{info.icon}</span>
                    <span className="text-[10px] truncate w-full text-center">{info.label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
