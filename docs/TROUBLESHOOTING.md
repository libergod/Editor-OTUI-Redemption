# Troubleshooting / FAQ

## Import errors

| Error | Cause / Fix |
|---|---|
| `OTUI text is empty` | The file/pasted text had no content. |
| `No valid widget declarations found...` | No line matched any of the 4 supported declaration formats. Use `Name < UIPanel`, `UIPanel Name`, `Name: UIPanel`, or a bare recognized short name. |
| `No root-level widgets found...` | Every widget line was more indented than expected, or indentation was inconsistent (mixing tabs/spaces). Ensure at least one widget starts at column 0. |
| `Could not parse line "..."` (console warning) | A line wasn't a recognized widget declaration or property. Check for typos, stray characters, or unsupported syntax. |
| Unknown widget type accepted anyway | The parser is lenient — unknown `WidgetType` strings are still stored, but the validator/palette won't recognize them. Check spelling against the table in [OTUI_FORMAT.md](./OTUI_FORMAT.md). |

## "Quality score" / auto-fix modal keeps appearing

This is expected — `validateOTUI()` runs on every import. It's not an error, just a suggestion. Click **Keep Original** if you don't want the fixes applied, or **Accept Fix** to apply them. Common auto-fixed issues: missing `id`, missing `size` on interactive widgets, `border-color` without `border-width`, `UIProgressBar` using `percent`.

## Dragging issues

- **Widget won't move**: click it first to select it, then drag.
- **Jumps to an unexpected position**: movement is constrained by the parent container's bounds and snapped to a 4px grid — this is intentional.
- **Multi-select not working**: hold `Ctrl`/`Cmd` or `Shift` while clicking additional widgets. Only widgets sharing the same parent move together as a group.

## Visual glitches

- **Alignment guides stuck on screen**: release the mouse button; guides clear on `mouseup`. If they persist, check the browser console for an uncaught error interrupting the `mouseup` handler.
- **Viewport boundary not visible**: toggle it via the ON/OFF button in the canvas header.
- **Properties panel not updating after a change**: check the browser console — a thrown error in a property control (e.g. malformed size string) can stop a re-render.

## Client Preview doesn't look like real OTClient

This is expected to some degree — see [Client Preview & Runtime Parity](./CLIENT_PREVIEW.md) for the documented gaps (sibling anchor approximation, no real asset loading, no Lua execution, bitmap font differences).

## Build/dev server issues

- **Port 5173 already in use**: stop the other process or pass `--port` to `vite` via `npm run dev -- --port 5174`.
- **Type errors after pulling latest**: run `npm install` again — dependency or type definition updates may be required.
- **ESLint failures blocking commit**: run `npm run lint` locally and fix reported issues before pushing; CI (if configured) will otherwise fail the same way.

## Where to ask for help

Open a GitHub Issue with: steps to reproduce, the `.otui` snippet involved (if applicable), browser/OS, and console error output.
