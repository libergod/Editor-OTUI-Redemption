/**
 * OTClient Redemption (OTCR) - OTUI Official Standard
 * 
 * This file contains the official OTUI syntax rules and standards.
 * DO NOT invent syntax. DO NOT mix with HTML/CSS. DO NOT adapt to other frameworks.
 * 
 * Follow this standard STRICTLY.
 */

export const OTUI_STANDARD = {
  // Basic Syntax
  syntax: {
    basic: `WidgetName < ParentClass
  property: value
  property: value`,
    example: `MyPanel < UIPanel
  size: 200 100
  background-color: #2a2a2a
  padding: 6`,
  },

  // Inheritance
  inheritance: {
    description: 'Create reusable widget styles',
    example: `PrimaryButton < UIButton
  size: 100 30
  font: verdana-11px-rounded
  color: white
  background-color: #3a5a7f

-- Usage:
PrimaryButton
  text: tr('Click Me')`,
  },

  // Special Directives
  directives: {
    text: {
      description: 'Translatable text (recommended)',
      syntax: '!text: tr(\'string\')',
      example: `Label < UILabel
  !text: tr('Hello World')`,
    },
    events: {
      description: 'Event handlers',
      syntax: '@eventName: functionName() or inline function',
      examples: {
        simple: '@onClick: myFunction()',
        escape: '@onEscape: hide()',
        open: '@onOpen: onWindowOpen()',
        close: '@onClose: onWindowClose()',
        inline: `@onClick: |
  function(self)
    print("clicked")
  end`,
      },
    },
  },

  // Pseudo-states
  states: {
    description: 'Visual states for widgets',
    list: ['$hover', '$pressed', '$disabled', '$checked', '$on', '$!on'],
    example: `Button
  background-color: #333
  $hover:
    background-color: #555
  $pressed:
    background-color: #111
  $disabled:
    opacity: 0.5`,
  },

  // Anchors (positioning)
  anchors: {
    description: 'PREFERRED over x/y positioning',
    parent: {
      description: 'Anchor to parent edges',
      examples: [
        'anchors.left: parent.left',
        'anchors.right: parent.right',
        'anchors.top: parent.top',
        'anchors.bottom: parent.bottom',
        'anchors.fill: parent',
        'anchors.horizontalCenter: parent.horizontalCenter',
        'anchors.verticalCenter: parent.verticalCenter',
      ],
    },
    widgets: {
      description: 'Anchor to other widgets',
      examples: [
        'anchors.left: prev.right',
        'anchors.top: otherWidgetId.bottom',
        'anchors.left: Avatar.right',
      ],
    },
  },

  // Layout (automatic)
  layout: {
    description: 'Automatic layout system (modern approach)',
    types: ['verticalBox', 'horizontalBox', 'grid'],
    example: `Panel
  layout:
    type: verticalBox
    spacing: 5
    fit-children: true

-- Grid layout:
Panel
  layout:
    type: grid
    cell-size: 34 34
    cell-spacing: 3
    flow: true`,
  },

  // Common Properties
  properties: {
    layout: ['size', 'width', 'height', 'padding', 'margin', 'margin-left', 'margin-top', 'margin-right', 'margin-bottom'],
    position: ['x', 'y'], // AVOID! Use anchors instead
    visual: ['background-color', 'border-color', 'border-width', 'opacity', 'image-source', 'image-clip'],
    text: ['text', 'color', 'font', 'text-wrap', 'text-auto-resize', 'text-offset'],
    progressBar: ['value', 'minimum', 'maximum'], // NEVER use 'percent'
  },

  // Official Widgets
  widgets: {
    containers: ['UIWidget', 'UIPanel', 'UIMiniWindow', 'MiniWindow', 'MiniWindowContents', 'UIScrollArea', 'UIScrollBar', 'UIScrollPanel'],
    text: ['UILabel', 'Label', 'UITextEdit', 'TextEdit'],
    buttons: ['UIButton', 'Button', 'UICheckBox', 'CheckBox', 'UIRadioGroup'],
    images: ['UIImage', 'UIItem', 'UICreature'],
    bars: ['UIProgressBar'],
    game: ['UIGameMap'],
    base: ['UIWidget'],
  },

  // Rules & Best Practices
  rules: [
    'NEVER use percent in UIProgressBar - use value/minimum/maximum',
    'NEVER mix size with conflicting width/height',
    'AVOID x/y positioning - prefer anchors',
    'Indentation defines hierarchy',
    'DO NOT execute functions inside OTUI',
    'OTUI is NOT HTML',
    'String literals use quotes: "text"',
    'tr() does NOT use quotes: tr(\'text\')',
    'NEVER export virtual root',
  ],

  // Complete Example
  completeExample: `StatusPanel < UIPanel
  size: 320 120
  background-color: #111
  padding: 6
  border-color: #444
  border-width: 1

  Avatar < UIImage
    size: 64 64
    image-source: "avatar.png"
    anchors.left: parent.left
    anchors.top: parent.top
    margin-left: 6
    margin-top: 6

  LevelLabel < UILabel
    !text: tr('Lv 1')
    anchors.left: Avatar.left
    anchors.top: Avatar.bottom
    margin-top: 4
    color: #ffffff
    font: verdana-11px-antialised

  HPBar < UIProgressBar
    size: 220 12
    value: 50
    minimum: 0
    maximum: 100
    anchors.left: Avatar.right
    anchors.top: parent.top
    margin-left: 6
    margin-top: 6
    background-color: #2a2a2a
    border-color: #444
    border-width: 1`,
};

// Validation helpers
export function isValidOTUIProperty(key: string): boolean {
  const validPrefixes = ['anchors.', 'layout.', 'margin-', 'image-', 'text-', 'border-'];
  const validKeys = [
    'size', 'width', 'height', 'padding', 'margin',
    'x', 'y',
    'background-color', 'color', 'opacity',
    'text', '!text', 'font',
    'value', 'minimum', 'maximum',
    'visible', 'enabled', 'tooltip',
  ];
  
  if (validKeys.includes(key)) return true;
  return validPrefixes.some(prefix => key.startsWith(prefix));
}

export function isEventProperty(key: string): boolean {
  return key.startsWith('@');
}

export function isStateProperty(key: string): boolean {
  return key.startsWith('$');
}

export function isSpecialDirective(key: string): boolean {
  return key.startsWith('!');
}
