# User Guide

## The editor layout

```
┌─────────────────────────────────────────────────────────────┐
│ Toolbar: Undo/Redo · Import · Export · OTUI Standard · Code  │
├───────────────┬───────────────────────────────┬─────────────┤
│ Widget         │                               │ Properties  │
│ Palette        │        Editor Canvas          │ Panel       │
│                │      (drag & drop, select,    │             │
├───────────────┤       move, resize, guides)    │             │
│ Hierarchy Tree │                               │             │
│               │                               │             │
└───────────────┴───────────────────────────────┴─────────────┘
```

- **Widget Palette** (top-left): drag widget types onto the canvas. Also has a template dropdown (health panel, inventory, action bar, chat window, mini map, character sheet, quest log, tooltip sample, skill bar, party frame) with **Insert** (append) / **Replace** (overwrite everything).
- **Hierarchy Tree** (bottom-left): shows parent/child structure. Drag rows onto each other to reparent. Hover a row for duplicate/delete buttons.
- **Editor Canvas** (center): the visual workspace. Click to select, drag to move, drag palette items to add.
- **Properties Panel** (right): edit every property of the selected widget, grouped as Identity / Layout / Anchors / Style / Events.

## Creating a new interface

1. **Add widgets** — drag from the palette onto the canvas or an existing container.
2. **Arrange** — click to select; drag to move. `Ctrl`/`Shift` + click for multi-select and group-move.
3. **Configure** — edit properties on the right (size, colors, text, anchors, etc.).
4. **Anchor** — hold `Ctrl` while releasing a drag near an edge (within 50px) to auto-generate `anchors.*` + `margin-*` properties instead of raw `x`/`y`.
5. **Preview** — click **Client Preview** in the toolbar to see an approximation of real OTClient rendering.
6. **Export** — toolbar **Export** downloads an `interface.otui` file.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Ctrl + R` | Toggle rulers |
| `Ctrl/Shift + Click` | Multi-select widgets |
| `Shift + Drag` | Lock movement to horizontal/vertical axis |
| `Ctrl + Drop` | Auto-anchor to nearest edges on drop |
| `Delete` | Remove selected widget |

## Alignment guides & rulers

While dragging, blue guide lines appear when the widget's edges/center align with siblings (same parent only) or the parent container's edges/center. Spacing labels show pixel distances. Press `Ctrl+R` or click the ruler icon to show Photoshop-style rulers; drag from a ruler bar to drop a persistent guide line.

## OTClient viewport boundary

The canvas shows a dashed boundary representing the OTClient game window (default 800×600). Adjust width/height in the canvas header to match your target resolution, and toggle it on/off. Keeping widgets inside this boundary improves real-client compatibility.

## Import / Export

- **Import**: toolbar → Import → pick a `.otui` file, or paste OTUI text directly. The parser supports multiple declaration styles (see [OTUI_FORMAT.md](./OTUI_FORMAT.md)).
- **Validation on import**: if the imported file has fixable issues (missing `id`, `percent` on progress bars, missing sizes, etc.), a **Code Comparison** modal shows the original vs. auto-fixed code side-by-side with a quality score; choose "Keep Original" or "Accept Fix".
- **Export**: serializes the current tree back to `.otui` text and triggers a file download. Click **Code** in the toolbar to view/copy the live generated OTUI text without exporting.

## OTUI Standard reference

Click the book icon (**OTUI Standard**) in the toolbar to open an in-app reference of the OTCR syntax: directives, event handlers, pseudo-states, layout system, and official widget types. Source data lives in [src/lib/otui-standard.ts](../src/lib/otui-standard.ts).

## Internationalization (i18n) of exported text

Widget `text` properties can be marked translatable. In the Properties panel, check the `tr()` box next to a text field — this sets internal metadata so the export serializes `!text: tr('your text')` instead of a plain literal, following the OTCR standard. `EditorToolbar`/`otui-parser.ts` also expose `validateI18nUsage()` warnings for UI widgets using non-translated text.

## Troubleshooting

See [Troubleshooting / FAQ](./TROUBLESHOOTING.md) for common import/parsing/rendering issues.
