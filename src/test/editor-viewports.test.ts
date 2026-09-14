import { describe, expect, it } from 'vitest';
import { buildEditorViewports, EDITOR_VIEWPORT_PROPERTY } from '@/lib/editor-viewports';
import { createWidget } from '@/lib/otui-types';
import { serializeOTUI } from '@/lib/otui-parser';

describe('editor viewports', () => {
  it('gives separate roots separate editing viewports by default', () => {
    const first = createWidget('FirstWindow', 'UIMiniWindow');
    const second = createWidget('SecondWindow', 'UIMiniWindow');

    const viewports = buildEditorViewports([first, second], []);
    expect(viewports.map((viewport) => viewport.roots.map((root) => root.name))).toEqual([
      ['FirstWindow'],
      ['SecondWindow'],
    ]);
  });

  it('keeps an empty user-created viewport and accepts assigned roots', () => {
    const root = createWidget('ToolWindow', 'UIMiniWindow');
    root.properties[EDITOR_VIEWPORT_PROPERTY] = 'viewport:custom';

    const viewports = buildEditorViewports([root], [{ id: 'viewport:custom', name: 'Viewport 2' }]);
    expect(viewports).toHaveLength(1);
    expect(viewports[0]).toMatchObject({ id: 'viewport:custom', name: 'Viewport 2' });
    expect(viewports[0].roots).toEqual([root]);
    expect(serializeOTUI([root])).not.toContain(EDITOR_VIEWPORT_PROPERTY);
  });

  it('appends empty viewports after viewports derived from roots', () => {
    const root = createWidget('MainWindow', 'UIMiniWindow');
    const viewports = buildEditorViewports([root], [{ id: 'viewport:new', name: 'Viewport 2' }]);

    expect(viewports.map((viewport) => viewport.name)).toEqual(['MainWindow', 'Viewport 2']);
  });
});