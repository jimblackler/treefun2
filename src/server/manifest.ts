import {readFileSync} from 'fs';
import {Document, HTMLElement} from '../common/domStreamTypes';

const manifest = JSON.parse(readFileSync('out/webpack-manifest.json', 'utf-8'));

export function addScripts(document: Document, parent: HTMLElement, entry: string) {
  for (const file of manifest.entries[entry]) {
    const script = document.createElement('script');
    parent.append(script);
    script.setAttribute('type', 'module');
    script.setAttribute('src', `dist/${file}`);
  }
}
