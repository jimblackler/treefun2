import {defaultKeymap} from "@codemirror/commands"
import {EditorView, keymap, lineNumbers} from "@codemirror/view"
import {basicLight} from 'cm6-theme-basic-light'
import {GoldenLayout, LayoutConfig} from 'golden-layout';
import {JSONEditor, Mode} from 'vanilla-jsoneditor'
import {assertNotNull} from '../common/check/null';
import {treeToDiagram} from '../treefun/treeToDiagram';
import './style.css'
import {textToTree} from './textToTree';

const container = assertNotNull(document.getElementById('container'));

const layoutConfig: LayoutConfig = {
  root: undefined,
  content: [{
    type: 'row',
    content: [{
      type: 'stack',
      width: 60,
      content: [{
        type: 'component',
        componentType: 'editor',
        title: 'Editor'
      }]
    }, {
      type: 'column',
      content: [{
        type: 'component',
        componentType: 'editor2'
      }, {
        type: 'component',
        componentType: 'diagram'
      }]
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
  const updateListenerExtension = EditorView.updateListener.of(update => {
    if (!update.docChanged) {
      return;
    }
    const tree = textToTree(editorView.state.doc.toString());
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
  });

  const editorView = new EditorView({
    doc: '1\n' +
        ' 2\n' +
        '  4\n' +
        '   8\n' +
        '    16\n' +
        '     5\n' +
        '      10\n' +
        '       3\n' +
        '        6\n' +
        '         12\n' +
        '          24\n' +
        '           48\n' +
        '            96\n' +
        '             192\n' +
        '              384\n' +
        '               768\n' +
        '       20\n' +
        '        40\n' +
        '         13\n' +
        '          26\n' +
        '           52\n' +
        '            17\n' +
        '             34\n' +
        '              11\n' +
        '               22\n' +
        '              68\n' +
        '               136\n' +
        '            104\n' +
        '             208\n' +
        '              69\n' +
        '               138\n' +
        '              416\n' +
        '               832\n' +
        '         80\n' +
        '          160\n' +
        '           53\n' +
        '            106\n' +
        '             35\n' +
        '              70\n' +
        '               23\n' +
        '               140\n' +
        '             212\n' +
        '              424\n' +
        '               141\n' +
        '               848\n' +
        '           320\n' +
        '            640\n' +
        '             213\n' +
        '              426\n' +
        '               852\n' +
        '             1280\n' +
        '              2560\n' +
        '               853\n' +
        '               5120\n' +
        '     32\n' +
        '      64\n' +
        '       21\n' +
        '        42\n' +
        '         84\n' +
        '          168\n' +
        '           336\n' +
        '            672\n' +
        '             1344\n' +
        '              2688\n' +
        '               5376\n' +
        '       128\n' +
        '        256\n' +
        '         85\n' +
        '          170\n' +
        '           340\n' +
        '            113\n' +
        '             226\n' +
        '              75\n' +
        '               150\n' +
        '              452\n' +
        '               904\n' +
        '            680\n' +
        '             1360\n' +
        '              453\n' +
        '               906\n' +
        '              2720\n' +
        '               5440\n' +
        '         512\n' +
        '          1024\n' +
        '           341\n' +
        '            682\n' +
        '             227\n' +
        '              454\n' +
        '               151\n' +
        '               908\n' +
        '             1364\n' +
        '              2728\n' +
        '               909\n' +
        '               5456\n' +
        '           2048\n' +
        '            4096\n' +
        '             1365\n' +
        '              2730\n' +
        '               5460\n' +
        '             8192\n' +
        '              16384\n' +
        '               5461\n' +
        '               32768',
    extensions: [keymap.of(defaultKeymap), lineNumbers(), basicLight, updateListenerExtension],
    parent: container.element
  });
});

layout.loadLayout(layoutConfig);

