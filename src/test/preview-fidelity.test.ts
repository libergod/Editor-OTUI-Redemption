import { describe, expect, it } from 'vitest';
import { StyleRegistry } from '@/lib/client-assets/style-registry';
import { applyStates, intrinsicStates, restingStates } from '@/lib/client-assets/widget-state';
import { extractLuaBindings } from '@/lib/client-assets/lua-bindings';
import { getLuaLayoutOverrides, getMockChildren, getMockProperties } from '@/lib/client-assets/mock-data';
import type { OTUIWidget } from '@/lib/otui-types';

const STYLESHEET = `
Button < UIButton
  image-clip: 0 0 43 20
  color: #dfdfdf

  $hover !disabled:
    image-clip: 0 23 43 20

  $pressed:
    image-clip: 0 20 43 20

  $disabled:
    color: #dfdfdf88

CheckBox < UIButton
  $checked:
    image-clip: 0 40 43 20

MinimizeButton < UIButton
  image-clip: 0 0 14 14

  $on:
    image-clip: 14 0 14 14

  $on hover:
    image-clip: 14 14 14 14

ScrollBar < UIScrollBar
  width: 12

  $!on:
    width: 0
`;

function registryOf(text = STYLESHEET): StyleRegistry {
  const registry = new StyleRegistry();
  registry.addStylesheet(text, 'test.otui');
  return registry;
}

function widgetOf(properties: Record<string, string>, type: OTUIWidget['type'] = 'UIButton'): OTUIWidget {
  return { id: 'w', name: 'w', type, properties, children: [], parentId: null };
}

describe('interaction states', () => {
  it('derives permanent states from properties', () => {
    expect([...intrinsicStates({ enabled: 'false' })]).toEqual(['disabled']);
    expect(intrinsicStates({ checked: 'true' }).has('checked')).toBe(true);
    expect(intrinsicStates({}).size).toBe(0);
  });

  it('applies a matching state block from the style chain', () => {
    const widget = widgetOf({ __style: 'Button' });
    const props = applyStates(widget, { __style: 'Button' }, registryOf(), new Set(['pressed']));
    expect(props['image-clip']).toBe('0 20 43 20');
  });

  it('honours negated selector tokens', () => {
    const widget = widgetOf({ __style: 'Button' });
    const base = { __style: 'Button', 'image-clip': '0 0 43 20' };
    const registry = registryOf();

    expect(applyStates(widget, base, registry, new Set(['hover']))['image-clip']).toBe('0 23 43 20');
    expect(applyStates(widget, base, registry, new Set(['hover', 'disabled']))['image-clip']).toBe('0 0 43 20');
  });

  it('applies widget-local $state blocks parsed into "$state.key" props', () => {
    const widget = widgetOf({ '$pressed.image-clip': '0 67 204 67' }, 'UIWidget');
    const props = applyStates(widget, widget.properties, null, new Set(['pressed']));
    expect(props['image-clip']).toBe('0 67 204 67');
  });

  it('leaves properties untouched when no state is active', () => {
    const widget = widgetOf({ __style: 'Button' });
    const base = { __style: 'Button', 'image-clip': '0 0 43 20' };
    expect(applyStates(widget, base, registryOf(), new Set())['image-clip']).toBe('0 0 43 20');
  });

  it('treats bare tokens in a compound selector as required flags', () => {
    const widget = widgetOf({ __style: 'MinimizeButton' });
    const base = { __style: 'MinimizeButton', 'image-clip': '0 0 14 14' };
    const registry = registryOf();

    expect(applyStates(widget, base, registry, new Set(['on']))['image-clip']).toBe('14 0 14 14');
    expect(applyStates(widget, base, registry, new Set(['on', 'hover']))['image-clip']).toBe('14 14 14 14');
    // `hover` alone must not satisfy `$on hover`.
    expect(applyStates(widget, base, registry, new Set(['hover']))['image-clip']).toBe('0 0 14 14');
  });

  it('applies negative-only selectors at rest', () => {
    const widget = widgetOf({ __style: 'ScrollBar' }, 'UIScrollBar');
    const base = { __style: 'ScrollBar', width: '12' };
    const registry = registryOf();

    expect(applyStates(widget, base, registry, new Set()).width).toBe('0');
    expect(applyStates(widget, base, registry, new Set(['on'])).width).toBe('12');
  });

  it('marks scrollbars as scrollable only when preview data is on', () => {
    expect(restingStates({ orientation: 'vertical' }, true).has('on')).toBe(true);
    expect(restingStates({ orientation: 'vertical' }, false).has('on')).toBe(false);
  });

  it('lets a widget-local block beat a more specific inherited one', () => {
    // The miniwindow buttons declare plain $hover/$pressed while the aliased
    // Button style contributes "$hover !disabled" — the widget must still win.
    const widget = widgetOf({
      __style: 'Button',
      'image-clip': '28 0 14 14',
      '$hover.image-clip': '28 14 14 14',
      '$pressed.image-clip': '28 28 14 14',
    });

    const registry = registryOf();
    expect(applyStates(widget, widget.properties, registry, new Set(['hover']))['image-clip']).toBe('28 14 14 14');
    expect(applyStates(widget, widget.properties, registry, new Set(['hover', 'pressed']))['image-clip']).toBe(
      '28 28 14 14',
    );
  });
});

describe('lua bindings', () => {
  it('reads values assigned through a local child lookup', () => {
    const bindings = extractLuaBindings([
      {
        text: `
          local titleWidget = preyTracker:getChildById('miniwindowTitle')
          titleWidget:setText('Prey')
          local iconWidget = preyTracker:getChildById('miniwindowIcon')
          iconWidget:setImageSource('/images/game/prey/icon-prey-widget')
        `,
      },
    ]);

    expect(bindings.get('miniwindowTitle')?.text).toBe('Prey');
    expect(bindings.get('miniwindowIcon')?.['image-source']).toBe('/images/game/prey/icon-prey-widget');
  });

  it('reads chained and field-access assignments', () => {
    const bindings = extractLuaBindings([
      {
        text: `
          window:recursiveGetChildById('newWindowButton'):setVisible(false)
          prey.title:setText(tr('Select your prey creature'))
        `,
      },
    ]);

    expect(bindings.get('newWindowButton')?.visible).toBe('false');
    expect(bindings.get('title')?.text).toBe('Select your prey creature');
  });

  it('understands the wider setter vocabulary', () => {
    const bindings = extractLuaBindings([
      {
        text: `
          bar:getChildById('hpBar'):setPercent(42)
          lockButton:setOn(true)
          slot.icon:setImageClip('0 20 34 34')
        `,
      },
    ]);

    expect(bindings.get('hpBar')?.percent).toBe('42');
    expect(bindings.get('icon')?.['image-clip']).toBe('0 20 34 34');
  });

  it('ignores values computed at runtime', () => {
    const bindings = extractLuaBindings([{ text: `label:setText(formatNumber(gold))` }]);
    expect(bindings.size).toBe(0);
  });

  it('follows widgets re-anchored by the script', () => {
    const bindings = extractLuaBindings([
      {
        text: `
          local lockButton = tracker:recursiveGetChildById('lockButton')
          local minimizeButton = tracker:recursiveGetChildById('minimizeButton')
          lockButton:breakAnchors()
          lockButton:addAnchor(AnchorTop, minimizeButton:getId(), AnchorTop)
          lockButton:addAnchor(AnchorRight, minimizeButton:getId(), AnchorLeft)
          lockButton:setMarginRight(7)
        `,
      },
    ]);

    const widget = widgetOf({ id: 'lockButton' });
    const authored = { id: 'lockButton', 'anchors.right': 'prev.left', 'margin-right': '2' };
    const resolved = getLuaLayoutOverrides(widget, authored, bindings);

    expect(resolved['anchors.right']).toBe('minimizeButton.left');
    expect(resolved['anchors.top']).toBe('minimizeButton.top');
    expect(resolved['margin-right']).toBe('7');
  });
});

describe('mock data', () => {
  it('prefers the value assigned by the module script', () => {
    const widget = widgetOf({ id: 'miniwindowTitle' }, 'UILabel');
    const bindings = new Map([['miniwindowTitle', { text: 'Prey' }]]);
    expect(getMockProperties(widget, widget.properties, null, 0, bindings).text).toBe('Prey');
  });

  it('never overrides an authored caption', () => {
    const widget = widgetOf({ id: 'gold', text: '"1"' }, 'UILabel');
    expect(getMockProperties(widget, widget.properties, null).text).toBeUndefined();
  });

  it('leaves chrome widgets unlabelled', () => {
    const widget = widgetOf({ id: 'miniwindowScrollBar' }, 'UILabel');
    expect(getMockProperties(widget, widget.properties, null).text).toBeUndefined();
  });

  it('fills an empty list with preview rows', () => {
    const registry = registryOf('TextList < UIScrollArea\n  layout: verticalBox\n');
    const widget = widgetOf({ __style: 'TextList' }, 'UIScrollArea');
    const rows = getMockChildren(widget, widget.properties, registry, []);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].properties.__mock).toBe('true');
  });

  it('keeps authored children', () => {
    const registry = registryOf('TextList < UIScrollArea\n  layout: verticalBox\n');
    const widget = widgetOf({ __style: 'TextList' }, 'UIScrollArea');
    const authored = [widgetOf({ text: '"real"' }, 'UILabel')];
    expect(getMockChildren(widget, widget.properties, registry, authored)).toBe(authored);
  });
});
