import { describe, expect, it } from 'vitest';
import {
  findLuaUIReferences,
  loadModuleBundle,
  materializeModule,
  parseModuleDescriptor,
} from '@/lib/client-assets/module-loader';
import type { AssetEntry, ClientAssetSource } from '@/lib/client-assets/source';
import { StyleRegistry } from '@/lib/client-assets/style-registry';

class MemorySource implements ClientAssetSource {
  readonly kind = 'dev-bridge' as const;
  readonly label = 'test';

  constructor(private readonly files: Record<string, string>) {}

  async readText(path: string) { return this.files[path] ?? null; }
  async readUrl() { return null; }
  async list(path: string): Promise<AssetEntry[]> {
    const prefix = `${path}/`;
    return Object.keys(this.files)
      .filter((file) => file.startsWith(prefix) && !file.slice(prefix.length).includes('/'))
      .map((file) => ({ name: file.slice(prefix.length), path: file, kind: 'file' }));
  }
  dispose() {}
}

describe('OTClient module loader', () => {
  it('parses scripts and dependencies from an otmod descriptor', () => {
    const descriptor = parseModuleDescriptor([
      'Module',
      '  name: game_prey',
      '  scripts: [ prey, helpers/util ]',
      '  dependencies:',
      '    - client_topmenu',
      '    - game_interface',
    ].join('\n'), 'modules/game_prey/prey.otmod');

    expect(descriptor.scripts).toEqual(['prey', 'helpers/util']);
    expect(descriptor.dependencies).toEqual(['client_topmenu', 'game_interface']);
  });

  it('discovers UI files and created styles from Lua', () => {
    const refs = findLuaUIReferences([
      "g_ui.importStyle('shared')",
      "window = g_ui.displayUI('prey')",
      "tracker = g_ui.createWidget('PreyTracker', modules.game_interface.getRightPanel())",
      "star = g_ui.createWidget('Star', gradePanel)",
    ].join('\n'), 'modules/game_prey');

    expect(refs.ui).toEqual([
      { path: 'modules/game_prey/shared.otui', instantiate: false },
      { path: 'modules/game_prey/prey.otui', instantiate: true },
    ]);
    expect(refs.createdStyles).toEqual(['PreyTracker']);
  });

  it('loads dependencies and materializes runtime roots instead of style declarations', async () => {
    const source = new MemorySource({
      'modules/client_topmenu/topmenu.otmod': 'Module\n  name: client_topmenu\n  scripts: [ topmenu ]',
      'modules/client_topmenu/topmenu.lua': "g_ui.importStyle('topmenu')",
      'modules/client_topmenu/topmenu.otui': 'TopButton < UIButton\n  size: 20 20',
      'modules/game_prey/prey.otmod': 'Module\n  name: game_prey\n  scripts: [ prey ]\n  dependencies: [ client_topmenu ]',
      'modules/game_prey/prey.lua': "g_ui.displayUI('prey')\ng_ui.createWidget('PreyTracker', modules.game_interface.getRightPanel())",
      'modules/game_prey/prey.otui': [
        'SlotPanel < UIWidget',
        '  size: 195 300',
        'MainWindow',
        '  id: preyWindow',
        '  size: 688 520',
        '  SlotPanel',
        '    id: slot1',
        'PreyTracker < UIWidget',
        '  size: 200 110',
      ].join('\n'),
    });
    const bundle = await loadModuleBundle(source, 'modules/game_prey/prey.otmod');
    const registry = new StyleRegistry();
    registry.addStylesheet('MainWindow < UIWindow\n  anchors.centerIn: parent', 'global-windows.otui');
    for (const uiFile of bundle.uiFiles) registry.addStylesheet(uiFile.text, uiFile.path);
    const widgets = materializeModule(bundle, registry);

    expect(bundle.modules.map((module) => module.name)).toEqual(['client_topmenu', 'game_prey']);
    expect(bundle.scripts.map((script) => script.path)).toEqual([
      'modules/client_topmenu/topmenu.lua',
      'modules/game_prey/prey.lua',
    ]);
    expect(bundle.uiFiles.find((file) => file.path.endsWith('prey.otui'))).toMatchObject({
      lineCount: 9,
      definitionCount: 3,
    });
    expect(widgets.map((widget) => widget.name)).toEqual(['preyWindow', 'PreyTracker']);
    expect(widgets[0].type).toBe('UIMiniWindow');
    expect(widgets.map((widget) => widget.properties.__moduleLayer)).toEqual(['0', '1']);
    expect(widgets[0].children[0].properties.__style).toBe('SlotPanel');
  });
});