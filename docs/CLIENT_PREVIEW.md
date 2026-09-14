# Client Preview & Runtime Parity

The **Client Preview** modal (`src/components/editor/ClientPreview.tsx`) exists to approximate how a `.otui` interface will actually look when loaded by real OTClient (`otclient.exe`, `otclient_dx_x64.exe`, `otclient_gl_x64.exe`), without leaving the browser. This document explains how it works today and what's known to differ from the real client, so contributors (human or AI) know where to focus effort.

## Connecting a client folder

Fidelity depends on having the real client assets. `src/lib/client-assets/` connects the editor to a local OTClient installation and feeds both renderers:

| Module | Responsibility |
|---|---|
| `source.ts` | `ClientAssetSource` abstraction. `DevBridgeAssetSource` reads through the Vite middleware in `vite-otclient-plugin.ts`; `DirectoryAssetSource` uses the File System Access API on a user-picked folder. |
| `style-parser.ts` | Indentation parser for `data/styles/*.otui`, preserving names verbatim (unlike `src/lib/otui-parser.ts`, which normalizes into `WidgetType`). |
| `style-registry.ts` | Loads every stylesheet and resolves inheritance chains (`FlatPanel < Panel < UIWidget`). Native classes fall back to their same-named style, so a `UIButton` is skinned like `Button`. |
| `style-children.ts` | Instantiates the child widgets a style declares (MiniWindow's header, bevels, close/minimize buttons, contents panel) and merges authored children onto them by `id`. |
| `fonts.ts` | Parses `data/fonts/otfont/*.otfont` metrics and registers the shipped TTFs as web fonts. |
| `images.ts` | Resolves `image-source` to a real file, crops `image-clip`, applies the `image-color` multiply tint, and caches the result as a data URL. |
| `lzma.ts` | LZMA1 decoder plus CIP sprite-sheet header parsing, needed to read `data/things`. |
| `things.ts` | Indexes `data/things/<version>`: catalog of sprite sheets, `appearances.dat` (protobuf) id→sprite lookups, and on-demand sheet decompression/cropping. |
| `otui-css.ts` | **Shared** data layer: merges inherited style properties with widget-local ones and maps them to CSS (9-slice `border-image`, colors, fonts, text offsets, icons, game sprites). |
| `layout.ts` | Two-pass geometric anchor resolution. |
| `client-assets-context.tsx` | React provider owning the connection; `useSkin()` gives renderers the active registries. |

The dev bridge auto-connects to `../otclient` (or `OTCLIENT_PATH`). The toolbar's **Client assets** control shows status, toggles skinned rendering, and browses `modules/*` to open a module's `.otui` directly.

> Note: `otui-css.ts` is shared deliberately — it resolves *what a widget looks like*, not *how it is rendered*. `EditorCanvas` and `ClientPreview` still own their own layout and interaction logic and must stay separate.

## How it works today

- Widget properties are resolved through `resolveEffectiveProperties()`, so a widget declared `Foo < FlatPanel` inherits everything `FlatPanel` (and `Panel`, and `UIWidget`) declare. Non-native bases are preserved through parse/serialize via the internal `__style` key (and `__bare` for bare instantiations like `PhantomMiniWindow`).
- **Style-declared children are instantiated.** `MiniWindow` and friends declare a whole sub-tree in the stylesheet; `expandChildren()` materializes it and merges the module's own children onto it by `id`, exactly as OTClient does. These synthetic widgets are render-only — they never enter `EditorState.rootWidgets`, and the canvas marks them non-interactive.
- When a client folder is connected, geometry comes from `computeLayout()` in `layout.ts`:
  - Anchors are expanded (`fill`, `centerIn`) and each axis is resolved from its `left`/`right`/`horizontalCenter` (or `top`/`bottom`/`verticalCenter`) anchors plus margins.
  - Sibling anchors (`prev.*`, `next.*`, `WidgetName.*`, `id.*`) are resolved against the target's **real** computed box, over multiple passes so forward references converge.
  - Both-edge anchors derive width/height; a single edge plus `size` derives the other edge.
- `getSkinStyle()` paints the widget: `image-clip` regions are cropped to a canvas, `image-border` becomes a 9-slice `border-image`, and `image-color` is applied as a multiply tint.
- Supported visual tags: `image-source`, `image-clip`, `image-color`, `image-border[-side]`, `image-size`, `image-offset`, `image-repeated`, `image-fixed-ratio`, `image-auto-resize`, `icon-source`/`icon-clip`/`icon-color`/`icon-size`/`icon-offset`, `color`, `background-color`, `opacity`, `padding[-side]`, `border-width[-side]`, `border-color`, `font`, `text-offset`, `text-align`, `text-wrap`, and `item-id`/`outfit-id`.
- Without a client folder, the preview falls back to the original `getClientStyle()` CSS approximation and placeholder colors.
- Widgets with `visible: 'false'` are not rendered at all.

## Game sprites (`data/things`)

`UIItem`/`UICreature` draw real sprites when the client folder contains assets:

1. `catalog-content.json` maps sprite id ranges to `.bmp.lzma` sheets.
2. Each sheet is a 32-byte CIP header + an LZMA1 stream; `lzma.ts` decodes it to a 384×384 32bpp BMP.
3. The BMP is flipped to top-down RGBA with magenta keyed out, then the requested sprite is cropped by index.
4. `appearances.dat` is read with a minimal protobuf reader to map `item-id`/`outfit-id` to sprite ids.

Indexing runs in the background after the styles load, so the editor stays responsive; the toolbar shows the detected asset version.

## Known gaps vs. real OTClient (contribution targets)

These are the current approximations/limitations. If you are extending preview fidelity, this is the checklist:

1. **Bitmap font metrics are approximated.** `.otfont` files declare the line height, but glyph advance widths come from the texture. The preview substitutes the shipped TTF at the nominal px size, so text width is close but not exact.
2. **Sprites are static and single-layer.** Only the first sprite id of an appearance is drawn — no animation, direction, mount/addon layering or outfit recolouring.
3. **No Lua execution.** `@onClick`, `@onOpen`, etc. are stored as text but never executed — the preview is visual/static only, not interactive/behavioral. Values that a module's `.lua` sets at runtime (bar widths, labels) show their static `.otui` defaults.
4. **Layout engine differences.** OTClient's `verticalBox`/`horizontalBox`/`grid` layout has specific fit-children and flow semantics; `layout.ts` resolves anchors only, and the CSS flexbox/grid approximation is used for `layout:` blocks.
5. **Pseudo-states are resolved but not rendered.** `resolveStateProperties()` can return `$hover`/`$pressed` overrides, but neither renderer applies them yet.
6. **No module/`.lua` script context.** A real OTClient module often combines multiple `.otui` files plus a controlling `.lua` script that dynamically creates/positions widgets at runtime. The preview only renders the static tree currently loaded.

## Design guidance for improving parity

- Keep `EditorCanvas.tsx` (editable, editor-ergonomics-first) and `ClientPreview.tsx` (read-only, fidelity-first) **separate** — do not try to unify them into one renderer. Shared *data* belongs in `src/lib/client-assets/`, shared *rendering* does not.
- The editor must keep working with no client folder connected. Every skin/layout path needs a placeholder fallback.
- Any change here should be validated against the `test-*.otui` fixtures, the Vitest suites in `src/test/client-assets.test.ts` and `src/test/layout.test.ts`, and ideally a visual comparison against a real OTClient module.
