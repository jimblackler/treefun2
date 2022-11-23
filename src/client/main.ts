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

const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
svg.innerHTML = '<style id="stylesheet"></style><defs><marker id="arrowHead" viewBox="-10 -5 10 10" markerUnits="strokeWidth" markerWidth="6" markerHeight="5" orient="auto"><path d="M -10 -5 L 0 0 L -10 5 z"></path></marker></defs><g id="diagramGroup"></g>';
const diagramGroup = svg.getElementById('diagramGroup');

layout.registerComponentFactoryFunction('diagram', container => {
  container.element.style.background = 'white';
  container.element.append(svg);
});

layout.registerComponentFactoryFunction('editor', container => {
  const data: any = {};
  for (const key in navigator) {
    data[key] = (navigator as any)[key];
  }
  new JSONEditor({
    target: container.element,
    props: {
      mode: Mode.text,
      mainMenuBar: true,
      content: {
        text: undefined,
        json: data
      }
    }
  })
});

layout.registerComponentFactoryFunction('editor2', container => {
  container.element.style.overflow = 'scroll';

  function updateDiagram() {
    const tree = textToTree(editorView.state.doc.toString());
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

  const editorView = new EditorView({
    extensions: [keymap.of(defaultKeymap), lineNumbers(), basicLight,
      EditorView.updateListener.of(update => {
        if (!update.docChanged) {
          return;
        }
        updateDiagram();
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

