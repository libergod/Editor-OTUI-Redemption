# AGENTS.md

Guidance for AI coding agents (GitHub Copilot, and similar) working in the **Editor-OTUI-Redemption** repository — a browser-based visual editor for OTUI interfaces used by OTClient Redemption (OTCR).

## Project purpose (read this first)

This is a **React + TypeScript + Vite** single-page app. It has no backend and no build-time coupling to the sibling `otclient/` C++ project in this workspace. Its job is to let developers author, validate, and preview `.otui` files (and eventually full OTClient modules) **without running the actual OTClient binary**. Do not add a dependency on compiling or running OTClient to accomplish editor features — the whole point is independence from the native client.

Full documentation: [docs/README.md](./docs/README.md) · [Architecture](./docs/ARCHITECTURE.md) · [OTUI Format Reference](./docs/OTUI_FORMAT.md) · [Contributing](./docs/CONTRIBUTING.md) · [Roadmap](./docs/ROADMAP.md)

## Mandatory invariants

1. **OTUI syntax fidelity.** The parser/serializer (`src/lib/otui-parser.ts`) and validator (`src/lib/otui-validator.ts`) must stay aligned with the OTClient Redemption standard documented in [OTCR-COMPLIANCE.md](./OTCR-COMPLIANCE.md) and [src/lib/otui-standard.ts](./src/lib/otui-standard.ts). Never invent OTUI syntax that OTCR wouldn't accept, and never mix in HTML/CSS semantics.
2. **`UIProgressBar` never uses `percent`.** Always `value`/`minimum`/`maximum`. This is validated and auto-fixed — don't remove or weaken that check.
3. **Single source of truth for widget data.** All editor state flows through `EditorState.rootWidgets` (`src/lib/editor-context.tsx`) as a tree of `OTUIWidget` (`src/lib/otui-types.ts`). Don't introduce a second parallel widget representation.
4. **Virtual root handling.** The `__virtual_root__` wrapper (used when a file has multiple root widgets) must never be serialized to `.otui` output and must never be shown as a real widget in the canvas/hierarchy tree. Any change to `parseOTUI`/`serializeOTUI` or to `EditorCanvas`/`HierarchyTree` must preserve this.
5. **Undo/redo integrity.** Any user-facing tree mutation must be paired with a `pushHistory(label)` call (see `editor-context.tsx`). Don't push history on every intermediate drag/keystroke tick — batch into one entry per logical action (on blur/mouseup), matching existing patterns.
6. **Two renderers stay separate.** `EditorCanvas.tsx` (editable) and `ClientPreview.tsx` (read-only preview) intentionally have separate style-computation logic (`getWidgetDisplayStyle` vs `getClientStyle`). Do not merge them into a single renderer — see [docs/CLIENT_PREVIEW.md](./docs/CLIENT_PREVIEW.md) for why, and update both when adding a new visual property if both need it.
7. **No new state-management or UI-kit dependencies** without explicit user approval. The stack is intentionally: React Context + `useReducer`, Tailwind CSS, shadcn/ui + Radix UI.

## Before making changes

- Read [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) to understand data flow (parse → tree → canvas/preview → serialize → validate).
- If touching `src/lib/otui-parser.ts`, `otui-validator.ts`, or `otui-types.ts`, check the root `.otui` fixture files (`example.otui`, `otcr-format*.otui`, `test-*.otui`) and `src/test/` for existing expectations.

## Verification checklist for any code change

Run, in order, and fix failures before considering a task done:

```bash
npm run lint
npm run test
npm run build
```

If you changed parsing/serialization/validation logic, add or update a Vitest case in `src/test/` reproducing the scenario — don't rely solely on manual testing.

## Where things live (see docs/CONTRIBUTING.md for the full table)

- Widget types & schema: `src/lib/otui-types.ts`
- Parser/serializer: `src/lib/otui-parser.ts`
- Validator/auto-fix: `src/lib/otui-validator.ts`
- OTCR standard reference data: `src/lib/otui-standard.ts`
- Editor state: `src/lib/editor-context.tsx`
- Canvas/hierarchy/properties/toolbar UI: `src/components/editor/*`
- Editor UI strings (not exported OTUI text): `src/lib/i18n.ts`

## Style & scope discipline

- TypeScript strict mode is on — fix types, don't cast to `any`.
- Match existing Tailwind utility-class conventions and dark-theme styling; don't introduce new CSS files.
- Keep PRs/edits scoped to what was asked. Don't refactor unrelated files, don't add speculative abstractions for one-off logic.
- Don't create new markdown documentation files unless the user asks — update the existing `docs/` files instead.
