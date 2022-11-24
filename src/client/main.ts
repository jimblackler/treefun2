import {defaultKeymap} from "@codemirror/commands"
import {EditorView, keymap, lineNumbers} from "@codemirror/view"
import axios from 'axios';
import {basicLight} from 'cm6-theme-basic-light'
import {GoldenLayout, LayoutConfig} from 'golden-layout';
import {JSONEditor, Mode, toJSONContent} from 'vanilla-jsoneditor'
import {assertNotNull} from '../common/check/null';
import {assertString} from '../common/check/string';
import {treeToDiagram} from '../treefun/treeToDiagram';
import {listen, setState, State} from './state';
import './style.css'
import {textToTree} from './textToTree';

axios.get('/sampleData/animals.json').then(response => response.data).then(data => {
  const state: State = {
    treeText: data.tree,
    css: data.styles,
    options: data.options
  };
  setState(state);
});

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
        componentType: 'textEditor',
        title: 'Data (text)'
      }, {
        type: 'component',
        componentType: 'jsonEditor',
        title: 'Options'
      }]
    }, {
      type: 'component',
      componentType: 'diagram',
      title: 'Diagram'
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

layout.registerComponentFactoryFunction('diagram', container => {
  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');

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

  container.element.style.background = 'white';
  container.element.append(svg);

  listen(state => {
    styleSheet.innerHTML = state.css;
    while (diagramGroup.firstChild) {
      diagramGroup.firstChild.remove();
    }
    treeToDiagram(textToTree(state.treeText), svg, diagramGroup, state.options);
  })
});

layout.registerComponentFactoryFunction('jsonEditor', container => {
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
        if (!lastState || json === lastState.options) {
          return;
        }
        setState({...lastState, options: json});
      }
    }
  });

  listen(state => {
    const optionsChanged =
        !lastState || JSON.stringify(state.options) === JSON.stringify(lastState.options);
    lastState = state;
    if (!optionsChanged) {
      return;
    }
    jsonEditor.update({
      text: undefined,
      json: state.options
    })
  });
});

layout.registerComponentFactoryFunction('textEditor', container => {
  let lastState: State | undefined;
  container.element.style.overflow = 'scroll';

  const editorView = new EditorView({
    extensions: [keymap.of(defaultKeymap), lineNumbers(), basicLight,
      EditorView.updateListener.of(update => {
        if (!update.docChanged) {
          return;
        }
        const text = editorView.state.doc.toString();
        if (lastState && text === lastState.treeText) {
          return;
        }
        setState({
          ...(assertDefined(lastState)),
          treeText: assertString(text)
        });
      })],
    parent: container.element
  });

  listen(state => {
    lastState = state;
    editorView.dispatch({
      changes: {from: 0, to: editorView.state.doc.length, insert: assertString(state.treeText)}
    });
  });
});

layout.loadLayout(layoutConfig);

