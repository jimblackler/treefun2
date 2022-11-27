import {defaultKeymap} from "@codemirror/commands"
import {css} from '@codemirror/lang-css';
import {Extension} from '@codemirror/state';
import {EditorView, keymap, lineNumbers} from "@codemirror/view"
import '@vaadin/menu-bar';
import {MenuBarItem} from '@vaadin/menu-bar';
import axios from 'axios';
import {basicLight} from 'cm6-theme-basic-light'
import {ComponentContainer, GoldenLayout, JsonValue, LayoutConfig} from 'golden-layout';
import {JSONEditor, JSONValue, Mode, toJSONContent} from 'vanilla-jsoneditor'
import {assertNotNull} from '../common/check/null';
import {assertString} from '../common/check/string';
import {Options} from '../treefun/options';
import {treeToDiagram} from '../treefun/treeToDiagram';
import {listen, setState, State} from './state';
import './style.css'
import {textToTree} from './textToTree';
import isJson = JsonValue.isJson;

const container = assertNotNull(document.getElementById('container'));

const layoutConfig: LayoutConfig = {
  root: undefined,
  content: [{
    type: 'row',
    content: [{
      type: 'column',
      width: 20,
      content: [{
        type: 'component',
        componentType: 'textEditorTree',
      }, {
        type: 'component',
        componentType: 'jsonEditor',
      }, {
        type: 'component',
        componentType: 'textEditorCss',
      }]
    }, {
      type: 'component',
      componentType: 'diagram'
    }]
  }],

  dimensions: {
    borderWidth: 8,
    headerHeight: 30
  },

  header: {
    popout: false
  }
};
const layout = new GoldenLayout(container);

const menuBar = assertNotNull(document.querySelector('vaadin-menu-bar'));

const actions = new Map<MenuBarItem, () => void>();

const exampleItems: MenuBarItem[] = [];
['animals', 'army', 'collatz', 'java', 'numbers', 'realms', 'unix', 'wow'].forEach(name => {
  const item = {text: name};
  exampleItems.push(item);
  actions.set(item, () => {
    axios.get(`/sampleData/${name}.json`).then(response => response.data).then(data => {
      setState({
        treeText: data.tree,
        css: data.styles,
        options: data.options
      });
    });
  });
});

interface View {
  name: string;
  componentType: string;
  componentState?: JsonValue;
}

const views: View[] = [
  {componentType: 'textEditorTree', name: 'Data (text)'},
  {componentType: 'textEditorCss', name: 'Style'},
  {componentType: 'jsonEditor', name: 'Options'},
  {componentType: 'diagram', name: 'Diagram'},
  {componentType: 'diagramServer', name: 'Diagram SVG (Server)', componentState: {mode: 'svg'}},
  {componentType: 'diagramServer', name: 'Diagram PNG (Server)', componentState: {mode: 'png'}},
];

const viewItems: MenuBarItem[] = [];
views.forEach(view => {
  const item = {text: view.name};
  viewItems.push(item);
  actions.set(item, () => layout.addItem(
      {type: 'component', componentType: view.componentType, componentState: view.componentState}));
});

menuBar.items = [
  {text: 'Examples', children: exampleItems},
  {text: 'View', children: viewItems},
];

menuBar.addEventListener('item-selected',
    evt => (actions.get(evt.detail.value) || (() => {
    }))());

layout.registerComponentFactoryFunction('diagram', container => {
  container.setTitle('Diagram');
  container.element.classList.add('diagramContainer');

  listen(state => {
    while (container.element.firstChild) {
      container.element.firstChild.remove();
    }
    treeToDiagram(
        document, container.element, textToTree(state.treeText), state.options, state.css);
  })
});

layout.registerComponentFactoryFunction('diagramServer', (container, componentState) => {
  if (!componentState || !isJson(componentState)) {
    throw new Error();
  }

  container.setTitle('Diagram (Server)');
  container.element.classList.add('diagramServerContainer');

  const img = document.createElement('img');
  container.element.append(img);

  const url = new URL(`${window.location.origin}/diagram`);

  listen(state => {
    url.searchParams.set('tree', JSON.stringify(textToTree(state.treeText)));
    url.searchParams.set('options', JSON.stringify(state.options));
    url.searchParams.set('css', state.css);
    url.searchParams.set('mode', assertString(componentState.mode));
    img.setAttribute('src', url.toString());
    img.width = state.options.width;
    img.height = state.options.height;
  })
});

layout.registerComponentFactoryFunction('jsonEditor', container => {
  container.setTitle('Options');
  let lastState: State | undefined;
  const jsonEditor = new JSONEditor({
    target: container.element,
    props: {
      mode: Mode.text,
      mainMenuBar: true,
      content: {
        text: '',
        json: undefined
      },
      onChange: (content, previousContent, status) => {
        let json;
        try {
          json = toJSONContent(content).json;
        } catch (e) {
          return;
        }
        if (!lastState) {
          return;
        }
        if (JSON.stringify(json) !== JSON.stringify(lastState.options)) {
          setState({...lastState, options: json as unknown as Options});
        }
      }
    }
  });

  listen(state => {
    lastState = state;
    let oldJson;
    try {
      oldJson = toJSONContent(jsonEditor.get()).json;
    } catch (e) {
      // Invalid JSON.
    }
    if (JSON.stringify(state.options) !== JSON.stringify(oldJson)) {
      jsonEditor.update({
        text: undefined,
        json: state.options as unknown as JSONValue
      })
    }
  });
});

function getTextEditorComponent(title: string, extensions: Extension[],
                                textFromState: (state: State) => string,
                                updateStateFromText: (text: string) => Partial<State>) {
  return (container: ComponentContainer) => {
    container.setTitle(title);
    let lastState: State | undefined;
    container.element.style.overflow = 'scroll';

    const editorView = new EditorView({
      extensions: [keymap.of(defaultKeymap), lineNumbers(), basicLight,
        EditorView.updateListener.of(update => {
          if (!update.docChanged || !lastState) {
            return;
          }
          const text = editorView.state.doc.toString();
          if (text !== textFromState(lastState)) {
            setState({...lastState, ...updateStateFromText(assertString(text))});
          }
        }), ...extensions],
      parent: container.element
    });

    listen(state => {
      lastState = state;
      const newText = assertString(textFromState(state));
      if (editorView.state.doc.toString() !== newText) {
        editorView.dispatch({
          changes: {from: 0, to: editorView.state.doc.length, insert: newText}
        });
      }
    });
  };
}

layout.registerComponentFactoryFunction('textEditorTree',
    getTextEditorComponent('Data (text)', [], state => state.treeText, text => ({treeText: text})));

layout.registerComponentFactoryFunction('textEditorCss',
    getTextEditorComponent('CSS', [css()], state => state.css, text => ({css: text})));

layout.loadLayout(layoutConfig);

