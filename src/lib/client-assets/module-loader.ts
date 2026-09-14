import type { OTUIWidget, WidgetType } from '@/lib/otui-types';
import { generateWidgetId, WIDGET_TYPES } from '@/lib/otui-types';
import type { ClientAssetSource } from './source';
import { normalizeAssetPath } from './source';
import type { StyleRegistry } from './style-registry';
import { parseStylesheet, type StyleNode } from './style-parser';

export interface ModuleDescriptor {
  name: string;
  path: string;
  directory: string;
  scripts: string[];
  dependencies: string[];
}

export interface ModuleScript {
  path: string;
  text: string;
  moduleName: string;
}

export interface ModuleUIFile {
  path: string;
  text: string;
  moduleName: string;
  instantiate: boolean;
  lineCount: number;
  definitionCount: number;
}

export interface ModuleBundle {
  entry: ModuleDescriptor;
  modules: ModuleDescriptor[];
  scripts: ModuleScript[];
  uiFiles: ModuleUIFile[];
  createdStyles: string[];
  warnings: string[];
}

const UI_CALL_RE = /g_ui\.(displayUI|loadUI|importStyle)\s*\(\s*(['"])(.*?)\2/g;
const CREATE_WIDGET_RE = /g_ui\.createWidget\s*\(\s*(['"])(.*?)\1\s*(?:,\s*([^\r\n]+))?/g;
const NATIVE_TYPES = new Set<string>(WIDGET_TYPES.map((widget) => widget.type));

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  const body = value.trim().replace(/^\[/, '').replace(/\]$/, '');
  return body
    .split(',')
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

export function parseModuleDescriptor(text: string, path: string): ModuleDescriptor {
  const values = new Map<string, string>();
  const blockLists = new Map<string, string[]>();
  let activeList: string | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    const listItem = trimmed.match(/^-\s+(.+)$/);
    if (listItem && activeList) {
      blockLists.get(activeList)?.push(listItem[1].trim().replace(/^['"]|['"]$/g, ''));
      continue;
    }
    const match = trimmed.match(/^([\w-]+):\s*(.*?)\s*$/);
    activeList = null;
    if (match) {
      values.set(match[1], match[2]);
      if (match[2] === '') {
        activeList = match[1];
        blockLists.set(activeList, []);
      }
    }
  }

  const normalizedPath = normalizeAssetPath(path);
  const directory = normalizedPath.split('/').slice(0, -1).join('/');
  const fallbackName = directory.split('/').pop() ?? 'module';
  return {
    name: values.get('name') ?? fallbackName,
    path: normalizedPath,
    directory,
    scripts: blockLists.get('scripts') ?? parseList(values.get('scripts')),
    dependencies: blockLists.get('dependencies') ?? parseList(values.get('dependencies')),
  };
}

function relativeModulePath(directory: string, requested: string, extension: string): string {
  const normalized = normalizeAssetPath(requested);
  const withExtension = normalized.toLowerCase().endsWith(extension) ? normalized : `${normalized}${extension}`;
  if (requested.startsWith('/') || withExtension.startsWith('modules/') || withExtension.startsWith('data/')) {
    return withExtension;
  }
  return `${directory}/${withExtension}`;
}

async function findDescriptor(source: ClientAssetSource, moduleDirectory: string): Promise<string | null> {
  const entries = await source.list(moduleDirectory);
  return entries.find((entry) => entry.kind === 'file' && entry.name.toLowerCase().endsWith('.otmod'))?.path ?? null;
}

async function readDescriptor(source: ClientAssetSource, path: string): Promise<ModuleDescriptor | null> {
  const text = await source.readText(path);
  return text === null ? null : parseModuleDescriptor(text, path);
}

interface LuaReferences {
  ui: { path: string; instantiate: boolean }[];
  createdStyles: string[];
}

export function findLuaUIReferences(text: string, moduleDirectory: string): LuaReferences {
  const ui: LuaReferences['ui'] = [];
  const createdStyles: string[] = [];

  for (const match of text.matchAll(UI_CALL_RE)) {
    ui.push({
      path: relativeModulePath(moduleDirectory, match[3], '.otui'),
      instantiate: match[1] !== 'importStyle',
    });
  }
  for (const match of text.matchAll(CREATE_WIDGET_RE)) {
    const parentExpression = match[3]?.trim();
    if (!parentExpression || parentExpression.startsWith('modules.') || parentExpression.startsWith('g_ui.getRootWidget')) {
      createdStyles.push(match[2]);
    }
  }

  return { ui, createdStyles };
}

export async function loadModuleBundle(source: ClientAssetSource, descriptorPath: string): Promise<ModuleBundle> {
  const entry = await readDescriptor(source, descriptorPath);
  if (!entry) throw new Error(`Could not read ${descriptorPath}.`);

  const modules: ModuleDescriptor[] = [];
  const scripts: ModuleScript[] = [];
  const uiFiles = new Map<string, ModuleUIFile>();
  const createdStyles = new Set<string>();
  const warnings: string[] = [];
  const visited = new Set<string>();

  const visit = async (descriptor: ModuleDescriptor, isEntry: boolean): Promise<void> => {
    if (visited.has(descriptor.name)) return;
    visited.add(descriptor.name);

    for (const dependency of descriptor.dependencies) {
      const dependencyDirectory = `modules/${dependency}`;
      const dependencyPath = await findDescriptor(source, dependencyDirectory);
      const dependencyDescriptor = dependencyPath ? await readDescriptor(source, dependencyPath) : null;
      if (dependencyDescriptor) await visit(dependencyDescriptor, false);
      else warnings.push(`Dependency "${dependency}" was not found.`);
    }

    modules.push(descriptor);
    let foundUIReference = false;
    for (const scriptName of descriptor.scripts) {
      const scriptPath = relativeModulePath(descriptor.directory, scriptName, '.lua');
      const scriptText = await source.readText(scriptPath);
      if (scriptText === null) {
        warnings.push(`Script "${scriptPath}" was not found.`);
        continue;
      }

      scripts.push({ path: scriptPath, text: scriptText, moduleName: descriptor.name });
      const references = findLuaUIReferences(scriptText, descriptor.directory);
      for (const reference of references.ui) {
        foundUIReference = true;
        const existing = uiFiles.get(reference.path);
        uiFiles.set(reference.path, {
          path: reference.path,
          text: existing?.text ?? '',
          moduleName: descriptor.name,
          instantiate: Boolean(existing?.instantiate || (isEntry && reference.instantiate)),
          lineCount: existing?.lineCount ?? 0,
          definitionCount: existing?.definitionCount ?? 0,
        });
      }
      if (isEntry) references.createdStyles.forEach((style) => createdStyles.add(style));
    }

    if (isEntry && !foundUIReference) {
      const fallbackPath = `${descriptor.directory}/${descriptor.name.replace(/^game_/, '')}.otui`;
      uiFiles.set(fallbackPath, {
        path: fallbackPath,
        text: '',
        moduleName: descriptor.name,
        instantiate: true,
        lineCount: 0,
        definitionCount: 0,
      });
    }
  };

  await visit(entry, true);

  for (const [path, uiFile] of [...uiFiles]) {
    const text = await source.readText(path);
    if (text === null) {
      uiFiles.delete(path);
      warnings.push(`UI file "${path}" was not found.`);
    } else {
      uiFile.text = text;
      uiFile.lineCount = text.split(/\r?\n/).length;
      uiFile.definitionCount = parseStylesheet(text, path).length;
    }
  }

  return {
    entry,
    modules,
    scripts,
    uiFiles: [...uiFiles.values()],
    createdStyles: [...createdStyles],
    warnings,
  };
}

function widgetTypeFor(styleName: string, registry: StyleRegistry): WidgetType {
  const nativeBase = registry.resolve(styleName)?.nativeBase ?? styleName;
  if (nativeBase === 'UIWindow') return 'UIMiniWindow';
  return NATIVE_TYPES.has(nativeBase) ? nativeBase as WidgetType : 'UIWidget';
}

function nodeToWidget(node: StyleNode, registry: StyleRegistry, parentId: string | null): OTUIWidget {
  const styleName = node.base ?? node.name;
  const id = generateWidgetId();
  const properties = { ...node.properties, __style: styleName };
  if (node.base === null || (parentId !== null && node.name === '')) properties.__bare = 'true';
  for (const [selector, stateProperties] of Object.entries(node.states)) {
    for (const [key, value] of Object.entries(stateProperties)) properties[`${selector}.${key}`] = value;
  }

  return {
    id,
    name: parentId === null && node.base !== null
      ? node.name
      : node.properties.id || node.name || styleName,
    type: widgetTypeFor(styleName, registry),
    properties,
    children: node.children.map((child) => nodeToWidget(child, registry, id)),
    parentId,
  };
}

/** Creates only the runtime widgets requested by Lua after module styles have been installed. */
export function materializeModule(bundle: ModuleBundle, registry: StyleRegistry): OTUIWidget[] {
  const roots: OTUIWidget[] = [];
  for (const uiFile of bundle.uiFiles.filter((file) => file.instantiate)) {
    const mainNodes = parseStylesheet(uiFile.text, uiFile.path).filter((node) => node.base === null);
    roots.push(...mainNodes.map((node) => nodeToWidget(node, registry, null)));
  }

  for (const styleName of bundle.createdStyles) {
    roots.push(nodeToWidget({
      name: styleName,
      base: null,
      properties: {},
      states: {},
      children: [],
      source: '<lua>',
    }, registry, null));
  }
  roots.forEach((root, layer) => {
    root.properties.__moduleRoot = 'true';
    root.properties.__moduleLayer = String(layer);
  });
  return roots;
}