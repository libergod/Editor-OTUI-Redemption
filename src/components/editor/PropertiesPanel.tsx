// Properties Panel - Edit selected widget properties

import { useEditor } from '@/lib/editor-context';
import { t } from '@/lib/i18n';
import { PROPERTY_GROUPS } from '@/lib/otui-types';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

function PaddingControl({ selectedWidget, onChange }: { selectedWidget: any; onChange: (k: string, v: string) => void }) {
  const raw = selectedWidget.properties.padding || '';
  const parts = raw.split(' ').filter(Boolean);
  const [vals, setVals] = useState(() => {
    if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
    if (parts.length === 4) return parts;
    return ['', '', '', ''];
  });
  const [linked, setLinked] = useState(parts.length === 1);

  const setAll = (v: string) => setVals([v, v, v, v]);

  const update = (i: number, v: string) => {
    const next = [...vals];
    next[i] = v;
    if (linked) setAll(v);
    else setVals(next);
  };

  const apply = () => {
    const out = linked ? vals[0] || '0' : vals.map(x => x || '0').join(' ');
    onChange('padding', out);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input value={vals[0]} onChange={e => update(0, e.target.value)} onBlur={apply} placeholder="top" className="w-16 bg-secondary/80 border border-border rounded px-1 py-0.5 text-[11px]" />
        <input value={vals[1]} onChange={e => update(1, e.target.value)} onBlur={apply} placeholder="right" className="w-16 bg-secondary/80 border border-border rounded px-1 py-0.5 text-[11px]" />
        <input value={vals[2]} onChange={e => update(2, e.target.value)} onBlur={apply} placeholder="bottom" className="w-16 bg-secondary/80 border border-border rounded px-1 py-0.5 text-[11px]" />
        <input value={vals[3]} onChange={e => update(3, e.target.value)} onBlur={apply} placeholder="left" className="w-16 bg-secondary/80 border border-border rounded px-1 py-0.5 text-[11px]" />
        <label className="text-[11px] text-muted-foreground flex items-center gap-1">
          <input type="checkbox" checked={linked} onChange={e => setLinked(e.target.checked)} />
          <span>Link</span>
        </label>
      </div>
      <div className="text-[10px] text-muted-foreground">Use individual fields or link to set same padding for all sides.</div>
    </div>
  );
}

function MarginControl({ selectedWidget, onChange }: { selectedWidget: any; onChange: (k: string, v: string) => void }) {
  const get = (k: string) => selectedWidget.properties[k] || '';
  const [t, setT] = useState(get('margin-top'));
  const [r, setR] = useState(get('margin-right'));
  const [b, setB] = useState(get('margin-bottom'));
  const [l, setL] = useState(get('margin-left'));
  const [linked, setLinked] = useState(false);

  const apply = () => {
    onChange('margin-top', t);
    onChange('margin-right', r);
    onChange('margin-bottom', b);
    onChange('margin-left', l);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input value={t} onChange={e => { setT(e.target.value); if (linked) { setR(e.target.value); setB(e.target.value); setL(e.target.value); } }} onBlur={apply} placeholder="top" className="w-16 bg-secondary/80 border border-border rounded px-1 py-0.5 text-[11px]" />
        <input value={r} onChange={e => { setR(e.target.value); if (linked) { setT(e.target.value); setB(e.target.value); setL(e.target.value); } }} onBlur={apply} placeholder="right" className="w-16 bg-secondary/80 border border-border rounded px-1 py-0.5 text-[11px]" />
        <input value={b} onChange={e => { setB(e.target.value); if (linked) { setT(e.target.value); setR(e.target.value); setL(e.target.value); } }} onBlur={apply} placeholder="bottom" className="w-16 bg-secondary/80 border border-border rounded px-1 py-0.5 text-[11px]" />
        <input value={l} onChange={e => { setL(e.target.value); if (linked) { setT(e.target.value); setR(e.target.value); setB(e.target.value); } }} onBlur={apply} placeholder="left" className="w-16 bg-secondary/80 border border-border rounded px-1 py-0.5 text-[11px]" />
        <label className="text-[11px] text-muted-foreground flex items-center gap-1">
          <input type="checkbox" checked={linked} onChange={e => setLinked(e.target.checked)} />
          <span>Link</span>
        </label>
      </div>
      <div className="text-[10px] text-muted-foreground">Set margins quickly; link to apply same value to all sides.</div>
    </div>
  );
}

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
  if (type === 'anchor') {
    const options: { value: string; label: string; desc: string }[] = [
      { value: '', label: 'None', desc: 'No anchoring; position follows parent flow.' },
      { value: 'parent.left', label: 'Left', desc: 'Anchor to parent left edge.' },
      { value: 'parent.right', label: 'Right', desc: 'Anchor to parent right edge.' },
      { value: 'parent.top', label: 'Top', desc: 'Anchor to parent top edge.' },
      { value: 'parent.bottom', label: 'Bottom', desc: 'Anchor to parent bottom edge.' },
      { value: 'parent.centerIn', label: 'Center', desc: 'Center inside parent.' },
      { value: 'parent.fill', label: 'Fill', desc: 'Stretch to fill parent.' },
      { value: 'parent.leftTop', label: 'LT', desc: 'Anchor to left-top corner of parent.' },
      { value: 'parent.rightBottom', label: 'RB', desc: 'Anchor to right-bottom corner of parent.' },
      { value: 'parent.horizontalCenter', label: 'HCenter', desc: 'Align horizontally to parent center.' },
      { value: 'parent.verticalCenter', label: 'VCenter', desc: 'Align vertically to parent center.' },
    ];

    const descMap = Object.fromEntries(options.map(o => [o.value, o.desc]));

    return (
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-secondary/80 border border-border rounded px-1.5 py-0.5 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
      >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    );
  }

  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={
        propKey === 'image-source' ? 'path/image.png' :
        propKey === 'font' ? 'Arial, Verdana' :
        propKey === 'text' ? 'Type text...' :
        propKey === 'onClick' || propKey === 'onHover' || propKey === 'onEnter' || propKey === 'onLeave' ? 'callback()' :
        propKey === 'tooltip' ? 'Hover text...' :
        propKey === 'size' ? '100 50' :
        propKey === 'padding' ? '10 or 5 5 5 5' :
        ''
      }
      className="w-full bg-secondary/80 border border-border rounded px-1.5 py-0.5 text-[11px] font-mono text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
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
            // Special handling for padding and margins
            if (prop.key === 'padding') {
              return (
                <div key={prop.key} className="flex items-start gap-2">
                  <label className="text-[10px] text-muted-foreground w-20 shrink-0 truncate">{prop.label}</label>
                  <div className="flex-1" onBlur={handleBlur}>
                    <PaddingControl selectedWidget={selectedWidget} onChange={handleChange} />
                  </div>
                </div>
              );
            }

            // Special handling for 'text' property with i18n toggle
            if (prop.key === 'text') {
              const textValue = selectedWidget.properties.text || '';
              const isTranslated = selectedWidget.properties['__i18n.text'] === 'true';
              
              return (
                <div key={prop.key} className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted-foreground flex items-center gap-1 group cursor-help">
                    {prop.label}
                    {prop.desc && (
                      <span 
                        title={t(prop.desc)} 
                        className="inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold bg-gradient-to-br from-primary/70 to-primary rounded-full text-primary-foreground opacity-70 group-hover:opacity-100 transition-opacity"
                      >
                        ?
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      value={textValue}
                      onChange={e => handleChange('text', e.target.value)}
                      onBlur={handleBlur}
                      placeholder="Type text..."
                      className="flex-1 bg-secondary/80 border border-border rounded px-1.5 py-0.5 text-[11px] font-mono text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <label className="flex items-center gap-1 whitespace-nowrap text-[10px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded bg-secondary/40 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={isTranslated}
                        onChange={e => handleChange('__i18n.text', e.target.checked ? 'true' : '')}
                        onBlur={handleBlur}
                        className="w-3 h-3"
                      />
                      <span>tr()</span>
                    </label>
                  </div>
                  {isTranslated && textValue && (
                    <div className="text-[9px] text-primary/70 font-mono px-2 py-1 bg-primary/10 rounded">
                      Preview: tr('{textValue}')
                    </div>
                  )}
                </div>
              );
            }

            if (prop.key === 'margin-top') {
              // render combined margin controls once (skip the other margin props below)
              return (
                <div key={prop.key} className="flex items-start gap-2">
                  <label className="text-[10px] text-muted-foreground w-20 shrink-0 truncate">Margins</label>
                  <div className="flex-1" onBlur={handleBlur}>
                    <MarginControl selectedWidget={selectedWidget} onChange={handleChange} />
                  </div>
                </div>
              );
            }

            // skip individual margin keys (they are handled above)
            if (prop.key === 'margin-right' || prop.key === 'margin-bottom' || prop.key === 'margin-left') {
              return null;
            }

            const value = prop.key === 'id'
              ? selectedWidget.name
              : selectedWidget.properties[prop.key] || '';

            return (
              <div key={prop.key} className="flex items-center gap-2">
                <label className="text-[10px] text-muted-foreground w-20 shrink-0 truncate flex items-center gap-1 group cursor-help">
                  {prop.label}
                  {prop.desc && (
                    <span 
                      title={t(prop.desc)} 
                      className="inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold bg-gradient-to-br from-primary/70 to-primary rounded-full text-primary-foreground opacity-70 group-hover:opacity-100 transition-opacity"
                    >
                      ?
                    </span>
                  )}
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
      <div className="editor-panel-header">{t('ui.properties')}</div>
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
          {t('ui.selectToEdit')}
        </div>
      )}
    </div>
  );
}
