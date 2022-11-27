import {defaultKeymap} from "@codemirror/commands"
import {css} from '@codemirror/lang-css';
import {EditorView, keymap, lineNumbers} from "@codemirror/view"
import '@vaadin/menu-bar';
import {MenuBarItem} from '@vaadin/menu-bar';
import axios from 'axios';
import {basicLight} from 'cm6-theme-basic-light'
import {ComponentContainer, GoldenLayout, JsonValue, LayoutConfig} from 'golden-layout';
import {JSONEditor, JSONValue, Mode, toJSONContent} from 'vanilla-jsoneditor'
import {assertNotNull} from '../common/check/null';
import {assertString} from '../common/check/string';
import {Node} from '../treefun/node';
import {Options} from '../treefun/options';
import {treeToDiagram} from '../treefun/treeToDiagram';
import {listen, setState, State} from './state';
import './style.css'
import {textToTree} from './textToTree';
import {treeToText} from './treeToText';
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
        tree: data.tree,
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
  {componentType: 'jsonEditorData', name: 'Tree (JSON)'},
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
    treeToDiagram(document, container.element, state.tree, state.options, state.css);
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
    url.searchParams.set('tree', JSON.stringify(state.tree));
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

layout.registerComponentFactoryFunction('jsonEditorData', container => {
  container.setTitle('Tree (JSON)');
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
        if (JSON.stringify(json) !== JSON.stringify(lastState.tree)) {
          setState({...lastState, tree: json as unknown as Node});
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
    if (JSON.stringify(state.tree) !== JSON.stringify(oldJson)) {
      jsonEditor.update({
        text: undefined,
        json: state.tree as unknown as JSONValue
      })
    }
  });
});

layout.registerComponentFactoryFunction('textEditorTree', (container: ComponentContainer) => {
  container.setTitle('Data (text)');
  let lastState: State | undefined;
  container.element.style.overflow = 'scroll';

  const editorView = new EditorView({
    extensions: [keymap.of(defaultKeymap), lineNumbers(), basicLight,
      EditorView.updateListener.of(update => {
        if (!update.docChanged || !lastState) {
          return;
        }
        const text = editorView.state.doc.toString();
        const tree = textToTree(text);
        if (JSON.stringify(lastState.tree) !== JSON.stringify(tree)) {
          setState({...lastState, tree});
        }
      })],
    parent: container.element
  });

  listen(state => {
    lastState = state;
    if (JSON.stringify(state.tree) !==
        JSON.stringify(textToTree(editorView.state.doc.toString()))) {
      const newText = treeToText(state.tree);
      editorView.dispatch({
        changes: {from: 0, to: editorView.state.doc.length, insert: newText}
      });
    }
  });
});

layout.registerComponentFactoryFunction('textEditorCss',
    (container: ComponentContainer) => {
      container.setTitle('CSS');
      let lastState: State | undefined;
      container.element.style.overflow = 'scroll';

      const editorView = new EditorView({
        extensions: [keymap.of(defaultKeymap), lineNumbers(), basicLight,
          EditorView.updateListener.of(update => {
            if (!update.docChanged || !lastState) {
              return;
            }
            const text = editorView.state.doc.toString();
            if (text !== lastState.css) {
              setState({...lastState, css: text});
            }
          }), css()],
        parent: container.element
      });

      listen(state => {
        lastState = state;
        const newText = state.css;
        if (editorView.state.doc.toString() !== newText) {
          editorView.dispatch({
            changes: {from: 0, to: editorView.state.doc.length, insert: newText}
          });
        }
      });
    });

layout.loadLayout(layoutConfig);

