// Photoshop-style Ruler Guides - User-created guide lines for alignment

import { useState, useEffect } from 'react';
import { X, Copy } from 'lucide-react';
import { t } from '@/lib/i18n';

export interface RulerGuide {
  id: string;
  type: 'horizontal' | 'vertical';
  position: number; // px from top/left
}

interface RulerGuidesProps {
  guides: RulerGuide[];
  onAddGuide: (type: 'horizontal' | 'vertical', position: number) => void;
  onRemoveGuide: (id: string) => void;
  onUpdateGuide: (id: string, position: number) => void;
  showRulers: boolean;
}

interface GuideContextMenu {
  guideId: string;
  x: number;
  y: number;
}

export function RulerGuides({ guides, onAddGuide, onRemoveGuide, onUpdateGuide, showRulers }: RulerGuidesProps) {
  const [draggedGuide, setDraggedGuide] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<GuideContextMenu | null>(null);
  const [hasDragged, setHasDragged] = useState(false);

  // Close context menu when clicking outside
  useEffect(() => {
    if (contextMenu) {
      const handleClick = () => setContextMenu(null);
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  if (!showRulers) return null;

  const handleDuplicate = (guideId: string) => {
    const guide = guides.find(g => g.id === guideId);
    if (guide) {
      onAddGuide(guide.type, guide.position + 10);
    }
    setContextMenu(null);
  };

  const handleDelete = (guideId: string) => {
    onRemoveGuide(guideId);
    setContextMenu(null);
  };

  return (
    <>
      {/* Render guide lines */}
      {guides.map(guide => (
        <div
          key={guide.id}
          className="absolute pointer-events-auto cursor-move z-40"
          style={
            guide.type === 'vertical'
              ? { left: guide.position - 2, top: 0, bottom: 0, width: 5 }
              : { top: guide.position - 2, left: 0, right: 0, height: 5 }
          }
          onMouseDown={e => {
            // Only drag if not right-click (context menu)
            if (e.button !== 0) return;
            e.stopPropagation();
            setDraggedGuide(guide.id);
            setHasDragged(false);

            const startPos = guide.type === 'vertical' ? e.clientX : e.clientY;
            const originalPos = guide.position;

            const onMove = (ev: MouseEvent) => {
              ev.preventDefault();
              setHasDragged(true);
              const currentPos = guide.type === 'vertical' ? ev.clientX : ev.clientY;
              const delta = currentPos - startPos;
              const newPos = Math.max(0, originalPos + delta);
              onUpdateGuide(guide.id, newPos);
            };

            const onUp = (ev: MouseEvent) => {
              setDraggedGuide(null);
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
              
              // Only open context menu if didn't drag
              if (!hasDragged) {
                setTimeout(() => {
                  setContextMenu({
                    guideId: guide.id,
                    x: ev.clientX,
                    y: ev.clientY
                  });
                }, 10);
              }
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          }}
        >
          {/* Guide line */}
          <div
            className={`${guide.type === 'vertical' ? 'w-px h-full mx-auto' : 'w-full h-px my-auto'} ${draggedGuide === guide.id ? 'bg-cyan-400' : 'bg-cyan-500/70'}`}
          />

          {/* Position label */}
          <div
            className="absolute bg-cyan-500 text-white text-[9px] px-1 rounded font-mono pointer-events-none"
            style={
              guide.type === 'vertical'
                ? { left: 2, top: 20 }
                : { left: 20, top: 2 }
            }
          >
            {Math.round(guide.position)}px
          </div>
        </div>
      ))}

      {/* Context Menu for guides */}
      {contextMenu && (
        <div
          className="fixed bg-popover border border-border rounded-md shadow-lg z-[100] py-1 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="w-full px-3 py-1.5 text-xs text-left hover:bg-accent flex items-center gap-2"
            onClick={() => handleDuplicate(contextMenu.guideId)}
          >
            <Copy className="w-3 h-3" />
            {t('action.duplicate')}
          </button>
          <div className="h-px bg-border my-0.5" />
          <button
            className="w-full px-3 py-1.5 text-xs text-left hover:bg-destructive/20 text-destructive flex items-center gap-2"
            onClick={() => handleDelete(contextMenu.guideId)}
          >
            <X className="w-3 h-3" />
            {t('action.delete')}
          </button>
        </div>
      )}
    </>
  );
}

interface RulerBarsProps {
  onCreateGuide: (type: 'horizontal' | 'vertical', position: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function RulerBars({ onCreateGuide, containerRef }: RulerBarsProps) {
  const [isDraggingH, setIsDraggingH] = useState(false);
  const [isDraggingV, setIsDraggingV] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });

  return (
    <>
      {/* Horizontal Ruler (top) */}
      <div
        className="absolute top-0 left-8 right-0 h-8 bg-editor-panel border-b border-border z-50 cursor-crosshair select-none"
        onMouseDown={e => {
          if (!containerRef.current) return;
          setIsDraggingH(true);
          const rect = containerRef.current.getBoundingClientRect();
          setDragPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

          const onMove = (ev: MouseEvent) => {
            const newRect = containerRef.current?.getBoundingClientRect();
            if (newRect) {
              setDragPos({ x: ev.clientX - newRect.left, y: ev.clientY - newRect.top });
            }
          };

          const onUp = (ev: MouseEvent) => {
            setIsDraggingH(false);
            const finalRect = containerRef.current?.getBoundingClientRect();
            if (finalRect) {
              const y = ev.clientY - finalRect.top;
              if (y > 0 && y < finalRect.height) {
                onCreateGuide('horizontal', y);
              }
            }
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
          };

          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        }}
      >
        <div className="flex items-center justify-center h-full text-[9px] text-muted-foreground font-mono">
          {t('canvas.horizontalRuler')}
        </div>
      </div>

      {/* Vertical Ruler (left) */}
      <div
        className="absolute top-8 left-0 bottom-0 w-8 bg-editor-panel border-r border-border z-50 cursor-crosshair select-none flex items-center justify-center"
        onMouseDown={e => {
          if (!containerRef.current) return;
          setIsDraggingV(true);
          const rect = containerRef.current.getBoundingClientRect();
          setDragPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

          const onMove = (ev: MouseEvent) => {
            const newRect = containerRef.current?.getBoundingClientRect();
            if (newRect) {
              setDragPos({ x: ev.clientX - newRect.left, y: ev.clientY - newRect.top });
            }
          };

          const onUp = (ev: MouseEvent) => {
            setIsDraggingV(false);
            const finalRect = containerRef.current?.getBoundingClientRect();
            if (finalRect) {
              const x = ev.clientX - finalRect.left;
              if (x > 0 && x < finalRect.width) {
                onCreateGuide('vertical', x);
              }
            }
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
          };

          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        }}
      >
        <div className="text-[9px] text-muted-foreground font-mono" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          {t('canvas.verticalRuler')}
        </div>
      </div>

      {/* Corner box */}
      <div className="absolute top-0 left-0 w-8 h-8 bg-editor-panel border-r border-b border-border z-50" />

      {/* Preview guide while dragging */}
      {isDraggingV && (
        <div
          className="absolute top-0 bottom-0 w-px bg-cyan-400 pointer-events-none z-45"
          style={{ left: dragPos.x }}
        />
      )}
      {isDraggingH && (
        <div
          className="absolute left-0 right-0 h-px bg-cyan-400 pointer-events-none z-45"
          style={{ top: dragPos.y }}
        />
      )}
    </>
  );
}
