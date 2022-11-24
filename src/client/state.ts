import {JSONValue} from 'vanilla-jsoneditor';

export interface State {
  treeText: string;
  css: string;
  options: JSONValue;
}

type StateListener = (state: State) => void;

const listeners: StateListener[] = [];

export function listen(listener: StateListener) {
  listeners.push(listener);
}

export function setState(state: State) {
  listeners.forEach(listener => listener(state));
}