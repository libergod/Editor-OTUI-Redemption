import { describe, it, expect } from 'vitest';
import { parseOTUI } from '@/lib/otui-parser';
import { computeLayout } from '@/lib/client-assets/layout';
import { StyleRegistry } from '@/lib/client-assets/style-registry';

const registry = new StyleRegistry();
registry.addStylesheet('Label < UILabel\n  font: verdana-11px-antialised\n', 'test.otui');

const VIEWPORT = { width: 400, height: 200 };

function layoutOf(source: string) {
  const widgets = parseOTUI(source);
  const roots = widgets[0].id === '__virtual_root__' ? widgets[0].children : widgets;
  const boxes = computeLayout(roots, VIEWPORT, registry);
  const byName = new Map<string, string>();
  const walk = (list: typeof roots) => {
    for (const w of list) {
      byName.set(w.name, w.id);
      walk(w.children);
    }
  };
  walk(roots);
  return (name: string) => boxes.get(byName.get(name)!);
}

describe('anchor layout', () => {
  it('fills the parent', () => {
    const get = layoutOf(['Root < UIWidget', '  size: 300 100', '  Child < UIWidget', '    anchors.fill: parent'].join('\n'));
    expect(get('Child')).toEqual({ left: 0, top: 0, width: 300, height: 100 });
  });

  it('applies margins inward from each anchored edge', () => {
    const get = layoutOf(
      [
        'Root < UIWidget',
        '  size: 300 100',
        '  Child < UIWidget',
        '    anchors.left: parent.left',
        '    anchors.right: parent.right',
        '    anchors.top: parent.top',
        '    margin-left: 8',
        '    margin-right: 10',
        '    margin-top: 4',
        '    height: 20',
      ].join('\n'),
    );
    expect(get('Child')).toEqual({ left: 8, top: 4, width: 282, height: 20 });
  });

  it('resolves sibling anchors against the real resolved box', () => {
    const get = layoutOf(
      [
        'Root < UIWidget',
        '  size: 300 100',
        '  First < UIWidget',
        '    anchors.left: parent.left',
        '    anchors.top: parent.top',
        '    size: 40 20',
        '  Second < UIWidget',
        '    anchors.left: First.right',
        '    anchors.top: First.top',
        '    margin-left: 5',
        '    size: 30 20',
      ].join('\n'),
    );
    expect(get('Second')).toEqual({ left: 45, top: 0, width: 30, height: 20 });
  });

  it('resolves forward references regardless of declaration order', () => {
    const get = layoutOf(
      [
        'Root < UIWidget',
        '  size: 300 100',
        '  Leading < UIWidget',
        '    anchors.right: Trailing.left',
        '    anchors.top: parent.top',
        '    size: 20 10',
        '  Trailing < UIWidget',
        '    anchors.left: parent.left',
        '    anchors.top: parent.top',
        '    margin-left: 100',
        '    size: 20 10',
      ].join('\n'),
    );
    expect(get('Leading')?.left).toBe(80);
  });

  it('centers with centerIn', () => {
    const get = layoutOf(
      ['Root < UIWidget', '  size: 300 100', '  Child < UIWidget', '    anchors.centerIn: parent', '    size: 100 20'].join('\n'),
    );
    expect(get('Child')).toEqual({ left: 100, top: 40, width: 100, height: 20 });
  });

  it('uses prev to reference the previous sibling', () => {
    const get = layoutOf(
      [
        'Root < UIWidget',
        '  size: 300 100',
        '  A < UIWidget',
        '    anchors.top: parent.top',
        '    anchors.left: parent.left',
        '    size: 50 30',
        '  B < UIWidget',
        '    anchors.top: prev.bottom',
        '    anchors.left: parent.left',
        '    size: 50 30',
      ].join('\n'),
    );
    expect(get('B')?.top).toBe(30);
  });

  it('stacks verticalBox children inside parent padding', () => {
    const get = layoutOf([
      'Root < UIWidget',
      '  size: 100 100',
      '  padding: 5',
      '  layout:',
      '    type: verticalBox',
      '    spacing: 3',
      '  A < UIWidget',
      '    height: 10',
      '  B < UIWidget',
      '    height: 20',
      '    margin-top: 2',
    ].join('\n'));

    expect(get('A')).toEqual({ left: 5, top: 5, width: 90, height: 10 });
    expect(get('B')).toEqual({ left: 5, top: 20, width: 90, height: 20 });
  });

  it('places grid children in configured cells', () => {
    const get = layoutOf([
      'Root < UIWidget',
      '  size: 100 100',
      '  layout:',
      '    type: grid',
      '    cell-size: 10 12',
      '    cell-spacing: 2',
      '    num-columns: 2',
      '  A < UIWidget',
      '  B < UIWidget',
      '  C < UIWidget',
    ].join('\n'));

    expect(get('A')).toEqual({ left: 0, top: 0, width: 10, height: 12 });
    expect(get('B')).toEqual({ left: 12, top: 0, width: 10, height: 12 });
    expect(get('C')).toEqual({ left: 0, top: 14, width: 10, height: 12 });
  });

  it('stops recursive style-child expansion', () => {
    const recursiveRegistry = new StyleRegistry();
    recursiveRegistry.addStylesheet([
      'Recursive < UIWidget',
      '  size: 20 20',
      '  Recursive',
    ].join('\n'), 'recursive.otui');
    const roots = parseOTUI('Root < Recursive');

    expect(() => computeLayout(roots, VIEWPORT, recursiveRegistry)).not.toThrow();
  });

  it('centers a root using its inherited MainWindow anchor', () => {
    const windowRegistry = new StyleRegistry();
    windowRegistry.addStylesheet('MainWindow < UIWindow\n  anchors.centerIn: parent', 'windows.otui');
    const roots = parseOTUI('MainWindow\n  size: 300 100');
    const boxes = computeLayout(roots, VIEWPORT, windowRegistry);

    expect(boxes.get(roots[0].id)).toEqual({ left: 50, top: 50, width: 300, height: 100 });
  });
});
