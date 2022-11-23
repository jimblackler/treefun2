import {defaultKeymap} from "@codemirror/commands"
import {EditorView, keymap, lineNumbers} from "@codemirror/view"
import axios from 'axios';
import {basicLight} from 'cm6-theme-basic-light'
import {GoldenLayout, LayoutConfig} from 'golden-layout';
import {JSONEditor, Mode} from 'vanilla-jsoneditor'
import {assertNotNull} from '../common/check/null';
import {assertString} from '../common/check/string';
import {treeToDiagram} from '../treefun/treeToDiagram';
import './style.css'
import {textToTree} from './textToTree';

const dataPromise = axios.get('/sampleData/animals.json').then(response => response.data);

const container = assertNotNull(document.getElementById('container'));

const layoutConfig: LayoutConfig = {
  root: undefined,
  content: [{
    type: 'row',
    content: [{
      type: 'stack',
      width: 20,
      content: [{
        type: 'component',
        componentType: 'editor2'
      }, {
        type: 'component',
        componentType: 'editor',
        title: 'Editor'
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

dataPromise.then(data => {styleSheet.innerHTML = data.styles;});

layout.registerComponentFactoryFunction('diagram', container => {
  container.element.style.background = 'white';
  container.element.append(svg);
});

layout.registerComponentFactoryFunction('editor', container => {

  const jsonEditor = new JSONEditor({
    target: container.element,
    props: {
      mode: Mode.text,
      mainMenuBar: true,
      content: {
        text: '',
        json: undefined
      }
    }
  });

  dataPromise.then(data => {
    jsonEditor.update({text: undefined,
      json: data.options
    })
  });
});

function updateDiagram(treeText: string) {
  const tree = textToTree(treeText);
  while (diagramGroup.firstChild) {
    diagramGroup.firstChild.remove();
  }
  treeToDiagram(tree, svg, diagramGroup, {
    flipXY: 0,
    width: 950,
    height: 680,
    labelLineSpacing: 12,
    cornerRounding: 3,
    labelPadding: 0,
    arrowHeadSize: 5,
    arrowsUp: 1,
    siblingGap: 0,
    idealSiblingGap: 0.3,
    minimumCousinGap: 0.12,
    idealCousinGap: 1.5,
    levelsGap: 1.1,
    minimumDepth: 6,
    minimumBreadth: 6,
    drawRoot: false
  });
}

layout.registerComponentFactoryFunction('editor2', container => {
  container.element.style.overflow = 'scroll';

  const editorView = new EditorView({
    extensions: [keymap.of(defaultKeymap), lineNumbers(), basicLight,
      EditorView.updateListener.of(update => {
        if (!update.docChanged) {
          return;
        }
        updateDiagram(editorView.state.doc.toString());
      })],
    parent: container.element
  });

  dataPromise.then(data => {
    editorView.dispatch({
      changes: {from: 0, to: editorView.state.doc.length, insert: assertString(data.tree)}
    });
  });
});

layout.loadLayout(layoutConfig);

