# Roadmap

This roadmap tracks the direction of the OTUI Designer Suite, particularly the long-term goal stated in the project brief:

> Manage OTClient **modules** from inside this editor — creating visual editions without having to run `otclient.exe` / `otclient_dx_x64.exe` / `otclient_gl_x64.exe`.

## Current state (implemented)

- Single-file `.otui` visual editing: drag/drop, anchors, layouts, pseudo-states, events, i18n directive.
- Import/export/validate/auto-fix pipeline for individual `.otui` files.
- Static, non-interactive "Client Preview" that approximates OTClient rendering (see [Client Preview & Runtime Parity](./CLIENT_PREVIEW.md) for known gaps).
- In-app OTCR standard reference.

## Near-term goals

- **Improve Client Preview fidelity**: resolve sibling/named anchors geometrically instead of via margin approximation (see [CLIENT_PREVIEW.md](./CLIENT_PREVIEW.md)).
- **Multi-file project support**: allow opening a folder of related `.otui` files (e.g. a real OTClient module directory) rather than one file at a time.
- **Asset resolution**: let users point the editor at a local `otclient/data/images` (or similar) directory so `image-source` paths render real sprites instead of placeholders in preview.

## Mid-term goals (module management)

- **Module manifest awareness**: parse a module's `.otmod` file (name, description, dependencies, scripts, `@onLoad`/`@onUnload`) and represent it as a first-class entity in the editor, not just loose `.otui` files.
- **Multi-widget-file composition**: support a module that spans multiple `.otui` files referencing each other (as real OTClient modules often do), and preview them together.
- **Read-only Lua awareness**: display (not execute) the `.lua` controller script associated with a module alongside its `.otui`, so developers can see how widgets are expected to be manipulated at runtime (ids referenced from Lua, dynamic widget creation calls, etc.).
- **Round-trip fidelity tests**: expand the Vitest suite so every parser/serializer change is checked against the `*.otui` fixtures for lossless round-tripping.

## Long-term / exploratory goals

- **Live sync with a running OTClient instance** (optional, advanced): investigate whether OTClient can expose a debug/dev bridge (e.g. via a Lua socket or file-watch reload) so edits in this tool could hot-reload into a real running client for final validation — while keeping the primary workflow fully client-independent.
- **Lua sandboxed execution for event preview**: run `@onClick` and similar handlers in a constrained JS-Lua interpreter purely for visual preview purposes (still not real OTClient runtime behavior).
- **Theme/style presets** and a **reusable component library** (composite widgets savable/reusable across projects).

## Non-goals

- This tool is **not** a replacement for OTClient itself — it does not implement the game networking, protocol, or full Lua runtime. Its job is authoring and previewing UI, not running gameplay.
- Do not couple the editor's core parser/serializer to a specific OTClient fork's private extensions unless they are part of the documented OTCR standard (see [../OTCR-COMPLIANCE.md](../OTCR-COMPLIANCE.md)).

## How to propose changes to this roadmap

Open an issue or PR updating this file with your proposal, plus rationale and, if applicable, links to the relevant OTClient source (in the sibling `otclient` workspace folder) that the feature must stay compatible with.
