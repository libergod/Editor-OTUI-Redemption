// Client Preview Mode - Simulates OTClient rendering without selection/editing UI

import { OTUIWidget } from '@/lib/otui-types';
import { useEditor } from '@/lib/editor-context';
import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { t } from '@/lib/i18n';
import { useSkin } from '@/lib/client-assets/client-assets-context';
import {
  getIconStyle,
  getSkinStyle,
  getStyleName,
  getTextSkin,
  getThingStyle,
  resolveEffectiveProperties,
  textAlignToFlex,
  type SkinContext,
} from '@/lib/client-assets/otui-css';
import { applyStates, intrinsicStates } from '@/lib/client-assets/widget-state';
import { getMockProperties } from '@/lib/client-assets/mock-data';
import { computeLayout, type LayoutMap } from '@/lib/client-assets/layout';
import { expandChildren, isSynthetic } from '@/lib/client-assets/style-children';

/** Preview behaviours the user can toggle from the modal toolbar. */
interface PreviewOptions {
  /** React to the mouse the way the client does ($hover, $pressed, toggles). */
  interactive: boolean;
  /** Fill runtime-populated widgets with stand-in data. */
  mock: boolean;
}

const DEFAULT_OPTIONS: PreviewOptions = { interactive: true, mock: true };

/** Native classes whose content is clipped to the widget box by the client. */
const CLIPPING_BASES = new Set(['UIScrollArea', 'UIScrollPanel', 'UITextEdit', 'UIGameMap']);

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
  props: Record<string, string> = widget.properties
): React.CSSProperties {
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
  widgetMap = new Map(),
  skin,
  layout,
  ancestorStyles = new Set<string>(),
  depth = 0,
  options = DEFAULT_OPTIONS,
}: { 
  widget: OTUIWidget; 
  onTooltipShow: (id: string, text: string) => void; 
  onTooltipHide: () => void; 
  isRootWidget?: boolean;
  siblings?: OTUIWidget[];
  widgetIndex?: number;
  widgetMap?: Map<string, OTUIWidget>;
  skin: SkinContext;
  layout?: LayoutMap;
  ancestorStyles?: ReadonlySet<string>;
  depth?: number;
  options?: PreviewOptions;
}) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [toggled, setToggled] = useState(false);

  const skinned = skin.registry !== null;
  const resolved = skin.registry?.resolve(getStyleName(widget)) ?? null;
  const nativeBase = resolved?.nativeBase ?? widget.type;

  // Inherit everything the OTClient stylesheets declare for this widget's
  // style, then top it up with preview data for whatever Lua fills in.
  const inherited = resolveEffectiveProperties(widget, skin.registry);
  const baseProps = options.mock
    ? { ...getMockProperties(widget, inherited, skin.registry, widgetIndex, skin.bindings), ...inherited }
    : inherited;

  // `$hover`, `$pressed`, `$on`, ... exactly as the client re-skins the widget.
  const activeStates = intrinsicStates(baseProps);
  if (options.interactive) {
    if (hovered) activeStates.add('hover');
    if (pressed) activeStates.add('pressed');
    if (toggled) {
      activeStates.add('on');
      activeStates.add('checked');
    }
  }
  const props = applyStates(widget, baseProps, skin.registry, activeStates);

  if (props.visible === 'false') return null;

  // With client assets connected, geometry comes from the resolved anchor
  // layout instead of the CSS approximation.
  const box = layout?.get(widget.id);
  const moduleRoot = isRootWidget && props.__moduleRoot === 'true';
  const style: React.CSSProperties = box
    ? {
        position: moduleRoot || !isRootWidget ? 'absolute' : 'relative',
        boxSizing: 'border-box',
        left: moduleRoot || !isRootWidget ? box.left : undefined,
        top: moduleRoot || !isRootWidget ? box.top : undefined,
        width: box.width,
        height: box.height,
        zIndex: moduleRoot ? Number(props.__moduleLayer) + 1 : undefined,
      }
    : getClientStyle(widget, isRootWidget, siblings, widgetIndex, widgetMap, props);
  const skinStyle = skinned ? getSkinStyle(props, skin) : {};
  const iconStyle = skinned ? getIconStyle(props, skin) : null;
  const thingStyle = getThingStyle(props, skin);
  // Styles such as MiniWindow declare their own sub-tree (header, buttons, ...).
  const styleName = getStyleName(widget);
  const repeatedStyle = isSynthetic(widget) && ancestorStyles.has(styleName);
  const children = repeatedStyle || depth >= 64 ? widget.children : expandChildren(widget, skin.registry, options.mock);
  const childAncestorStyles = new Set(ancestorStyles);
  childAncestorStyles.add(styleName);
  const textSkin = getTextSkin(props, skin);
  const text = props.text?.replace(/^tr\(['"](.+)['"]\)$/, '$1').replace(/"/g, '').replace(/\\n/g, '\n') || '';
  const tooltip = props.tooltip?.replace(/"/g, '');

  // When real client assets are loaded the caption is drawn on top of the
  // widget's own skin, exactly like OTClient does. Widgets whose caption comes
  // from Lua stay empty rather than showing their class name.
  const skinnedCaption = () => {
    if (!text) return null;
    const { justifyContent, alignItems } = textAlignToFlex(textSkin.align);
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent,
          alignItems,
          transform: `translate(${textSkin.offsetX}px, ${textSkin.offsetY}px)`,
          whiteSpace: props['text-wrap'] === 'true' ? 'pre-wrap' : 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          pointerEvents: 'none',
        }}
      >
        {text}
      </div>
    );
  };

  const typeRenderers: Record<string, () => React.ReactNode> = {
    UILabel: () =>
      skinned ? (
        skinnedCaption()
      ) : (
        <span style={{ fontSize: 12, whiteSpace: style.whiteSpace || 'nowrap', lineHeight: '1.4' }}>{text}</span>
      ),
    UIButton: () =>
      skinned ? (
        skinnedCaption()
      ) : (
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
        {text}
      </div>
    ),
    UITextEdit: () =>
      skinned ? (
        skinnedCaption()
      ) : (
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
      const min = Number(props.minimum ?? 0);
      const max = Number(props.maximum ?? 100);
      const raw = Number(props.value ?? props.percent);
      const pct = Number.isFinite(raw) && max > min ? ((raw - min) / (max - min)) * 100 : 50;
      const clamped = Math.max(0, Math.min(100, pct));
      return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${clamped}%`, background: props['background-color'] ?? '#4a9' }} />
        </div>
      );
    },
    UIImage: () =>
      skinned ? null : (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a', border: '1px solid #333', fontSize: 10, color: '#666' }}>
        {props['image-source']?.replace(/"/g, '') || 'Image'}
      </div>
    ),
    UIPanel: () => null,
    // Only the placeholder renderer draws window chrome: with client assets the
    // MiniWindow style provides its own header, buttons and contents panel.
    UIMiniWindow: () =>
      skinned ? (
        skinnedCaption()
      ) : (
      <>
        <div style={{ width: '100%', height: 24, background: '#2a2a2a', borderBottom: '1px solid #444', display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 12, fontWeight: 600 }}>
          {text || 'Window'}
          <div style={{ marginLeft: 'auto', width: 14, height: 14, background: '#555', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, cursor: 'pointer' }}>✕</div>
        </div>
      </>
    ),
  };

  const renderContent = typeRenderers[widget.type] ?? (skinned ? skinnedCaption : undefined);

  // Without client assets, fall back to the flat placeholder palette.
  const placeholderBackground = skinned
    ? undefined
    : widget.type === 'UIPanel'
      ? '#222'
      : widget.type === 'UIWidget'
        ? '#181818'
        : undefined;

  const phantom = props.phantom === 'true';
  const disabled = activeStates.has('disabled');
  const clickable =
    options.interactive &&
    !phantom &&
    !disabled &&
    (nativeBase === 'UIButton' ||
      props.cursor === 'pointer' ||
      Object.keys(props).some((key) => key.startsWith('@on')));
  // CheckBox/TabButton style widgets latch; plain buttons only flash while held.
  const togglable =
    clickable && Object.keys(resolved?.states ?? {}).some((selector) => /\$(on|checked)\b/.test(selector));

  const clipsContent =
    isRootWidget || CLIPPING_BASES.has(nativeBase) || props.clipping === 'true' || props['layout.type'] !== undefined;

  return (
    <div
      style={{ 
        ...style, 
        ...skinStyle,
        backgroundColor: skinStyle.backgroundColor ?? style.backgroundColor ?? placeholderBackground,
        borderStyle: skinStyle.borderStyle ?? (style.borderWidth ? 'solid' : undefined),
        overflow: clipsContent ? 'hidden' : style.overflow,
        cursor: clickable ? 'pointer' : undefined,
        pointerEvents: phantom ? 'none' : undefined,
        // The client cross-fades opacity/colour changes between states.
        transition: 'opacity 90ms linear, color 90ms linear',
      }}
      onMouseEnter={() => {
        if (options.interactive) setHovered(true);
        if (tooltip) onTooltipShow(widget.id, tooltip);
      }}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
        onTooltipHide();
      }}
      onMouseDown={() => clickable && setPressed(true)}
      onMouseUp={() => {
        if (!clickable) return;
        setPressed(false);
        if (togglable) setToggled((value) => !value);
      }}
    >
      {renderContent?.()}
      {thingStyle && <div style={thingStyle} />}
      {iconStyle && <div style={iconStyle} />}
      {children.map((c, idx) => (
        <ClientWidget 
          key={c.id} 
          widget={c} 
          onTooltipShow={onTooltipShow} 
          onTooltipHide={onTooltipHide}
          siblings={children}
          widgetIndex={idx}
          widgetMap={widgetMap}
          skin={skin}
          layout={layout}
          ancestorStyles={childAncestorStyles}
          depth={depth + 1}
          options={options}
        />
      ))}
    </div>
  );
}

interface ClientPreviewProps {
  onClose: () => void;
}

/** Fallback size for root widgets that do not declare one, matching the editor canvas. */
const DEFAULT_VIEWPORT = { width: 800, height: 600 };

export function ClientPreviewModal({ onClose }: ClientPreviewProps) {
  const { state } = useEditor();
  const skin = useSkin();
  const [tooltipState, setTooltipState] = useState<{ widgetId: string; text: string; x: number; y: number } | null>(null);
  const [options, setOptions] = useState<PreviewOptions>(DEFAULT_OPTIONS);

  // Check if we have a virtual root (multiple root widgets)
  const isVirtualRoot = state.rootWidgets.length === 1 && state.rootWidgets[0].id === '__virtual_root__';
  const documentRoots = isVirtualRoot ? state.rootWidgets[0].children : state.rootWidgets;
  const moduleRoots = documentRoots.filter((widget) => widget.properties.__moduleRoot === 'true');
  const widgetsToRender = moduleRoots.length > 0 ? moduleRoots : documentRoots;
  const isModuleStack = widgetsToRender.some((widget) => widget.properties.__moduleRoot === 'true');

  // Build widget map for anchor resolution
  const widgetMap = useMemo(() => buildWidgetMap(state.rootWidgets), [state.rootWidgets]);

  // Real anchor geometry, only available when client assets are connected.
  const layout = useMemo(
    () =>
      skin.registry
        ? computeLayout(widgetsToRender, DEFAULT_VIEWPORT, skin.registry, {
            mock: options.mock,
            bindings: skin.bindings,
          })
        : undefined,
    [widgetsToRender, skin.registry, skin.bindings, options.mock],
  );

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
          <div className="flex items-center gap-4 mb-2">
            <div className="text-[10px] text-[#666] font-mono">{t('clientPreview.title')}</div>
            <label className="flex items-center gap-1 text-[10px] text-[#888] font-mono cursor-pointer">
              <input
                type="checkbox"
                checked={options.interactive}
                onChange={(e) => setOptions((current) => ({ ...current, interactive: e.target.checked }))}
              />
              {t('clientPreview.interactive')}
            </label>
            <label className="flex items-center gap-1 text-[10px] text-[#888] font-mono cursor-pointer">
              <input
                type="checkbox"
                checked={options.mock}
                onChange={(e) => setOptions((current) => ({ ...current, mock: e.target.checked }))}
              />
              {t('clientPreview.mockData')}
            </label>
          </div>

          {/* Preview viewport: renders all root widgets */}
          <div
            className={isModuleStack ? 'relative bg-[#0c0f12] border border-[#222] overflow-hidden' : 'space-y-4'}
            style={isModuleStack ? DEFAULT_VIEWPORT : undefined}
          >
            {widgetsToRender.map((w, idx) => {
              const box = layout?.get(w.id);
              const width = box?.width ?? (w.properties.size ? Number(w.properties.size.split(' ')[0]) || 600 : 600);
              const height = box?.height ?? (w.properties.size ? Number(w.properties.size.split(' ')[1]) || 400 : 400);
              
              const widget = (
                <ClientWidget
                  widget={w}
                  onTooltipShow={handleTooltipShow}
                  onTooltipHide={handleTooltipHide}
                  isRootWidget={true}
                  siblings={widgetsToRender}
                  widgetIndex={idx}
                  widgetMap={widgetMap}
                  skin={skin}
                  layout={layout}
                  options={options}
                />
              );

              if (isModuleStack) return <div key={w.id}>{widget}</div>;

              return (
                <div
                  key={w.id}
                  className="relative bg-[#0c0f12] border border-[#222]"
                  style={{
                    width,
                    height,
                    overflow: 'hidden',
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
                    {widget}
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
