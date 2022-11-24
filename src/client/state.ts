import {JSONValue} from 'vanilla-jsoneditor';

export interface State {
  treeText: string;
  css: string;
  options: JSONValue;
}

let activeState: State | undefined;

type StateListener = (state: State) => void;

const listeners: StateListener[] = [];

export function listen(listener: StateListener) {
  listeners.push(listener);
  if (activeState) {
    listener(activeState);
  }
}

export function setState(state: State) {
  activeState = state;
  listeners.forEach(listener => listener(state));
}
