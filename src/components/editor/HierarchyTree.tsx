// Hierarchy Tree - Shows widget parent/child structure

import { OTUIWidget } from '@/lib/otui-types';
import { useEditor } from '@/lib/editor-context';
import { ChevronRight, ChevronDown, Trash2, Copy, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

function TreeNode({ widget, depth = 0 }: { widget: OTUIWidget; depth?: number }) {
  const { state, dispatch, pushHistory } = useEditor();
  const [expanded, setExpanded] = useState(true);
  const isSelected = state.selectedWidgetId === widget.id;
  const hasChildren = widget.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-1 py-0.5 cursor-pointer text-xs rounded-sm transition-colors group
          ${isSelected ? 'bg-primary/20 text-primary' : 'hover:bg-editor-hover text-foreground'}`}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
        onClick={() => dispatch({ type: 'SELECT_WIDGET', id: widget.id })}
      >
        <button
          className="w-4 h-4 flex items-center justify-center shrink-0"
          onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
          ) : <span className="w-3" />}
        </button>

        <span className="truncate flex-1 font-mono text-[11px]">
          <span className="text-muted-foreground">{widget.name}</span>
          <span className="text-primary/60 ml-1">{'<'} {widget.type}</span>
        </span>

        <div className="hidden group-hover:flex items-center gap-0.5">
          <button
            className="p-0.5 rounded hover:bg-secondary"
            onClick={e => { e.stopPropagation(); dispatch({ type: 'DUPLICATE_WIDGET', id: widget.id }); pushHistory('Duplicate'); }}
          >
            <Copy className="w-3 h-3 text-muted-foreground" />
          </button>
          <button
            className="p-0.5 rounded hover:bg-destructive/20"
            onClick={e => { e.stopPropagation(); dispatch({ type: 'REMOVE_WIDGET', id: widget.id }); pushHistory('Delete'); }}
          >
            <Trash2 className="w-3 h-3 text-destructive" />
          </button>
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {widget.children.map(child => (
            <TreeNode key={child.id} widget={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function HierarchyTree() {
  const { state } = useEditor();

  return (
    <div className="flex flex-col h-full">
      <div className="editor-panel-header">Hierarchy</div>
      <div className="flex-1 overflow-y-auto py-1">
        {state.rootWidgets.length === 0 ? (
          <div className="text-xs text-muted-foreground p-3 text-center">
            Drop widgets here to start
          </div>
        ) : (
          state.rootWidgets.map(w => <TreeNode key={w.id} widget={w} />)
        )}
      </div>
    </div>
  );
}
