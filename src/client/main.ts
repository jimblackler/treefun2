import {defaultKeymap} from "@codemirror/commands"
import {css} from '@codemirror/lang-css';
import {EditorView, keymap, lineNumbers} from "@codemirror/view"
import '@vaadin/menu-bar';
import {MenuBarItem} from '@vaadin/menu-bar';
import axios from 'axios';
import {basicLight} from 'cm6-theme-basic-light'
import {GoldenLayout, JsonValue, LayoutConfig} from 'golden-layout';
import {JSONEditor, JSONValue, Mode, toJSONContent} from 'vanilla-jsoneditor'
import {assertNotNull} from '../common/check/null';
import {assertString} from '../common/check/string';
import {Node} from '../treefun/node';
import {Options} from '../treefun/options';
import {treeToDiagram} from '../treefun/treeToDiagram';
import {addBooleanSwitch} from './booleanSwitch';
import {Format2, fromJsonFormat2, toJsonFormat2} from './format2';
import {listen, setState, State} from './state';
import './style.css'
import {textToTree} from './textToTree';
import {transactionToPromise} from './transactionToPromise';
import {treeToText} from './treeToText';
import {addValueSlider} from './valueSlider';
import isJson = JsonValue.isJson;

export const layoutStateDb: Promise<IDBDatabase> = new Promise((resolve, reject) => {
  const request = indexedDB.open('layout-state-store', 2);
  request.addEventListener('upgradeneeded', event => {
    if (event.oldVersion < 2) {
      if (request.result.objectStoreNames.contains('layoutState')) {
        request.result.deleteObjectStore('layoutState');
      }
      request.result.createObjectStore('layoutState');
    }
  });
  request.addEventListener('error', () => reject(request.error));
  request.addEventListener('success', () => resolve(request.result));
});

const container = assertNotNull(document.getElementById('container'));

const defaultLayout: LayoutConfig = {
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
    headerHeight: 36
  },

  header: {
    popout: false
  }
};
const layout = new GoldenLayout(container);
window.addEventListener('resize', () => {
  layout.setSize(container.clientWidth, container.clientHeight);
});

const menuBar = assertNotNull(document.querySelector('vaadin-menu-bar'));
menuBar.openOnHover = true;
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
  {componentType: 'jsonEditorData2', name: 'Tree (JSON format 2)'},
  {componentType: 'visualOptions', name: 'Options (Visual)'}
];

const viewItems: MenuBarItem[] = [];
views.forEach(view => {
  const item = {text: view.name};
  viewItems.push(item);
  actions.set(item, () => layout.addItem(
      {type: 'component', componentType: view.componentType, componentState: view.componentState}));
});

const saveItem = {
  text: 'Save diagram'
};
actions.set(saveItem, () => {
  const diagramContainer = document.querySelector('div.diagramContainer');
  if (diagramContainer) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(
        new Blob([diagramContainer.innerHTML], {type: 'text/plain;charset=utf-8'}));
    link.download = 'diagram.svg';
    link.click();
  }
});

const resetItem = {
  text: 'Reset layout'
};
actions.set(resetItem, () => layout.loadLayout(defaultLayout));

menuBar.items = [
  {text: 'Main', children: [saveItem, resetItem]},
  {text: 'Examples', children: exampleItems},
  {text: 'View', children: viewItems},
];

menuBar.addEventListener('item-selected',
    evt => (actions.get(evt.detail.value) || (() => {
    }))());

layout.registerComponentFactoryFunction('diagram', container => {
  container.setTitle('Diagram');
  container.element.classList.add('diagramContainer');

  const close = listen(state => {
    while (container.element.firstChild) {
      container.element.firstChild.remove();
    }
    treeToDiagram(document, container.element, state.tree, state.options, state.css);
  });
  container.on('destroy', close);
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

  const close = listen(state => {
    url.searchParams.set('tree', JSON.stringify(state.tree));
    url.searchParams.set('options', JSON.stringify(state.options));
    url.searchParams.set('css', state.css);
    url.searchParams.set('mode', assertString(componentState.mode));
    img.setAttribute('src', url.toString());
    img.width = state.options.width;
    img.height = state.options.height;
  });
  container.on('destroy', close);
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
      onChange: content => {
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

  const close = listen(state => {
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
  container.on('destroy', close);
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
      onChange: content => {
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
          setState({...lastState, tree: json as unknown as Node[]});
        }
      }
    }
  });

  const close = listen(state => {
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
  container.on('destroy', close);
});

layout.registerComponentFactoryFunction('jsonEditorData2', container => {
  container.setTitle('Tree (JSON format 2)');
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
      onChange: content => {
        let json;
        try {
          json = toJSONContent(content).json;
        } catch (e) {
          return;
        }
        if (!lastState) {
          return;
        }
        const tree = fromJsonFormat2(json as unknown as Format2);
        if (JSON.stringify(tree) !== JSON.stringify(lastState.tree)) {
          setState({...lastState, tree});
        }
      }
    }
  });

  const close = listen(state => {
    lastState = state;
    let oldJson;
    try {
      oldJson = toJSONContent(jsonEditor.get()).json;
    } catch (e) {
      // Invalid JSON.
    }
    const json = toJsonFormat2(state.tree);
    if (JSON.stringify(json) !== JSON.stringify(oldJson)) {
      jsonEditor.update({
        text: undefined,
        json: json as unknown as JSONValue
      })
    }
  });
  container.on('destroy', close);
});

layout.registerComponentFactoryFunction('textEditorTree', container => {
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

  const close = listen(state => {
    lastState = state;
    if (JSON.stringify(state.tree) !==
        JSON.stringify(textToTree(editorView.state.doc.toString()))) {
      const newText = treeToText(state.tree);
      editorView.dispatch({
        changes: {from: 0, to: editorView.state.doc.length, insert: newText}
      });
    }
  });
  container.on('destroy', close);
});

layout.registerComponentFactoryFunction('textEditorCss', container => {
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

  const close = listen(state => {
    lastState = state;
    const newText = state.css;
    if (editorView.state.doc.toString() !== newText) {
      editorView.dispatch({
        changes: {from: 0, to: editorView.state.doc.length, insert: newText}
      });
    }
  });
  container.on('destroy', close);
});

layout.registerComponentFactoryFunction('visualOptions', container => {
  container.setTitle('Options (visual)');
  let lastState: State | undefined;
  container.element.classList.add('visualOptions');

  function setOptions(options: Partial<Options>) {
    if (lastState === undefined) {
      throw new Error();
    }
    setState({...lastState, options: {...lastState.options, ...options}});
  }

  {
    const update = addBooleanSwitch(
        container.element, 'Flip XY', value => setOptions({flipXY: value}));

    container.on('destroy', listen(state => {
      lastState = state;
      update(state.options.flipXY);
    }));
  }

  {
    const update = addValueSlider(
        container.element, 'Width', 0, 2048, 1, value => setOptions({width: value}));

    container.on('destroy', listen(state => {
      lastState = state;
      update(state.options.width);
    }));
  }

  {
    const update = addValueSlider(
        container.element, 'Height', 0, 2048, 1, value => setOptions({height: value}));

    container.on('destroy', listen(state => {
      lastState = state;
      update(state.options.height);
    }));
  }

  {
    const update = addValueSlider(container.element, 'Label line spacing', 0, 30, 1,
        value => setOptions({labelLineSpacing: value}));

    container.on('destroy', listen(state => {
      lastState = state;
      update(state.options.labelLineSpacing);
    }));
  }

  {
    const update = addValueSlider(
        container.element, 'Label padding', 0, 30, 1, value => setOptions({labelPadding: value}));

    container.on('destroy', listen(state => {
      lastState = state;
      update(state.options.labelPadding);
    }));
  }

  {
    const update = addValueSlider(container.element, 'Arrow head size', 0, 30, 1,
        value => setOptions({arrowHeadSize: value}));

    container.on('destroy', listen(state => {
      lastState = state;
      update(state.options.arrowHeadSize);
    }));
  }

  {
    const update = addBooleanSwitch(
        container.element, 'Arrows up', value => setOptions({arrowsUp: value}));

    container.on('destroy', listen(state => {
      lastState = state;
      update(state.options.arrowsUp);
    }));
  }

  {
    const update = addValueSlider(container.element, 'Minimum sibling gap', 0, 2, 0.02,
        value => setOptions({minimumSiblingGap: value}));

    container.on('destroy', listen(state => {
      lastState = state;
      update(state.options.minimumSiblingGap);
    }));
  }

  {
    const update = addValueSlider(container.element, 'Ideal sibling gap', 0, 2, 0.02,
        value => setOptions({idealSiblingGap: value}));

    container.on('destroy', listen(state => {
      lastState = state;
      update(state.options.idealSiblingGap);
    }));
  }

  {
    const update = addValueSlider(container.element, 'Minimum cousin gap', 0, 2, 0.02,
        value => setOptions({minimumCousinGap: value}));

    container.on('destroy', listen(state => {
      lastState = state;
      update(state.options.minimumCousinGap);
    }));
  }

  {
    const update = addValueSlider(container.element, 'Ideal cousin gap', 0, 2, 0.02,
        value => setOptions({idealCousinGap: value}));

    container.on('destroy', listen(state => {
      lastState = state;
      update(state.options.idealCousinGap);
    }));
  }

  {
    const update = addValueSlider(
        container.element, 'Levels gap', 0, 5, 0.1, value => setOptions({levelsGap: value}));

    container.on('destroy', listen(state => {
      lastState = state;
      update(state.options.levelsGap);
    }));
  }

  {
    const update = addValueSlider(
        container.element, 'Minimum depth', 0, 20, 0.1, value => setOptions({minimumDepth: value}));

    container.on('destroy', listen(state => {
      lastState = state;
      update(state.options.minimumDepth);
    }));
  }

  {
    const update = addValueSlider(container.element, 'Minimum breadth', 0, 20, 0.1,
        value => setOptions({minimumBreadth: value}));

    container.on('destroy', listen(state => {
      lastState = state;
      update(state.options.minimumBreadth);
    }));
  }
});

layout.on('stateChanged', function () {
  layoutStateDb.then(db => db.transaction('layoutState', 'readwrite')
      .objectStore('layoutState').put(layout.saveLayout(), ''));
});

layoutStateDb.then(db =>
    db.transaction('layoutState', 'readonly').objectStore('layoutState').get(''))
    .then(transactionToPromise).then(layoutState => {
  if (layoutState) {
    layout.loadLayout(LayoutConfig.fromResolved(layoutState));
  } else {
    layout.loadLayout(defaultLayout);
  }
});
