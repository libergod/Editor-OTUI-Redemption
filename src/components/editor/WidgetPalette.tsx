// Widget Palette - Left panel with draggable widget types

import { WIDGET_TYPES, WidgetTypeInfo, createWidget } from '@/lib/otui-types';
import { useEditor } from '@/lib/editor-context';
import { t } from '@/lib/i18n';

function createHealthPanelTemplate() {
  // root panel
  const root = createWidget('StatusPanel', 'UIPanel', null);
  root.properties.size = '320 90';
  root.properties.padding = '6';
  root.properties['background-color'] = '#111';

  const avatar = createWidget('Avatar', 'UIImage', root.id);
  avatar.properties.size = '64 64';
  avatar.properties['image-source'] = '"avatar.png"';
  avatar.properties.x = '6';
  avatar.properties.y = '12';

  const level = createWidget('Level', 'UILabel', root.id);
  level.properties.text = '"Lv 1"';
  level.properties.x = '76';
  level.properties.y = '8';

  const hp = createWidget('HPBar', 'UIProgressBar', root.id);
  hp.properties.size = '220 12';
  hp.properties.x = '76';
  hp.properties.y = '28';
  hp.properties['background-color'] = '#2a1a1a';

  const mp = createWidget('MPBar', 'UIProgressBar', root.id);
  mp.properties.size = '220 12';
  mp.properties.x = '76';
  mp.properties.y = '44';
  mp.properties['background-color'] = '#1a2a3a';

  const xp = createWidget('XPBar', 'UIProgressBar', root.id);
  xp.properties.size = '220 8';
  xp.properties.x = '76';
  xp.properties.y = '60';

  root.children = [avatar, level, hp, mp, xp];
  avatar.parentId = root.id; level.parentId = root.id; hp.parentId = root.id; mp.parentId = root.id; xp.parentId = root.id;
  return [root];
}

function createInventoryTemplate() {
  const root = createWidget('Inventory', 'UIPanel', null);
  root.properties.size = '360 240';
  root.properties.padding = '8';
  root.properties['background-color'] = '#0f0f0f';

  const grid = createWidget('EquipGrid', 'UIHorizontalLayout', root.id);
  grid.properties['layout.cell-size'] = '48 48';
  grid.properties.size = '100% 100%';

  // create 16 item slots
  const slots: any[] = [];
  for (let i = 0; i < 16; i++) {
    const s = createWidget('ItemSlot_' + i, 'UIItem', grid.id);
    s.properties.size = '48 48';
    slots.push(s);
  }
  grid.children = slots;
  slots.forEach(s => s.parentId = grid.id);

  root.children = [grid];
  grid.parentId = root.id;
  return [root];
}

function createActionBarTemplate() {
  const root = createWidget('ActionBar', 'UIPanel', null);
  root.properties.size = '240 48';
  root.properties['layout.type'] = 'horizontal';
  root.properties['layout.spacing'] = '6';
  root.properties.padding = '6';

  const buttons: any[] = [];
  for (let i = 0; i < 8; i++) {
    const b = createWidget('ActBtn_' + i, 'UIButton', root.id);
    b.properties.size = '28 28';
    b.properties.text = '""';
    buttons.push(b);
  }
  root.children = buttons;
  buttons.forEach(b => b.parentId = root.id);
  return [root];
}

function createChatTemplate() {
  const root = createWidget('ChatWindow', 'UIPanel', null);
  root.properties.size = '300 180';
  root.properties.padding = '6';
  const history = createWidget('ChatHistory', 'UIScrollArea', root.id);
  history.properties.size = '100% 140';
  const input = createWidget('ChatInput', 'UITextEdit', root.id);
  input.properties.size = '100% 30';
  root.children = [history, input];
  history.parentId = root.id; input.parentId = root.id;
  return [root];
}

function createMiniMapTemplate() {
  const root = createWidget('MiniMap', 'UIPanel', null);
  root.properties.size = '140 140';
  const map = createWidget('MapImage', 'UIImage', root.id);
  map.properties.size = '128 128';
  root.children = [map]; map.parentId = root.id;
  return [root];
}

function createCharSheetTemplate() {
  const root = createWidget('CharSheet', 'UIPanel', null);
  root.properties.size = '360 320';
  const name = createWidget('CharName', 'UILabel', root.id); name.properties.text = '"Name"'; name.properties.x = '8'; name.properties.y = '8';
  const stats = createWidget('Stats', 'UIPanel', root.id); stats.properties.size = '140 200'; stats.properties.x = '8'; stats.properties.y = '36';
  root.children = [name, stats]; name.parentId = root.id; stats.parentId = root.id;
  return [root];
}

function createQuestLogTemplate() {
  const root = createWidget('QuestLog', 'UIPanel', null);
  root.properties.size = '300 220';
  const list = createWidget('QuestList', 'UIScrollArea', root.id); list.properties.size = '100% 100%';
  root.children = [list]; list.parentId = root.id;
  return [root];
}

function createTooltipSampleTemplate() {
  const root = createWidget('TooltipSample', 'UIPanel', null);
  root.properties.size = '160 80';
  const tlabel = createWidget('Tip', 'UILabel', root.id); tlabel.properties.text = '"Tooltip example"'; tlabel.properties.x = '8'; tlabel.properties.y = '8';
  root.children = [tlabel]; tlabel.parentId = root.id;
  return [root];
}

function createSkillBarTemplate() {
  const root = createWidget('SkillBar', 'UIPanel', null);
  root.properties.size = '320 40'; root.properties.padding = '6'; root.properties['layout.type'] = 'horizontal'; root.properties['layout.spacing'] = '6';
  const skills: any[] = [];
  for (let i = 0; i < 10; i++) { const s = createWidget('Skill_' + i, 'UIButton', root.id); s.properties.size = '24 24'; skills.push(s); }
  root.children = skills; skills.forEach(s => s.parentId = root.id);
  return [root];
}

function createPartyFrameTemplate() {
  const root = createWidget('PartyFrame', 'UIPanel', null);
  root.properties.size = '200 120';
  const members: any[] = [];
  for (let i = 0; i < 4; i++) { const m = createWidget('Member_' + i, 'UIPanel', root.id); m.properties.size = '180 28'; members.push(m); }
  root.children = members; members.forEach(m => m.parentId = root.id);
  return [root];
}

const categories = [
  { key: 'container', label: 'Containers' },
  { key: 'display', label: 'Display' },
  { key: 'input', label: 'Input' },
  { key: 'layout', label: 'Layout' },
  { key: 'game', label: 'Game' },
] as const;

export function WidgetPalette() {
  const { dispatch, pushHistory } = useEditor();
  const handleDragStart = (e: React.DragEvent, info: WidgetTypeInfo) => {
    e.dataTransfer.setData('widget-type', JSON.stringify({ type: info.type, label: info.label }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const applyTemplate = (widgets: any[], mode: 'replace' | 'append' = 'replace') => {
    if (mode === 'replace') dispatch({ type: 'SET_WIDGETS', widgets });
    else {
      for (const w of widgets) dispatch({ type: 'ADD_WIDGET', widget: w, parentId: null });
    }
    pushHistory('Apply template');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="editor-panel-header">{t('widgets')}</div>
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 px-1">{t('templates')}</div>
          <div className="grid grid-cols-1 gap-1">
            <div className="flex items-center gap-2">
              <select id="template-select" className="flex-1 bg-secondary/80 border border-border rounded px-1 py-0.5 text-[11px]">
                <option value="health">{t('health_panel')}</option>
                <option value="inventory">{t('inventory')}</option>
                <option value="action">{t('action_bar')}</option>
                <option value="chat">{t('chat_window')}</option>
                <option value="minimap">{t('mini_map')}</option>
                <option value="char">{t('char_sheet')}</option>
                <option value="quest">{t('quest_log')}</option>
                <option value="tooltip">{t('tooltip_sample')}</option>
                <option value="skill">{t('skill_bar')}</option>
                <option value="party">{t('party_frame')}</option>
              </select>
              <button onClick={() => {
                const sel = (document.getElementById('template-select') as HTMLSelectElement).value;
                const map: Record<string, () => any[]> = {
                  health: createHealthPanelTemplate,
                  inventory: createInventoryTemplate,
                  action: createActionBarTemplate,
                  chat: createChatTemplate,
                  minimap: createMiniMapTemplate,
                  char: createCharSheetTemplate,
                  quest: createQuestLogTemplate,
                  tooltip: createTooltipSampleTemplate,
                  skill: createSkillBarTemplate,
                  party: createPartyFrameTemplate,
                };
                const fn = map[sel] || createHealthPanelTemplate;
                applyTemplate(fn(), 'append');
              }} className="px-2 py-1 text-[11px] bg-secondary/60 rounded">{t('insert')}</button>
              <button onClick={() => {
                const sel = (document.getElementById('template-select') as HTMLSelectElement).value;
                const map: Record<string, () => any[]> = {
                  health: createHealthPanelTemplate,
                  inventory: createInventoryTemplate,
                  action: createActionBarTemplate,
                  chat: createChatTemplate,
                  minimap: createMiniMapTemplate,
                  char: createCharSheetTemplate,
                  quest: createQuestLogTemplate,
                  tooltip: createTooltipSampleTemplate,
                  skill: createSkillBarTemplate,
                  party: createPartyFrameTemplate,
                };
                const fn = map[sel] || createHealthPanelTemplate;
                applyTemplate(fn(), 'replace');
              }} className="px-2 py-1 text-[11px] bg-secondary/70 rounded">{t('replace')}</button>
            </div>
          </div>
        </div>
        {categories.map(cat => {
          const items = WIDGET_TYPES.filter(w => w.category === cat.key);
          if (items.length === 0) return null;
          return (
            <div key={cat.key}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 px-1">
                {cat.label}
              </div>
              <div className="grid grid-cols-2 gap-1">
                {items.map(info => (
                  <div
                    key={info.type}
                    draggable
                    onDragStart={e => handleDragStart(e, info)}
                    title={info.description ? t(info.description) : ''}
                    className="flex flex-col items-center gap-0.5 p-2 rounded-sm cursor-grab relative
                      bg-secondary/50 hover:bg-secondary border border-transparent hover:border-primary/30
                      text-xs text-secondary-foreground transition-colors select-none active:cursor-grabbing"
                  >
                    <span className="absolute top-0.5 left-0.5 text-[8px] bg-secondary/70 rounded px-0.5 text-muted-foreground">!</span>
                    <span className="text-base leading-none">{info.icon}</span>
                    <span className="text-[10px] truncate w-full text-center">{info.label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
