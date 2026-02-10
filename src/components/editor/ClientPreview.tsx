// Client Preview Mode - Simulates OTClient rendering without selection/editing UI

import { OTUIWidget } from '@/lib/otui-types';
import { useEditor } from '@/lib/editor-context';
import { X } from 'lucide-react';

function getClientStyle(widget: OTUIWidget): React.CSSProperties {
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
  if (props['border-width']) style.borderWidth = Number(props['border-width']);
  if (props['border-color']) style.borderColor = props['border-color'];
  if (props.font) style.fontFamily = props.font;

  return style;
}

function ClientWidget({ widget }: { widget: OTUIWidget }) {
  if (widget.properties.visible === 'false') return null;
  const style = getClientStyle(widget);
  const text = widget.properties.text?.replace(/"/g, '') || '';

  const typeRenderers: Record<string, () => React.ReactNode> = {
    UILabel: () => <span style={{ fontSize: 12 }}>{text || widget.name}</span>,
    UIButton: () => (
      <div style={{ padding: '4px 12px', background: '#3a3a3a', border: '1px solid #555', borderRadius: 2, textAlign: 'center', fontSize: 12, cursor: 'pointer' }}>
        {text || 'Button'}
      </div>
    ),
    UITextEdit: () => (
      <div style={{ width: '100%', height: '100%', background: '#1a1a1a', border: '1px solid #444', borderRadius: 2, padding: '2px 6px', fontSize: 11, color: '#888' }}>
        {text || ''}
      </div>
    ),
    UIProgressBar: () => {
      const pct = Number(widget.properties.percent) || 50;
      return (
        <div style={{ width: '100%', height: '100%', background: '#222', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#4a9' }} />
        </div>
      );
    },
    UIImage: () => (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a', border: '1px solid #333', fontSize: 10, color: '#666' }}>
        Image
      </div>
    ),
    UIMiniWindow: () => (
      <>
        <div style={{ width: '100%', height: 24, background: '#2a2a2a', borderBottom: '1px solid #444', display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 12, fontWeight: 600 }}>
          {text || 'Window'}
          <div style={{ marginLeft: 'auto', width: 14, height: 14, background: '#555', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, cursor: 'pointer' }}>✕</div>
        </div>
        {widget.children.map(c => <ClientWidget key={c.id} widget={c} />)}
      </>
    ),
  };

  const isMiniWindow = widget.type === 'UIMiniWindow';
  const renderContent = typeRenderers[widget.type];

  return (
    <div style={{ ...style, backgroundColor: style.backgroundColor || (widget.type === 'UIPanel' ? '#222' : undefined) }}>
      {renderContent?.()}
      {!isMiniWindow && widget.children.map(c => <ClientWidget key={c.id} widget={c} />)}
    </div>
  );
}

interface ClientPreviewProps {
  onClose: () => void;
}

export function ClientPreviewModal({ onClose }: ClientPreviewProps) {
  const { state } = useEditor();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div className="relative max-w-[90vw] max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-8 right-0 text-foreground/70 hover:text-foreground flex items-center gap-1 text-xs"
        >
          <X className="w-4 h-4" /> Close Preview
        </button>
        <div className="bg-[#111] border border-[#333] rounded overflow-auto p-2" style={{ minWidth: 400, minHeight: 300 }}>
          <div className="text-[10px] text-[#666] mb-2 font-mono">OTClient Preview</div>
          <div style={{ fontFamily: 'Verdana, sans-serif', color: '#ccc', fontSize: 12 }}>
            {state.rootWidgets.map(w => <ClientWidget key={w.id} widget={w} />)}
            {state.rootWidgets.length === 0 && (
              <div className="text-[#555] text-center py-20">No widgets to preview</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
