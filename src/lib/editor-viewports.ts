import type { OTUIWidget } from './otui-types';

export interface EmptyEditorViewport {
  id: string;
  name: string;
}

export interface EditorViewport extends EmptyEditorViewport {
  roots: OTUIWidget[];
}

export const EDITOR_VIEWPORT_PROPERTY = '__editorViewport';

function rootViewportId(root: OTUIWidget): string {
  return root.properties[EDITOR_VIEWPORT_PROPERTY] || `root:${root.id}`;
}

export function buildEditorViewports(
  roots: OTUIWidget[],
  emptyViewports: EmptyEditorViewport[],
): EditorViewport[] {
  const viewports = new Map<string, EditorViewport>();

  for (const root of roots) {
    const id = rootViewportId(root);
    const existing = viewports.get(id);
    if (existing) {
      existing.roots.push(root);
      continue;
    }

    viewports.set(id, {
      id,
      name: root.properties.id || root.name || `Viewport ${viewports.size + 1}`,
      roots: [root],
    });
  }

  for (const viewport of emptyViewports) {
    const existing = viewports.get(viewport.id);
    if (existing) existing.name = viewport.name;
    else viewports.set(viewport.id, { ...viewport, roots: [] });
  }

  return [...viewports.values()];
}