import { describe, it, expect } from 'vitest';
import { StyleRegistry } from '@/lib/client-assets/style-registry';
import { expandChildren, isSynthetic } from '@/lib/client-assets/style-children';
import { resolveEffectiveProperties } from '@/lib/client-assets/otui-css';
import { parseOTUI } from '@/lib/otui-parser';
import { parseAppearances } from '@/lib/client-assets/things';

const STYLESHEET = [
  'Button < UIButton',
  '  color: #dfdfdf',
  '  image-source: /images/ui/buttons',
  '',
  'Panel < UIWidget',
  '  phantom: true',
  '',
  'MiniWindow < UIMiniWindow',
  '  image-source: /images/ui/miniwindow_body',
  '',
  '  UIWidget',
  '    id: miniwindowHeader',
  '    height: 15',
  '',
  '  UIWidget',
  '    id: contentsPanel',
  '    anchors.fill: parent',
  '',
  'HealthWindow < MiniWindow',
  '  height: 100',
].join('\n');

const registry = new StyleRegistry();
registry.addStylesheet(STYLESHEET, 'test.otui');

describe('native class styling', () => {
  it('gives native UI classes the matching stylesheet definition', () => {
    const widget = { type: 'UIButton' as const, properties: {} };
    const props = resolveEffectiveProperties(widget, registry);
    expect(props['image-source']).toBe('/images/ui/buttons');
    expect(props.color).toBe('#dfdfdf');
  });

  it('keeps the requested name on the aliased result', () => {
    expect(registry.resolve('UIButton')?.name).toBe('UIButton');
  });

  it('returns null when no alias exists either', () => {
    expect(registry.resolve('TotallyUnknown')).toBeNull();
  });
});

describe('style-declared children', () => {
  const widgetWithStyle = (style: string, children: ReturnType<typeof parseOTUI> = []) => ({
    id: 'w1',
    name: 'Win',
    type: 'UIWidget' as const,
    properties: { __style: style },
    children,
    parentId: null,
  });

  it('instantiates the children a style declares', () => {
    const children = expandChildren(widgetWithStyle('MiniWindow'), registry);
    expect(children.map(c => c.properties.id)).toEqual(['miniwindowHeader', 'contentsPanel']);
    expect(children.every(isSynthetic)).toBe(true);
  });

  it('preserves native types for instantiated style children', () => {
    const typedRegistry = new StyleRegistry();
    typedRegistry.addStylesheet('Container < UIWidget\n  Label\n    text: Nested', 'typed.otui');
    const children = expandChildren(widgetWithStyle('Container'), typedRegistry);
    expect(children[0].type).toBe('UILabel');
  });

  it('inherits style children through the inheritance chain', () => {
    const children = expandChildren(widgetWithStyle('HealthWindow'), registry);
    expect(children.map(c => c.properties.id)).toEqual(['miniwindowHeader', 'contentsPanel']);
  });

  it('merges authored children onto style children with the same id', () => {
    const authored = parseOTUI(['Contents < UIWidget', '  id: contentsPanel', '  padding: 4'].join('\n'));
    const children = expandChildren(widgetWithStyle('MiniWindow', authored), registry);

    expect(children).toHaveLength(2);
    const contents = children[1];
    expect(contents.properties.padding).toBe('4');
    expect(contents.properties['anchors.fill']).toBe('parent');
    expect(isSynthetic(contents)).toBe(false);
  });

  it('appends authored children that do not match a style child', () => {
    const authored = parseOTUI(['Extra < UIWidget', '  id: extra'].join('\n'));
    const children = expandChildren(widgetWithStyle('MiniWindow', authored), registry);
    expect(children.map(c => c.properties.id)).toEqual(['miniwindowHeader', 'contentsPanel', 'extra']);
  });

  it('leaves widgets without a style untouched', () => {
    const plain = widgetWithStyle('Panel');
    expect(expandChildren(plain, registry)).toBe(plain.children);
  });
});

describe('appearances protobuf', () => {
  it('reads object ids and their sprite ids', () => {
    // Appearances{ object: Appearance{ id: 3031, frame_group: { sprite_info: { sprite_id: [7, 8] } } } }
    const spriteInfo = [0x2a, 0x02, 0x07, 0x08]; // field 5, packed varints 7, 8
    const frameGroup = [0x1a, spriteInfo.length, ...spriteInfo]; // field 3 (sprite_info)
    const appearance = [0x08, 0xd7, 0x17, 0x12, frameGroup.length, ...frameGroup]; // id=3031, field 2
    const bytes = new Uint8Array([0x0a, appearance.length, ...appearance]); // field 1 (object)

    const { objects } = parseAppearances(bytes);
    expect(objects.get(3031)).toEqual([7, 8]);
  });
});
