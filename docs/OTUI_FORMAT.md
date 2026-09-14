# OTUI Format Reference

This document describes the OTUI syntax the editor's parser (`src/lib/otui-parser.ts`) accepts on import and the canonical syntax it produces on export. For the authoritative OTClient Redemption (OTCR) standard rules, see [../OTCR-COMPLIANCE.md](../OTCR-COMPLIANCE.md) and the in-app **OTUI Standard** reference (`src/lib/otui-standard.ts`).

## Widget declaration formats (all accepted on import)

```otui
# Format 1: Angle bracket (preferred / what the editor exports)
HealthBar < UIProgressBar
  size: 200 16

# Format 2: Type-first (Lua-style)
UIProgressBar HealthBar
  size = 200 16

# Format 3: Colon separator
HealthBar: UIProgressBar
  size: 200 16

# Format 4: Bare name that maps to a known short widget name
Panel
  size: 200 150
```

Short names (`Panel`, `Button`, `Label`, `Window`, ...) are resolved to full `UI*` types via `WIDGET_NAME_MAP` in `otui-parser.ts`.

## Property formats

Both separators are accepted: `key: value` and `key = value`.

```otui
text: "Hello"
text = "Hello"
```

Values in quotes (`"..."` or `'...'`) have the quotes stripped on import (`cleanValue`).

## Comments

```otui
-- Lua-style comment
// C-style comment
MyPanel < UIPanel  -- inline comment
```

## Anchors

```otui
MyLabel < UILabel
  anchors.left: parent.left
  anchors.top: parent.top
  margin-left: 10
  margin-top: 5
```

Supported anchor targets: `parent.left/right/top/bottom/fill/centerIn/leftTop/rightBottom/horizontalCenter/verticalCenter`, and sibling references like `prev.right` or `WidgetName.bottom`.

## Layout blocks

```otui
MyContainer < UIWidget
  layout:
    type: vertical      # vertical | horizontal | grid
    spacing: 5
    cell-size: 34 34    # grid only
    cell-spacing: 3     # grid only
    fit-children: true
```

Internally stored as flattened `layout.type`, `layout.spacing`, etc.

## Pseudo-states

```otui
MyButton < UIButton
  background-color: #3a5a7f
  $hover:
    background-color: #4a6a8f
  $pressed:
    background-color: #2a4a6f
  $disabled:
    opacity: 0.5
```

Recognized states: `$hover`, `$pressed`, `$disabled`, `$checked`, `$on`, `$!on`. Internally stored as `$hover.background-color`, etc.

## Event handlers

```otui
MyButton < UIButton
  @onClick: myFunction()

  @onClick: |
    function(self)
      print("Button clicked!")
    end
```

`@onClick`, `@onEscape`, `@onOpen`, `@onClose`, and similar `@`-prefixed keys are preserved verbatim, including multi-line inline Lua blocks (`|` continuation).

## Internationalization directive

```otui
MyLabel < UILabel
  !text: tr('greeting.hello')
```

On import, `!text:` or a `text:` value wrapped in `tr('...')` both set the internal `__i18n.text = 'true'` flag and store the raw string in `text`. On export, if that flag is set, the editor writes `!text: tr('...')`; otherwise it writes a plain quoted `text: "..."`.

## `UIProgressBar` — critical rule

**Never use `percent`.** Use `value`, `minimum`, `maximum` instead. The validator (`otui-validator.ts`) flags `percent` usage, and `autoFixOTUI` / the serializer will convert `percent` into `value: X / minimum: 0 / maximum: 100`.

```otui
# Correct
HealthBar < UIProgressBar
  value: 75
  minimum: 0
  maximum: 100

# Incorrect (deprecated, auto-fixed)
HealthBar < UIProgressBar
  percent: 75
```

## Valid widget types

| Category | Types |
|---|---|
| Containers | `UIWidget`, `UIPanel`, `UIMiniWindow`, `MiniWindow`, `MiniWindowContents`, `UIScrollArea`, `UIScrollBar`, `UIScrollPanel`, `UISeparator`, `UITabBar`, `UITab` |
| Text | `UILabel`, `Label`, `UITextEdit`, `TextEdit` |
| Buttons/Input | `UIButton`, `Button`, `UICheckBox`, `CheckBox`, `UIRadioGroup`, `UIRadioButton`, `UISlider`, `UIComboBox`, `UIDropDown` |
| Display | `UIImage`, `UIProgressBar`, `UIList`, `UIListItem` |
| Layout (legacy) | `UIHorizontalLayout`, `UIVerticalLayout` — prefer `layout:` blocks instead |
| Game | `UIItem`, `UICreature`, `UIGameMap` |

The full list with default properties lives in `WIDGET_TYPES` in [src/lib/otui-types.ts](../src/lib/otui-types.ts).

## Serialization ordering (what export produces)

The serializer writes properties in a canonical order to keep diffs clean: `id`, `size/width/height`, `minimum/maximum/value/percent`, `text`/`image-source`/`color`, `background-color`/`border-*`, `padding`/`opacity`, anchors (fill, centerIn, left/right/top/bottom, horizontal/verticalCenter), margins, then `x/y`. It also:
- Auto-generates an `id` from the widget name if missing.
- Adds `border-width: 1` if `border-color` is present without a width.
- Omits zero-value margins and `x`/`y` when anchors are present.
- Skips serializing the internal virtual root wrapper entirely (see [Architecture](./ARCHITECTURE.md#multi-root-handling)).

## Complete example

```otui
MainWindow < UIMiniWindow
  size: 400 300
  !text: tr('Main Window')
  @onEscape: hide()

  Panel < UIPanel
    anchors.fill: parent
    padding: 10
    background-color: #1a1a1a

    TitleLabel < UILabel
      !text: tr('Welcome')
      anchors.top: parent.top
      anchors.horizontalCenter: parent.horizontalCenter
      color: #ffffff

    HoverButton < UIButton
      size: 150 30
      !text: tr('Hover Me')
      anchors.top: TitleLabel.bottom
      margin-top: 10
      background-color: #3a5a7f
      $hover:
        background-color: #4a6a9f
      $pressed:
        background-color: #2a4a6f

    ActionButton < UIButton
      size: 120 30
      !text: tr('Click Me')
      anchors.bottom: parent.bottom
      @onClick: |
        function(self)
          print("Button clicked!")
        end
```

## Sample/test fixtures

The repo root contains sample `.otui` files useful for testing parser edge cases: [example.otui](../example.otui), [example-bad.otui](../example-bad.otui) (intentionally invalid, for validator testing), [multi-root.otui](../multi-root.otui) (virtual-root wrapping), [otcr-format1..4.otui](../otcr-format1.otui) (each declaration style), [otcr-complex.otui](../otcr-complex.otui), [test-otcr-standard.otui](../test-otcr-standard.otui), [test-i18n.otui](../test-i18n.otui), [test-formatting.otui](../test-formatting.otui), [test-new-features.otui](../test-new-features.otui). [test-parse.js](../test-parse.js) is a standalone script that exercises the parser against some of these.
