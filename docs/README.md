# OTUI Designer Suite — Documentation

Welcome to the documentation hub for **OTUI Designer Suite**, a visual editor for building OTUI interfaces for OTClient Redemption (OTCR).

This folder contains everything you need to use, extend, and contribute to the project.

## 📚 Table of Contents

| Document | Description |
|---|---|
| [Getting Started](./GETTING_STARTED.md) | Install, run, and build the project |
| [Architecture](./ARCHITECTURE.md) | How the editor is structured internally (state, parser, rendering) |
| [User Guide](./USER_GUIDE.md) | How to use the editor: widgets, anchors, layouts, preview, export |
| [OTUI Format Reference](./OTUI_FORMAT.md) | The OTUI/OTCR syntax the editor reads and writes |
| [Client Preview & Runtime Parity](./CLIENT_PREVIEW.md) | How the in-browser preview maps to real OTClient rendering, and current gaps |
| [Contributing](./CONTRIBUTING.md) | Coding conventions, workflow, and how to add features |
| [Roadmap](./ROADMAP.md) | Planned features, especially around module management and OTClient parity |
| [Troubleshooting / FAQ](./TROUBLESHOOTING.md) | Common problems and fixes |

## 🧭 Where to start

- **New user?** Start with [Getting Started](./GETTING_STARTED.md), then read [User Guide](./USER_GUIDE.md).
- **Contributor / AI agent?** Read [Architecture](./ARCHITECTURE.md) and [Contributing](./CONTRIBUTING.md), then check the root [AGENTS.md](../AGENTS.md) for agent-specific rules.
- **Working on OTUI parsing/export?** Read [OTUI Format Reference](./OTUI_FORMAT.md) and [../OTCR-COMPLIANCE.md](../OTCR-COMPLIANCE.md).

## Project Goal

This editor exists to let developers build and edit **OTUI interfaces and OTClient modules visually**, without needing to launch `otclient.exe` / `otclient_dx_x64.exe` / `otclient_gl_x64.exe` for every iteration. The long-term goal is full **module management** (multiple `.otui` + `.lua` files working together, previewed as a cohesive OTClient module) directly inside this editor. See [Roadmap](./ROADMAP.md) for details.
