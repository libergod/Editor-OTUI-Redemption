import { describe, it, expect } from 'vitest';
import { parseStylesheet } from '@/lib/client-assets/style-parser';
import { StyleRegistry } from '@/lib/client-assets/style-registry';
import { parseOTUI, serializeOTUI } from '@/lib/otui-parser';
import { resolveEffectiveProperties, resolveStateProperties } from '@/lib/client-assets/otui-css';
import { toAssetPath, assetPathCandidates, parseRect, normalizeColor } from '@/lib/client-assets/images';

const STYLESHEET = `
Button < UIButton
  font: cipsoftFont
  color: #dfdfdfff
  size: 43 20
  image-source: /images/ui/buttons
  image-clip: 0 0 43 20
  image-border: 1

  $pressed:
    image-clip: 0 20 43 20
    text-offset: 1 1

Panel < UIWidget
  phantom: true

FlatPanel < Panel
  image-source: /images/ui/panel_flat
  image-border: 1
`;

describe('stylesheet parser', () => {
  it('reads declarations, properties and state blocks', () => {
    const nodes = parseStylesheet(STYLESHEET, 'test.otui');
    const button = nodes.find(n => n.name === 'Button');

    expect(button?.base).toBe('UIButton');
    expect(button?.properties['image-clip']).toBe('0 0 43 20');
    expect(button?.states['$pressed']['text-offset']).toBe('1 1');
  });

  it('ignores comments', () => {
    const nodes = parseStylesheet('Foo < UIWidget\n  // a comment\n  color: #fff -- trailing', 'c.otui');
    expect(nodes[0].properties).toEqual({ color: '#fff' });
  });
});

describe('style registry', () => {
  const registry = new StyleRegistry();
  registry.addStylesheet(STYLESHEET, 'test.otui');

  it('resolves the inheritance chain down to the native base', () => {
    const flat = registry.resolve('FlatPanel');
    expect(flat?.chain).toEqual(['FlatPanel', 'Panel', 'UIWidget']);
    expect(flat?.nativeBase).toBe('UIWidget');
    expect(flat?.properties.phantom).toBe('true');
    expect(flat?.properties['image-source']).toBe('/images/ui/panel_flat');
  });

  it('returns null for unknown styles', () => {
    expect(registry.resolve('DoesNotExist')).toBeNull();
  });

  it('does not replace a style with a bare loadUI runtime root', () => {
    const runtimeRegistry = new StyleRegistry();
    runtimeRegistry.addStylesheet('MainWindow < UIWidget\n  anchors.centerIn: parent', 'global.otui');
    runtimeRegistry.addStylesheet('MainWindow\n  size: 688 520', 'module.otui');

    expect(runtimeRegistry.resolve('MainWindow')?.properties['anchors.centerIn']).toBe('parent');
    expect(runtimeRegistry.resolve('MainWindow')?.properties.size).toBeUndefined();
  });

  it('merges inherited properties under widget-local ones', () => {
    const widget = { type: 'UIWidget' as const, properties: { __style: 'Button', color: '#ff0000' } };
    const props = resolveEffectiveProperties(widget, registry);

    expect(props.color).toBe('#ff0000');
    expect(props['image-source']).toBe('/images/ui/buttons');
    expect(props.size).toBe('43 20');
  });

  it('exposes pseudo-state overrides', () => {
    const widget = { type: 'UIWidget' as const, properties: { __style: 'Button' } };
    expect(resolveStateProperties(widget, registry, '$pressed')['image-clip']).toBe('0 20 43 20');
  });
});

describe('unknown style bases round-trip', () => {
  it('keeps a non-native base through parse and serialize', () => {
    const widgets = parseOTUI('MyPanel < FlatPanel\n  size: 100 50');
    expect(widgets[0].properties.__style).toBe('FlatPanel');

    const output = serializeOTUI(widgets);
    expect(output).toContain('MyPanel < FlatPanel');
    expect(output).not.toContain('__style');
  });
});

describe('image path and value helpers', () => {
  it('maps OTUI image sources onto the client data folder', () => {
    expect(toAssetPath('/images/ui/buttons')).toBe('data/images/ui/buttons');
    expect(toAssetPath('"images/ui/panel_flat.png"')).toBe('data/images/ui/panel_flat.png');
    expect(assetPathCandidates('/images/ui/buttons')[0]).toBe('data/images/ui/buttons.png');
    expect(assetPathCandidates('/images/ui/buttons.png')).toEqual(['data/images/ui/buttons.png']);
  });

  it('parses rects and colors', () => {
    expect(parseRect('0 20 43 20')).toEqual({ x: 0, y: 20, width: 43, height: 20 });
    expect(parseRect('bad')).toBeNull();
    expect(normalizeColor('#dfdfdfff')).toBe('#dfdfdfff');
    expect(normalizeColor('alpha')).toBe('transparent');
  });
});
