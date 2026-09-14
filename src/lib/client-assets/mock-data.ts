// Preview mock data.
//
// Most of an OTClient window is empty until Lua fills it in: labels get their
// caption from the server, item slots get an id, lists get their rows. A raw
// .otui render therefore looks nothing like the running client.
//
// This module supplies plausible stand-in data so the preview shows the window
// the way a player sees it. Everything here is *preview only* — it never enters
// the edited document and authored properties always win.

import type { OTUIWidget, WidgetType } from '@/lib/otui-types';
import type { StyleRegistry } from './style-registry';
import type { LuaBindings } from './lua-bindings';
import { getStyleName } from './otui-css';

/** Identifier of a widget as used by Lua (`getChildById`), falling back to its name. */
function widgetKey(widget: Pick<OTUIWidget, 'name' | 'properties'>): string {
  return widget.properties.id ?? widget.name;
}

/** Ids that name chrome rather than content; humanizing them reads as noise. */
const CHROME_ID = /scroll|bar$|icon|panel|window|button|separator|bevel|border|header|holder|container|slot\d*$/i;

/** "timeLeftLabel" -> "Time Left". */
function humanize(id: string): string {
  if (CHROME_ID.test(id)) return '';
  const words = id
    .replace(/^(ui|lbl|txt)/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .split(/\s+/)
    .filter((word) => word.length > 0 && !/^(label|widget|text|value)$/i.test(word));
  if (words.length === 0) return '';
  return words.map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');
}

/**
 * Captions for ids that appear across the shipped modules. These are taken from
 * the module scripts themselves (game_prey, game_skills, game_healthinfo, ...)
 * so the preview reads like a real session instead of lorem ipsum.
 */
const MOCK_TEXT: Record<string, string> = {
  // Shared chrome
  gold: '73,543',
  goldLabel: '73,543',
  balance: '73,543',
  wildCards: '5',
  wildcards: '5',
  price: '200',
  timeLeft: '01:47',
  timeleft: '01:47',
  level: '128',
  experience: '4,552,318',
  capacity: '1,280',
  soul: '100',
  stamina: '39:00',
  health: '1,420 / 1,420',
  mana: '980 / 980',

  // game_prey
  description:
    'Select a new prey creature for the next 2 hours hunting time.',
  preyName: 'Dragon Lord',
  creatureName: 'Dragon Lord',
  bonusDescription: 'XP bonus (7/10)',
  bonusValue: '+30%',
  rerollPrice: '200',
  autoRerollLabel: 'Automatic Bonus Reroll',
  lockPreyLabel: 'Lock Prey',
  preyTimeLeft: '01:47',
};

/** Sprite stand-ins so item/creature slots are not empty rectangles. */
const MOCK_ITEM_IDS = [3031, 3035, 3043, 3577, 3492, 3264, 3079, 3061];
const MOCK_OUTFIT_ID = 128;

/** Rows for list widgets that Lua populates at runtime. */
const MOCK_ROWS = [
  'Dragon Lord',
  'Demon',
  'Hydra',
  'Serpent Spawn',
  'Rotworm',
  'Cyclops',
  'Giant Spider',
  'Frost Dragon',
  'Behemoth',
];

const LIST_STYLES = new Set(['TextList', 'VerticalList', 'HorizontalList', 'UIList']);

function isListLike(widget: Pick<OTUIWidget, 'type' | 'properties'>, registry: StyleRegistry | null): boolean {
  const styleName = getStyleName(widget);
  if (LIST_STYLES.has(styleName)) return true;
  const chain = registry?.resolve(styleName)?.chain ?? [];
  return chain.some((entry) => LIST_STYLES.has(entry));
}

/**
 * Extra properties for a widget in preview mode. Merge *under* the widget's own
 * properties: `{ ...getMockProperties(...), ...props }`.
 *
 * `bindings` carries what the module's Lua assigns to this id and always wins
 * over the generic stand-ins, since it is what the player actually sees.
 */
export function getMockProperties(
  widget: Pick<OTUIWidget, 'type' | 'name' | 'properties'>,
  props: Record<string, string>,
  registry: StyleRegistry | null,
  index = 0,
  bindings: LuaBindings | null = null,
): Record<string, string> {
  const mock: Record<string, string> = {};
  const key = widgetKey(widget);
  const nativeBase = registry?.resolve(getStyleName(widget))?.nativeBase ?? widget.type;

  const binding = bindings?.get(key);
  if (binding?.imageSource && props['image-source'] === undefined) {
    mock['image-source'] = binding.imageSource;
  }
  if (binding?.visible === false) mock.visible = 'false';

  const hasText = props.text !== undefined && props.text.trim() !== '';
  const captionable =
    nativeBase === 'UILabel' || nativeBase === 'UITextEdit' || widget.type === 'UILabel' || widget.type === 'UITextEdit';

  if (!hasText && (captionable || binding?.text !== undefined)) {
    const caption = binding?.text ?? MOCK_TEXT[key] ?? humanize(key);
    if (caption) mock.text = caption;
  }

  if (nativeBase === 'UIProgressBar' || widget.type === 'UIProgressBar') {
    if (props.value === undefined && props.percent === undefined) {
      mock.minimum ??= '0';
      mock.maximum ??= '100';
      mock.value = '68';
    }
  }

  if ((nativeBase === 'UIItem' || widget.type === 'UIItem') && props['item-id'] === undefined) {
    mock['item-id'] = String(MOCK_ITEM_IDS[index % MOCK_ITEM_IDS.length]);
  }

  if ((nativeBase === 'UICreature' || widget.type === 'UICreature') && props['outfit-id'] === undefined) {
    mock['outfit-id'] = String(MOCK_OUTFIT_ID);
  }

  return mock;
}

/**
 * Rows to show inside an empty list. Returned widgets are preview-only and
 * carry the `__mock` flag so nothing else mistakes them for authored content.
 */
export function getMockChildren(
  widget: OTUIWidget,
  props: Record<string, string>,
  registry: StyleRegistry | null,
  existing: OTUIWidget[],
): OTUIWidget[] {
  if (existing.length > 0 || !isListLike(widget, registry)) return existing;

  const rowStyle = registry?.has('ListLabel') ? 'ListLabel' : 'Label';
  return MOCK_ROWS.map((text, index) => ({
    id: `${widget.id}::mock.${index}`,
    name: rowStyle,
    type: 'UILabel' as WidgetType,
    parentId: widget.id,
    properties: {
      __style: rowStyle,
      __mock: 'true',
      text,
      height: '16',
      'text-align': 'left',
      'text-offset': '2 0',
      ...(index === 0 ? { 'background-color': '#ffffff22' } : {}),
    },
    children: [],
  }));
}
