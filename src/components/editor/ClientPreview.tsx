// Client Preview Mode - Simulates OTClient rendering without selection/editing UI

import { OTUIWidget } from '@/lib/otui-types';
import { useEditor } from '@/lib/editor-context';
import { X } from 'lucide-react';
import { useState, useMemo } from 'react';
import { t } from '@/lib/i18n';

// Build a map of all widgets by ID and name for anchor resolution
function buildWidgetMap(widgets: OTUIWidget[]): Map<string, OTUIWidget> {
  const map = new Map<string, OTUIWidget>();
  
  function traverse(widget: OTUIWidget) {
    map.set(widget.id, widget);
    map.set(widget.name, widget);
    widget.children.forEach(traverse);
  }
  
  widgets.forEach(traverse);
  return map;
}

function getClientStyle(
  widget: OTUIWidget, 
  isRootWidget = false,
  siblings: OTUIWidget[] = [],
  widgetIndex: number = 0,
  widgetMap: Map<string, OTUIWidget> = new Map(),
  parentEl?: HTMLElement
): React.CSSProperties {
  const props = widget.properties;
  const style: React.CSSProperties = { position: 'relative', boxSizing: 'border-box' };

  // Size - Auto dimensions based on widget type
  let hasExplicitSize = false;
  
  if (props.size) {
    const [w, h] = props.size.split(' ').map(Number);
    if (w) {
      style.width = w;
      hasExplicitSize = true;
    }
    if (h) {
      style.height = h;
      hasExplicitSize = true;
    }
  }
  if (props.width) {
    style.width = Number(props.width);
    hasExplicitSize = true;
  }
  if (props.height) {
    style.height = Number(props.height);
    hasExplicitSize = true;
  }

  // Default sizes for widgets without explicit dimensions
  if (!hasExplicitSize) {
    // Labels should auto-size to content
    if (widget.type === 'UILabel') {
      style.width = 'auto';
      style.height = 'auto';
      style.display = 'inline-block';
    }
    // Buttons need default sizing
    else if (widget.type === 'UIButton') {
      style.width = 'auto';
      style.height = 'auto';
      style.display = 'inline-block';
    }
    // TextEdit needs proper input dimensions
    else if (widget.type === 'UITextEdit') {
      style.width = props.width ? Number(props.width) : '100%';
      style.height = 20; // Default text input height
    }
    // Panels should auto-size to children
    else if (widget.type === 'UIPanel' || widget.type === 'UIWidget') {
      style.width = 'auto';
      style.height = 'auto';
    }
  }
  
  // Visual
  if (props['background-color']) style.backgroundColor = props['background-color'];
  if (props.color) style.color = props.color;
  if (props.opacity) style.opacity = Number(props.opacity);
  if (props.padding) {
    const vals = props.padding.split(' ').map(Number);
    if (vals.length === 1) style.padding = vals[0];
    else if (vals.length === 4) style.padding = `${vals[0]}px ${vals[1]}px ${vals[2]}px ${vals[3]}px`;
  }
  if (props['border-width']) {
    style.borderWidth = Number(props['border-width']);
    style.borderStyle = 'solid';
  }
  if (props['border-color']) style.borderColor = props['border-color'];
  if (props.font) style.fontFamily = props.font;
  
  // Text wrapping
  if (props['text-wrap'] === 'true') style.whiteSpace = 'pre-wrap';
  if (props['text-auto-resize'] === 'true') {
    style.display = 'inline-block';
    style.width = 'auto';
  }

  // Layout
  if (props['layout.type'] === 'vertical') {
    style.display = 'flex'; 
    style.flexDirection = 'column';
    if (props['layout.spacing']) style.gap = Number(props['layout.spacing']);
  } else if (props['layout.type'] === 'horizontal') {
    style.display = 'flex'; 
    style.flexDirection = 'row';
    if (props['layout.spacing']) style.gap = Number(props['layout.spacing']);
  } else if (props['layout.type'] === 'grid') {
    style.display = 'grid';
    if (props['layout.cell-size']) {
      const [cw, ch] = props['layout.cell-size'].split(' ').map(Number);
      style.gridTemplateColumns = `repeat(auto-fill, ${cw}px)`;
      style.gridAutoRows = `${ch}px`;
    }
  }

  // Anchors and positioning
  let hasAnchors = false;
  
  // Handle individual margins
  const marginLeft = props['margin-left'] ? Number(props['margin-left']) : 0;
  const marginTop = props['margin-top'] ? Number(props['margin-top']) : 0;
  const marginRight = props['margin-right'] ? Number(props['margin-right']) : 0;
  const marginBottom = props['margin-bottom'] ? Number(props['margin-bottom']) : 0;

  // anchors.fill
  if (props['anchors.fill'] === 'parent') { 
    style.width = '100%'; 
    style.height = '100%';
    hasAnchors = true;
  }
  
  // anchors.centerIn
  if (props['anchors.centerIn'] === 'parent') {
    style.position = 'absolute';
    style.left = '50%';
    style.top = '50%';
    style.transform = 'translate(-50%, -50%)';
    hasAnchors = true;
  }

  // anchors.horizontalCenter
  if (props['anchors.horizontalCenter'] === 'parent.horizontalCenter') {
    style.position = 'absolute';
    style.left = '50%';
    style.transform = style.transform ? `${style.transform} translateX(-50%)` : 'translateX(-50%)';
    if (marginTop) style.top = marginTop;
    hasAnchors = true;
  }

  // anchors.verticalCenter
  if (props['anchors.verticalCenter'] === 'parent.verticalCenter') {
    style.position = 'absolute';
    style.top = '50%';
    style.transform = style.transform ? `${style.transform} translateY(-50%)` : 'translateY(-50%)';
    if (marginLeft) style.left = marginLeft;
    hasAnchors = true;
  }

  // Process anchor properties
  const anchorProps = Object.keys(props).filter(k => k.startsWith('anchors.') && !k.includes('fill') && !k.includes('centerIn') && !k.includes('horizontalCenter') && !k.includes('verticalCenter'));
  
  for (const anchorKey of anchorProps) {
    const anchorValue = props[anchorKey];
    if (!anchorValue) continue;
    
    const anchorSide = anchorKey.replace('anchors.', ''); // left, top, right, bottom
    
    // Parse anchor value: "parent.left", "parent.right", "widgetName.bottom", "prev.right", etc.
    const match = anchorValue.match(/^([\w]+)\.([\w]+)$/);
    if (!match) continue;
    
    const [, targetName, targetSide] = match;
    hasAnchors = true;
    
    // All anchors use absolute positioning for proper OTClient simulation
    style.position = 'absolute';
    
    if (targetName === 'parent') {
      // Anchor to parent edges
      if (anchorSide === 'left' && targetSide === 'left') {
        style.left = marginLeft;
      } else if (anchorSide === 'right' && targetSide === 'right') {
        style.right = marginRight;
      } else if (anchorSide === 'top' && targetSide === 'top') {
        style.top = marginTop;
      } else if (anchorSide === 'bottom' && targetSide === 'bottom') {
        style.bottom = marginBottom;
      }
    } else if (targetName === 'prev') {
      // Anchor to previous sibling
      // In OTClient, this positions relative to the previous widget
      // For now, we approximate with margins and absolute positioning
      if (anchorSide === 'top' && targetSide === 'bottom') {
        // Position below previous widget - approximate with margin
        style.top = marginTop || 0;
      } else if (anchorSide === 'left' && targetSide === 'right') {
        // Position right of previous widget
        style.left = marginLeft || 0;
      } else if (anchorSide === 'top' && targetSide === 'top') {
        style.top = marginTop || 0;
      } else if (anchorSide === 'left' && targetSide === 'left') {
        style.left = marginLeft || 0;
      }
    } else {
      // Anchor to named sibling widget
      const targetWidget = widgetMap.get(targetName);
      if (targetWidget) {
        // For named anchors, we use margins similar to prev
        if (anchorSide === 'top' && targetSide === 'bottom') {
          style.top = marginTop || 0;
        } else if (anchorSide === 'left' && targetSide === 'right') {
          style.left = marginLeft || 0;
        } else if (anchorSide === 'top' && targetSide === 'top') {
          style.top = marginTop || 0;
        } else if (anchorSide === 'left' && targetSide === 'left') {
          style.left = marginLeft || 0;
        }
      }
    }
  }

  // Fallback to x/y if no anchors
  if (!hasAnchors && !isRootWidget && (props.x !== undefined || props.y !== undefined)) {
    style.position = 'absolute';
    if (props.x !== undefined) style.left = Number(props.x);
    if (props.y !== undefined) style.top = Number(props.y);
  }

  return style;
}

function ClientWidget({ 
  widget, 
  onTooltipShow, 
  onTooltipHide, 
  isRootWidget = false,
  siblings = [],
  widgetIndex = 0,
  widgetMap = new Map()
}: { 
  widget: OTUIWidget; 
  onTooltipShow: (id: string, text: string) => void; 
  onTooltipHide: () => void; 
  isRootWidget?: boolean;
  siblings?: OTUIWidget[];
  widgetIndex?: number;
  widgetMap?: Map<string, OTUIWidget>;
}) {
  if (widget.properties.visible === 'false') return null;
  const style = getClientStyle(widget, isRootWidget, siblings, widgetIndex, widgetMap);
  const text = widget.properties.text?.replace(/^tr\(['"](.+)['"]\)$/, '$1').replace(/"/g, '').replace(/\\n/g, '\n') || '';
  const tooltip = widget.properties.tooltip?.replace(/"/g, '');

  const typeRenderers: Record<string, () => React.ReactNode> = {
    UILabel: () => <span style={{ fontSize: 12, whiteSpace: style.whiteSpace || 'nowrap', lineHeight: '1.4' }}>{text || widget.name}</span>,
    UIButton: () => (
      <div style={{ 
        padding: '4px 12px', 
        background: '#3a3a3a', 
        border: '1px solid #555', 
        borderRadius: 2, 
        textAlign: 'center', 
        fontSize: 12, 
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        minWidth: 'fit-content'
      }}>
        {text || 'Button'}
      </div>
    ),
    UITextEdit: () => (
      <div style={{ 
        width: style.width || '100%', 
        height: style.height || 20, 
        background: '#1a1a1a', 
        border: '1px solid #444', 
        borderRadius: 2, 
        padding: '2px 6px', 
        fontSize: 11, 
        color: '#888',
        boxSizing: 'border-box'
      }}>
        {text || ''}
      </div>
    ),
    UIProgressBar: () => {
      const pct = Number(widget.properties.percent || widget.properties.value) || 50;
      return (
        <div style={{ width: '100%', height: '100%', background: '#222', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#4a9' }} />
        </div>
      );
    },
    UIImage: () => (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a', border: '1px solid #333', fontSize: 10, color: '#666' }}>
        {widget.properties['image-source']?.replace(/"/g, '') || 'Image'}
      </div>
    ),
    UIPanel: () => null,
    UIMiniWindow: () => (
      <>
        <div style={{ width: '100%', height: 24, background: '#2a2a2a', borderBottom: '1px solid #444', display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 12, fontWeight: 600 }}>
          {text || 'Window'}
          <div style={{ marginLeft: 'auto', width: 14, height: 14, background: '#555', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, cursor: 'pointer' }}>✕</div>
        </div>
        {widget.children.map((c, idx) => (
          <ClientWidget 
            key={c.id} 
            widget={c} 
            onTooltipShow={onTooltipShow} 
            onTooltipHide={onTooltipHide}
            siblings={widget.children}
            widgetIndex={idx}
            widgetMap={widgetMap}
          />
        ))}
      </>
    ),
  };

  const isMiniWindow = widget.type === 'UIMiniWindow';
  const renderContent = typeRenderers[widget.type];

  return (
    <div
      style={{ 
        ...style, 
        backgroundColor: style.backgroundColor || (widget.type === 'UIPanel' ? '#222' : widget.type === 'UIWidget' ? '#181818' : undefined),
        borderStyle: style.borderWidth ? 'solid' : undefined
      }}
      onMouseEnter={() => tooltip && onTooltipShow(widget.id, tooltip)}
      onMouseLeave={() => onTooltipHide()}
    >
      {renderContent?.()}
      {!isMiniWindow && widget.children.map((c, idx) => (
        <ClientWidget 
          key={c.id} 
          widget={c} 
          onTooltipShow={onTooltipShow} 
          onTooltipHide={onTooltipHide}
          siblings={widget.children}
          widgetIndex={idx}
          widgetMap={widgetMap}
        />
      ))}
    </div>
  );
}

interface ClientPreviewProps {
  onClose: () => void;
}

export function ClientPreviewModal({ onClose }: ClientPreviewProps) {
  const { state } = useEditor();
  const [tooltipState, setTooltipState] = useState<{ widgetId: string; text: string; x: number; y: number } | null>(null);

  // Check if we have a virtual root (multiple root widgets)
  const isVirtualRoot = state.rootWidgets.length === 1 && state.rootWidgets[0].id === '__virtual_root__';
  const widgetsToRender = isVirtualRoot ? state.rootWidgets[0].children : state.rootWidgets;

  // Build widget map for anchor resolution
  const widgetMap = useMemo(() => buildWidgetMap(state.rootWidgets), [state.rootWidgets]);

  const handleTooltipShow = (widgetId: string, text: string) => {
    setTooltipState({ widgetId, text, x: 0, y: 0 });
  };

  const handleTooltipHide = () => {
    setTooltipState(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="relative max-w-[90vw] max-h-[90vh] overflow-auto"
        onClick={e => e.stopPropagation()}
        onMouseMove={e => {
          if (tooltipState) {
            setTooltipState({ ...tooltipState, x: e.clientX, y: e.clientY });
          }
        }}
      >
        <button
          onClick={onClose}
          className="absolute -top-8 right-0 text-foreground/70 hover:text-foreground flex items-center gap-1 text-xs"
        >
          <X className="w-4 h-4" /> {t('clientPreview.close')}
        </button>
        <div className="bg-[#111] border border-[#333] rounded p-2 flex flex-col items-center" style={{ width: '100%', minWidth: 200 }}>
          <div className="text-[10px] text-[#666] mb-2 font-mono">{t('clientPreview.title')}</div>

          {/* Preview viewport: renders all root widgets */}
          <div className="space-y-4">
            {widgetsToRender.map((w, idx) => {
              const width = w.properties.size ? Number(w.properties.size.split(' ')[0]) || 600 : 600;
              const height = w.properties.size ? Number(w.properties.size.split(' ')[1]) || 400 : 400;
              
              return (
                <div
                  key={w.id}
                  className="relative bg-[#0c0f12] border border-[#222]"
                  style={{
                    width,
                    height,
                    overflow: 'visible',
                    position: 'relative',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ 
                    fontFamily: 'Verdana, sans-serif', 
                    color: '#ccc', 
                    fontSize: 12, 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%', 
                    height: '100%'
                  }}>
                    <ClientWidget 
                      widget={w} 
                      onTooltipShow={handleTooltipShow} 
                      onTooltipHide={handleTooltipHide} 
                      isRootWidget={true}
                      siblings={widgetsToRender}
                      widgetIndex={idx}
                      widgetMap={widgetMap}
                    />
                  </div>
                </div>
              );
            })}

            {widgetsToRender.length === 0 && (
              <div className="text-[#555] text-center py-20 min-w-[400px]">No widgets to preview</div>
            )}
          </div>
        </div>
        {tooltipState && (
          <div
            className="fixed bg-[#2a2a2a] border border-[#666] rounded px-3 py-2 text-[#ccc] text-xs font-mono max-w-xs pointer-events-none z-[60]"
            style={{
              left: `${tooltipState.x + 10}px`,
              top: `${tooltipState.y + 10}px`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            {tooltipState.text}
          </div>
        )}
      </div>
    </div>
  );
}
