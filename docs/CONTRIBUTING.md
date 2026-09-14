# Contributing

Thanks for improving the OTUI Designer Suite! This guide covers conventions specific to this repo. For AI coding agents, also read the root [AGENTS.md](../AGENTS.md).

## Workflow

1. Fork/branch: `git checkout -b feature/my-feature`
2. Install deps: `npm install` (or `bun install`)
3. Run the dev server: `npm run dev`
4. Make changes, and **run the checks below** before committing.
5. Commit with clear messages (e.g. `Add: grid layout preview support`, `Fix: percent auto-fix for UISlider`).
6. Push and open a Pull Request describing what changed and why.

## Before opening a PR

```bash
npm run lint
npm run test
npm run build
```

All three should pass. If you touched the parser, serializer, or validator (`src/lib/otui-*.ts`), add/update a Vitest case in `src/test/` and, if useful, one of the root `.otui` fixture files.

## Code style

- TypeScript strict mode is enabled — don't add `any` casts to work around type errors; fix the underlying type instead.
- Follow existing patterns: components under `src/components/editor` are function components using the `useEditor()` hook for state access; avoid introducing a second state management approach.
- Prefer Tailwind utility classes consistent with the existing dark-theme editor styling (see `src/index.css`, `src/App.css`) over new CSS files.
- Use `shadcn/ui` primitives from `src/components/ui` for new UI controls rather than hand-rolled equivalents, when a suitable primitive exists.

## Where things live (quick map)

| I want to... | Look at / edit |
|---|---|
| Add a new widget type | `src/lib/otui-types.ts` (`WidgetType`, `WIDGET_TYPES`), then `EditorCanvas.tsx` + `ClientPreview.tsx` render cases |
| Change parsing rules | `src/lib/otui-parser.ts` (`parseOTUI`) |
| Change export/serialization | `src/lib/otui-parser.ts` (`serializeOTUI`) |
| Add a validation rule | `src/lib/otui-validator.ts` (`validateOTUI`, `autoFixOTUI`) |
| Change undo/redo or selection behavior | `src/lib/editor-context.tsx` |
| Add/adjust a property editor control | `src/components/editor/PropertiesPanel.tsx`, schema in `otui-types.ts` (`PROPERTY_GROUPS`) |
| Add a UI string | `src/lib/i18n.ts` (add to both `en` and `pt` maps) |
| Update the OTCR standard reference content | `src/lib/otui-standard.ts` |

See [Architecture](./ARCHITECTURE.md) for the full data-flow explanation before making structural changes.

## Testing conventions

- Tests live in `src/test/`, run via Vitest + jsdom + Testing Library (`vitest.config.ts`, `src/test/setup.ts`).
- Favor testing `parseOTUI`/`serializeOTUI`/`validateOTUI` as pure functions over the widget tree — they don't require rendering.
- When fixing a parser bug, add the offending snippet as a fixture/test case so it can't regress silently.

## Scope discipline

- Don't restructure unrelated files in the same PR as a feature/bugfix.
- Don't add new state-management libraries, CSS frameworks, or UI kits without discussion — the project intentionally keeps a small, consistent stack (React Context + Tailwind + shadcn/ui).
- Keep the OTUI parser/serializer strictly aligned with the OTCR standard in [../OTCR-COMPLIANCE.md](../OTCR-COMPLIANCE.md) — don't invent syntax that real OTClient Redemption wouldn't accept.
