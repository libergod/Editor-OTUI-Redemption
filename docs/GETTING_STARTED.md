# Getting Started

## Prerequisites

- **Node.js** 18+ (or [Bun](https://bun.sh), since the repo ships a `bun.lockb`)
- A modern browser (Chrome, Firefox, Edge, Safari)
- Git

## Install

```bash
git clone <YOUR_GIT_URL>
cd Editor-OTUI-Redemption

# with npm
npm install

# or with bun
bun install
```

## Run the dev server

```bash
npm run dev
```

Vite starts on [http://localhost:5173](http://localhost:5173) by default.

## Available scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build (`dist/`) |
| `npm run build:dev` | Development-mode build (unminified, useful for debugging) |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint over the project |
| `npm run test` | Run the Vitest test suite once |
| `npm run test:watch` | Run Vitest in watch mode |

## Project structure

```
src/
├── components/
│   ├── editor/           # Editor UI: canvas, palette, hierarchy, toolbar, preview, modals
│   └── ui/                # shadcn/ui primitives (buttons, dialogs, resizable panels, etc.)
├── lib/
│   ├── editor-context.tsx # Central state (React Context + reducer), undo/redo history
│   ├── otui-parser.ts     # Text ⇄ widget-tree parser & serializer
│   ├── otui-types.ts      # Widget type definitions, property schema, tree helpers
│   ├── otui-validator.ts  # OTCR compliance validation + auto-fix
│   ├── otui-standard.ts   # OTCR specification reference data (used by the in-app standard viewer)
│   └── i18n.ts             # UI translation strings (EN/PT-BR) + tr() helpers
├── pages/
│   └── Index.tsx          # Entry point, renders <OTUIEditor />
└── test/                  # Vitest setup + example tests
```

Root-level `.otui` files (`example.otui`, `otcr-*.otui`, `test-*.otui`) are sample/test fixtures used to validate parser behavior — see [test-parse.js](../test-parse.js) and the `src/test/` suite.

## Next steps

- Read the [User Guide](./USER_GUIDE.md) to learn the editor's features.
- Read [Architecture](./ARCHITECTURE.md) to understand how state, parsing, and rendering fit together before making code changes.
