// Properties Panel - Edit selected widget properties

import { useEditor } from '@/lib/editor-context';
import { PROPERTY_GROUPS } from '@/lib/otui-types';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

function PropertyInput({
  propKey,
  value,
  type,
  onChange,
}: {
  propKey: string;
  value: string;
  type: string;
  onChange: (val: string) => void;
}) {
  if (type === 'boolean') {
    return (
      <button
        className={`px-2 py-0.5 rounded text-[11px] font-mono ${
          value === 'true' || value === '' ? 'bg-editor-success/20 text-editor-success' : 'bg-secondary text-muted-foreground'
        }`}
        onClick={() => onChange(value === 'true' || value === '' ? 'false' : 'true')}
      >
        {value === 'true' || value === '' ? 'true' : 'false'}
      </button>
    );
  }

  if (type === 'color') {
    return (
      <div className="flex items-center gap-1">
        <input
          type="color"
          value={value.startsWith('#') ? value : '#333333'}
          onChange={e => onChange(e.target.value)}
          className="w-5 h-5 rounded border-0 cursor-pointer bg-transparent"
        />
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 bg-secondary/80 border border-border rounded px-1.5 py-0.5 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>
    );
  }

  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={propKey}
      className="w-full bg-secondary/80 border border-border rounded px-1.5 py-0.5 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
    />
  );
}

function PropertyGroupSection({ group }: { group: typeof PROPERTY_GROUPS[0] }) {
  const { selectedWidget, dispatch, pushHistory } = useEditor();
  const [expanded, setExpanded] = useState(true);

  if (!selectedWidget) return null;

  const handleChange = (key: string, value: string) => {
    dispatch({ type: 'UPDATE_PROPERTY', widgetId: selectedWidget.id, key, value });
  };

  const handleBlur = () => {
    pushHistory('Edit property');
  };

  return (
    <div className="border-b border-border">
      <button
        className="w-full flex items-center gap-1 px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {group.label}
      </button>
      {expanded && (
        <div className="px-3 pb-2 space-y-1.5">
          {group.properties.map(prop => {
            const value = prop.key === 'id'
              ? selectedWidget.name
              : selectedWidget.properties[prop.key] || '';

            return (
              <div key={prop.key} className="flex items-center gap-2">
                <label className="text-[10px] text-muted-foreground w-20 shrink-0 truncate">
                  {prop.label}
                </label>
                <div className="flex-1" onBlur={handleBlur}>
                  {prop.key === 'id' ? (
                    <input
                      value={selectedWidget.name}
                      onChange={e => dispatch({ type: 'RENAME_WIDGET', widgetId: selectedWidget.id, name: e.target.value })}
                      onBlur={handleBlur}
                      className="w-full bg-secondary/80 border border-border rounded px-1.5 py-0.5 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  ) : (
                    <PropertyInput
                      propKey={prop.key}
                      value={value}
                      type={prop.type}
                      onChange={val => handleChange(prop.key, val)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PropertiesPanel() {
  const { selectedWidget } = useEditor();

  return (
    <div className="flex flex-col h-full">
      <div className="editor-panel-header">Properties</div>
      {selectedWidget ? (
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-2 border-b border-border">
            <div className="text-xs font-semibold text-foreground">{selectedWidget.name}</div>
            <div className="text-[10px] text-primary font-mono">{selectedWidget.type}</div>
          </div>
          {PROPERTY_GROUPS.map(group => (
            <PropertyGroupSection key={group.label} group={group} />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
          Select a widget to edit its properties
        </div>
      )}
    </div>
  );
}
