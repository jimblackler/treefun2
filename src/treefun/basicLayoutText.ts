import {LayoutText} from './layoutText';

export const basicLayoutText: LayoutText = (document, textNode, text, width, x, height, dy) => {
  const namespace = 'http://www.w3.org/2000/svg';
  const tspan = document.createElementNS(namespace, 'tspan');
  textNode.appendChild(tspan);
  tspan.setAttributeNS(null, 'x', `${x}`);
  tspan.append(text);
  height -= dy;
  const baselineShift = -2;
  textNode.setAttributeNS(null, 'dy', `${dy + baselineShift + height / 2}`);
};
