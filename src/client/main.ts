import {ComponentContainer, GoldenLayout, LayoutConfig} from 'golden-layout';
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
        componentType: 'testComponent',
        title: 'Component 1'
      }, {
        type: 'component',
        componentType: 'testComponent',
        title: 'Component 2'
      }]
    }, {
      type: 'column',
      content: [{
        type: 'component',
        componentType: 'testComponent'
      }, {
        type: 'component',
        componentType: 'testComponent'
      }]
    }]
  }]
};
const layout = new GoldenLayout(container);

class Action {
  constructor(container: ComponentContainer) {
    const h2 = document.createElement('h2');
    h2.append('Test');
    container.element.append(h2);
  }
}

layout.registerComponentConstructor('testComponent', Action, false);
layout.loadLayout(layoutConfig);

