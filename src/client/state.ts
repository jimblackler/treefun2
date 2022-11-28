import {Node} from '../treefun/node';
import {Options} from '../treefun/options';
import {transactionToPromise} from './transactionToPromise';

export interface State {
  tree: Node[];
  css: string;
  options: Options;
}

const stateDb: Promise<IDBDatabase> = new Promise((resolve, reject) => {
  const request = indexedDB.open('state-store', 1);
  request.addEventListener('upgradeneeded', event => {
    if (event.oldVersion < 1) {
      if (request.result.objectStoreNames.contains('state')) {
        request.result.deleteObjectStore('state');
      }
      request.result.createObjectStore('state');
    }
  });
  request.addEventListener('error', () => reject(request.error));
  request.addEventListener('success', () => resolve(request.result));
});

let activeState: State | undefined;

type StateListener = (state: State) => void;

const listeners = new Set<StateListener>();

export function listen(listener: StateListener): () => void {
  listeners.add(listener);
  if (activeState) {
    const _activeState = activeState;
    requestAnimationFrame(() => listener(_activeState));
  }
  return () => {
    listeners.delete(listener);
  }
}

export function setState(state: State) {
  activeState = state;
  listeners.forEach(listener => listener(state));
  stateDb.then(db => db.transaction('state', 'readwrite').objectStore('state').put(state, ''));
}

stateDb.then(db =>
    db.transaction('state', 'readonly').objectStore('state').get(''))
    .then(transactionToPromise).then(state => {
  if (state) {
    setState(state);
  }
});
