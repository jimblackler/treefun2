import {defaultKeymap} from "@codemirror/commands"
import {EditorView, keymap, lineNumbers} from "@codemirror/view"
import {basicLight} from 'cm6-theme-basic-light'
import {ComponentContainer, GoldenLayout, LayoutConfig} from 'golden-layout';
import {JSONEditor, Mode} from 'vanilla-jsoneditor'
import {assertNotNull} from '../common/check/null';
import './style.css'

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
      }, {
        type: 'component',
        componentType: 'testComponent',
        title: 'Component 2'
      }]
    }, {
      type: 'column',
      content: [{
        type: 'component',
        componentType: 'editor2'
      }, {
        type: 'component',
        componentType: 'testComponent'
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

class TestComponent {
  constructor(container: ComponentContainer) {
    const h2 = document.createElement('h2');
    h2.append('Test');
    container.element.append(h2);
  }
}

layout.registerComponentConstructor('testComponent', TestComponent, false);

class Editor {
  constructor(container: ComponentContainer) {
    const data: any = {};
    for (const key in navigator) {
      data[key] = (navigator as any)[key];
    }

    const editor = new JSONEditor({
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
  }
}

layout.registerComponentConstructor('editor', Editor, false);

class Editor2 {
  constructor(container: ComponentContainer) {
    new EditorView({
      doc: "Hello World",
      extensions: [keymap.of(defaultKeymap), lineNumbers(), basicLight],
      parent: container.element
    });
  }
}

layout.registerComponentConstructor('editor2', Editor2, false);

layout.loadLayout(layoutConfig);

