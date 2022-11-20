import {ComponentContainer, GoldenLayout, LayoutConfig} from 'golden-layout';
import {assertNotNull} from '../common/check/null';
import './style.css'

const container = assertNotNull(document.getElementById('container'));

const layoutConfig: LayoutConfig = {
  root: undefined,
  content: [{
    type: 'row',
    content: [{
      type: 'component',
      componentType: 'testComponent',
      componentState: {title: 'First Item'}
    }, {
      type: 'component',
      componentType: 'testComponent',
      componentState: {title: 'Second Item'},
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

