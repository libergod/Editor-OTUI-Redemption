# Client Preview & Runtime Parity

The **Client Preview** modal (`src/components/editor/ClientPreview.tsx`) exists to approximate how a `.otui` interface will actually look when loaded by real OTClient (`otclient.exe`, `otclient_dx_x64.exe`, `otclient_gl_x64.exe`), without leaving the browser. This document explains how it works today and what's known to differ from the real client, so contributors (human or AI) know where to focus effort.

## How it works today

- `buildWidgetMap()` indexes every widget in the tree by both `id` and `name`, used to resolve anchors that reference other widgets (`anchors.top: HeaderLabel.bottom`).
- `getClientStyle()` converts OTUI properties into CSS:
  - Explicit `size`/`width`/`height` map directly to CSS width/height.
  - Widgets without explicit size get type-based defaults (e.g. `UILabel`/`UIButton` auto-size via `display: inline-block`, `UITextEdit` defaults to `height: 20`).
  - `anchors.fill: parent` → 100% width/height.
  - `anchors.centerIn`, `anchors.horizontalCenter`, `anchors.verticalCenter` → absolute positioning + CSS `transform: translate(...)`.
  - Edge anchors (`anchors.left/right/top/bottom`) → absolute positioning with `left/right/top/bottom` + the corresponding `margin-*`.
  - Sibling anchors (`prev.*`, `WidgetName.*`) are **approximated** using margins only — they do not currently perform true relative-position calculation against the target widget's resolved box.
- Widgets with `visible: 'false'` are not rendered at all.

## Known gaps vs. real OTClient (contribution targets)

These are the current approximations/limitations. If you are extending preview fidelity, this is the checklist:

1. **Sibling/named anchors are not geometrically resolved.** `anchors.top: OtherWidget.bottom` should compute the real bottom Y of `OtherWidget` and offset from it; currently it only applies the margin as if it were a parent anchor. This is the single biggest fidelity gap.
2. **No OTClient-specific font rendering.** OTClient uses bitmap fonts (e.g. `verdana-11px-rounded`); the browser preview uses whatever the `font` CSS value resolves to (usually a system font fallback).
3. **No real image/sprite loading.** `image-source` values reference OTClient asset paths (`.png` in `data/images/...`) that don't exist in the browser's asset pipeline; `UIImage`/`UIItem`/`UICreature` render as placeholders.
4. **No Lua execution.** `@onClick`, `@onOpen`, etc. are stored as text but never executed — the preview is visual/static only, not interactive/behavioral.
5. **Layout engine differences.** OTClient's `verticalBox`/`horizontalBox`/`grid` layout has specific fit-children and flow semantics; the CSS flexbox/grid approximation in both `EditorCanvas` and `ClientPreview` is close but not guaranteed pixel-identical, especially with `fit-children: true`.
6. **No module/`.lua` script context.** A real OTClient module often combines multiple `.otui` files plus a controlling `.lua` script (`init.lua`, `x.lua`) that dynamically creates/positions widgets at runtime. The preview only ever renders the static tree currently loaded in the editor. See [Roadmap](./ROADMAP.md) for planned module-aware preview work.

## Design guidance for improving parity

- Keep `EditorCanvas.tsx` (editable, editor-ergonomics-first) and `ClientPreview.tsx` (read-only, fidelity-first) **separate** — do not try to unify them into one renderer. They intentionally diverge in priorities (selection UI vs. accurate layout).
- When resolving anchors more accurately, prefer a two-pass layout: first compute intrinsic sizes bottom-up, then resolve anchor positions top-down using the `widgetMap`. Avoid trying to do this in a single CSS pass — that's why sibling anchors are currently approximate.
- Any change here should be validated against the `test-*.otui` fixtures and, ideally, a screenshot/manual comparison against a real OTClient module if available.
