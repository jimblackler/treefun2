import {HTMLElement} from '../common/domStreamTypes';

export type LayoutText = (textNode: HTMLElement, text: string,
                          width: number, x: number, height: number, dy: number) => void;
