// Editor state management using React context

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { OTUIWidget, EditorState, HistoryEntry, findWidget, removeWidget, createWidget, deepCloneWidget, WidgetType } from './otui-types';
import { parseOTUI, SAMPLE_OTUI } from './otui-parser';

type EditorAction =
  | { type: 'SET_WIDGETS'; widgets: OTUIWidget[] }
  | { type: 'SELECT_WIDGET'; id: string | null }
  | { type: 'ADD_WIDGET'; widget: OTUIWidget; parentId: string | null }
  | { type: 'REMOVE_WIDGET'; id: string }
  | { type: 'UPDATE_PROPERTY'; widgetId: string; key: string; value: string }
  | { type: 'RENAME_WIDGET'; widgetId: string; name: string }
  | { type: 'MOVE_WIDGET'; widgetId: string; newParentId: string | null; index?: number }
  | { type: 'DUPLICATE_WIDGET'; id: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'PUSH_HISTORY'; label: string };

function updateWidgetInTree(widgets: OTUIWidget[], id: string, updater: (w: OTUIWidget) => OTUIWidget): OTUIWidget[] {
  return widgets.map(w => {
    if (w.id === id) return updater(w);
    return { ...w, children: updateWidgetInTree(w.children, id, updater) };
  });
}

function addWidgetToParent(widgets: OTUIWidget[], widget: OTUIWidget, parentId: string | null): OTUIWidget[] {
  if (!parentId) return [...widgets, widget];
  return widgets.map(w => {
    if (w.id === parentId) return { ...w, children: [...w.children, { ...widget, parentId }] };
    return { ...w, children: addWidgetToParent(w.children, widget, parentId) };
  });
}

const initialWidgets = parseOTUI(SAMPLE_OTUI);

const initialState: EditorState = {
  rootWidgets: initialWidgets,
  selectedWidgetId: null,
  clipboard: null,
  history: [{ rootWidgets: initialWidgets, label: 'Initial' }],
  historyIndex: 0,
};

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_WIDGETS':
      return { ...state, rootWidgets: action.widgets, selectedWidgetId: null };

    case 'SELECT_WIDGET':
      return { ...state, selectedWidgetId: action.id };

    case 'ADD_WIDGET': {
      const newWidgets = addWidgetToParent(state.rootWidgets, action.widget, action.parentId);
      return { ...state, rootWidgets: newWidgets, selectedWidgetId: action.widget.id };
    }

    case 'REMOVE_WIDGET': {
      const newWidgets = removeWidget(state.rootWidgets, action.id);
      return {
        ...state,
        rootWidgets: newWidgets,
        selectedWidgetId: state.selectedWidgetId === action.id ? null : state.selectedWidgetId,
      };
    }

    case 'UPDATE_PROPERTY': {
      const newWidgets = updateWidgetInTree(state.rootWidgets, action.widgetId, w => ({
        ...w,
        properties: { ...w.properties, [action.key]: action.value },
      }));
      return { ...state, rootWidgets: newWidgets };
    }

    case 'RENAME_WIDGET': {
      const newWidgets = updateWidgetInTree(state.rootWidgets, action.widgetId, w => ({
        ...w,
        name: action.name,
      }));
      return { ...state, rootWidgets: newWidgets };
    }

    case 'MOVE_WIDGET': {
      const widget = findWidget(state.rootWidgets, action.widgetId);
      if (!widget) return state;
      let newWidgets = removeWidget(state.rootWidgets, action.widgetId);
      newWidgets = addWidgetToParent(newWidgets, { ...widget, parentId: action.newParentId }, action.newParentId);
      return { ...state, rootWidgets: newWidgets };
    }

    case 'DUPLICATE_WIDGET': {
      const widget = findWidget(state.rootWidgets, action.id);
      if (!widget) return state;
      const clone = deepCloneWidget(widget, widget.parentId);
      const newWidgets = addWidgetToParent(state.rootWidgets, clone, widget.parentId);
      return { ...state, rootWidgets: newWidgets, selectedWidgetId: clone.id };
    }

    case 'PUSH_HISTORY': {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({ rootWidgets: JSON.parse(JSON.stringify(state.rootWidgets)), label: action.label });
      return { ...state, history: newHistory, historyIndex: newHistory.length - 1 };
    }

    case 'UNDO': {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        ...state,
        rootWidgets: JSON.parse(JSON.stringify(state.history[newIndex].rootWidgets)),
        historyIndex: newIndex,
        selectedWidgetId: null,
      };
    }

    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        ...state,
        rootWidgets: JSON.parse(JSON.stringify(state.history[newIndex].rootWidgets)),
        historyIndex: newIndex,
        selectedWidgetId: null,
      };
    }

    default:
      return state;
  }
}

interface EditorContextValue {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  selectedWidget: OTUIWidget | null;
  pushHistory: (label: string) => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  const selectedWidget = state.selectedWidgetId
    ? findWidget(state.rootWidgets, state.selectedWidgetId)
    : null;

  const pushHistory = useCallback((label: string) => {
    dispatch({ type: 'PUSH_HISTORY', label });
  }, []);

  return (
    <EditorContext.Provider value={{ state, dispatch, selectedWidget, pushHistory }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used within EditorProvider');
  return ctx;
}
