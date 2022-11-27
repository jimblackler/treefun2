import {LayoutText} from './layoutText';

export const basicLayoutText: LayoutText = (document, textNode, text, width, x, height, dy) => {
  const baselineShift = -2;
  height -= dy;
  textNode.setAttribute('dy', `${dy + baselineShift + height / 2}`);
  const namespace = 'http://www.w3.org/2000/svg';
  const tspan = document.createElementNS(namespace, 'tspan');
  textNode.append(tspan);
  tspan.setAttribute('x', `${x}`);
  tspan.append(text);
};
