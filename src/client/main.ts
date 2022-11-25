import {defaultKeymap} from "@codemirror/commands"
import {css} from '@codemirror/lang-css';
import {Extension} from '@codemirror/state';
import {EditorView, keymap, lineNumbers} from "@codemirror/view"
import '@vaadin/menu-bar';
import {MenuBarItem} from '@vaadin/menu-bar';
import axios from 'axios';
import {basicLight} from 'cm6-theme-basic-light'
import {ComponentContainer, GoldenLayout, LayoutConfig} from 'golden-layout';
import {JSONEditor, Mode, toJSONContent} from 'vanilla-jsoneditor'
import {assertNotNull} from '../common/check/null';
import {assertString} from '../common/check/string';
import {treeToDiagram} from '../treefun/treeToDiagram';
import {listen, setState, State} from './state';
import './style.css'
import {textToTree} from './textToTree';

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
  componentType: string,
}

const views: View[] = [
  {componentType: 'textEditorTree', name: 'Data (text)'},
  {componentType: 'textEditorCss', name: 'Style'},
  {componentType: 'jsonEditor', name: 'Options'},
  {componentType: 'diagram', name: 'Diagram'}
];

const viewItems: MenuBarItem[] = [];
views.forEach(view => {
  const item = {text: view.name};
  viewItems.push(item);
  actions.set(item, () => layout.addItem({type: 'component', componentType: view.componentType}));
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

  const wrapper = document.createElement('div');
  container.element.append(wrapper);
  wrapper.setAttribute('class', 'diagramWrapper');

  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  wrapper.append(svg);

  const styleSheet = document.createElementNS(svgNs, 'style');
  svg.append(styleSheet);
  styleSheet.setAttribute('id', 'stylesheet');

  const defs = document.createElementNS(svgNs, 'defs');
  svg.append(defs);

  const marker = document.createElementNS(svgNs, 'marker');
  defs.append(marker);
  marker.setAttribute('id', 'arrowHead');
  marker.setAttribute('viewBox', '-10 -5 10 10');
  marker.setAttribute('markerUnits', 'strokeWidth');
  marker.setAttribute('markerWidth', '6');
  marker.setAttribute('markerHeight', '5');
  marker.setAttribute('orient', 'auto');

  const path = document.createElementNS(svgNs, 'path');
  marker.append(path);
  path.setAttribute('d', 'M -10 -5 L 0 0 L -10 5 z');

  const diagramGroup = document.createElementNS(svgNs, 'g');
  svg.append(diagramGroup);
  diagramGroup.setAttribute('id', 'diagramGroup');

  listen(state => {
    styleSheet.innerHTML = state.css;
    while (diagramGroup.firstChild) {
      diagramGroup.firstChild.remove();
    }
    treeToDiagram(textToTree(state.treeText), svg, diagramGroup, state.options);
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
          setState({...lastState, options: json});
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
        json: state.options
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

