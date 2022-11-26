import {assertDefined} from '../common/check/defined';
import {layoutText} from './layoutText';
import {Node} from './node';
import {Options} from './options';

// Converts the tree structure into an array of levels 0... n of cousin and sibling nodes.
function makeLevels(tree: Node, drawRoot: boolean) {

  let groups: Node[][] = drawRoot ? [[tree]] : tree.children.map(node => [node]);

  const levels = [];
  while (true) {
    levels.push(groups);
    groups = groups.map(group =>
        group.filter(member => member.children.length).map(member => member.children)).flat();
    if (groups.length === 0) {
      break;
    }
  }
  return levels;
}

// Sweep from the left to the right along a level, moving nodes along the row if they overlap with a
// previous node, or the edge of the diagram area.
function sweepLeftToRight(level: Node[][], infields: Map<Node, number>,
                          outfields: Map<Node, number>, options: Options) {
  let minX = 0;
  level.forEach(group => {
    group.forEach((node, nodeIdx) => {
      const x = infields.get(node);
      const newX = x === undefined || x <= minX ? minX : x;
      if (nodeIdx === group.length - 1) {
        minX = newX + 1 + options.minimumCousinGap;
      } else {
        minX = newX + 1 + options.siblingGap;
      }
      outfields.set(node, newX);
    });
  });
}

// Sweep from the right to the left along a level, moving nodes along the row if they overlap with a
// previous node, or the edge of the diagram area (specified).
function sweepRightToLeft(level: Node[][], infields: Map<Node, number>,
                          outfields: Map<Node, number>, maxWidth: number, options: Options) {
  let maxX = maxWidth - 1;
  for (let memberIdx = level.length - 1; memberIdx >= 0; memberIdx--) {
    const group = level[memberIdx];
    for (let nodeIdx = group.length - 1; nodeIdx >= 0; nodeIdx--) {
      const node = group[nodeIdx];
      const x = infields.get(node);
      const newX = x === undefined || x >= maxX ? maxX : x;
      if (nodeIdx === 0) {
        maxX = newX - 1 - options.minimumCousinGap;
      } else {
        maxX = newX - 1 - options.siblingGap;
      }
      outfields.set(node, newX);
    }
  }
}

// Positions the nodes on a level in a position that is guaranteed not to overlap with other nodes
// on that level, but as close as possible to the ideal position (if one is set).
function sweepAndAverage(x: Map<Node, number>, x0: Map<Node, number>, x1: Map<Node, number>,
                         level: Node[][], maxWidth: number, options: Options) {
  sweepLeftToRight(level, x, x0, options);
  sweepRightToLeft(level, x0, x0, maxWidth, options);
  sweepRightToLeft(level, x, x1, maxWidth, options);
  sweepLeftToRight(level, x1, x1, options);
  level.forEach(group => group.forEach(
      node => x.set(node, (assertDefined(x0.get(node)) + assertDefined(x1.get(node))) / 2)));
}

// Converts the specified tree to a diagram under diagramGroup in the SVG diagramSvg. Options are
// configured in the specified options object.
export function treeToDiagram(tree: Node, diagramSvg: SVGSVGElement, diagramGroup: SVGGElement,
                              options: Options) {
  const levels = makeLevels(tree, options.drawRoot);

  // Decide which level should be fixed.
  let fixedLevel = -1;
  const widths = [];

  for (let levelIdx = 0; levelIdx !== levels.length; levelIdx++) {
    const level = levels[levelIdx];
    let spacing = 0;
    let nodesWidth = 0;
    let groupSpacing = 0;
    for (let memberIdx = 0; memberIdx !== level.length; memberIdx++) {
      spacing += groupSpacing;
      const group = level[memberIdx];
      nodesWidth += group.length;
      spacing += (group.length - 1) * options.siblingGap;
      groupSpacing = options.minimumCousinGap;
    }
    const width = spacing + nodesWidth;
    if (fixedLevel === -1 || width > widths[fixedLevel]) {
      fixedLevel = levelIdx;
    }
    widths.push(width);
  }

  const maxWidth = Math.max(widths[fixedLevel], options.minimumBreadth * (1 + options.levelsGap));

  // Position and make elements
  const level = levels[fixedLevel];

  // Use any extra space to increase group gap up to ideal gap...
  const usesiblingGap = options.siblingGap;
  let spare = (maxWidth - widths[fixedLevel]);
  let useCousinGap = options.minimumCousinGap;
  if (level.length > 1) {
    const spareForGroupGaps =
        Math.min(spare / (level.length - 1), (options.idealCousinGap - options.minimumCousinGap));
    spare -= spareForGroupGaps * (level.length - 1);
    useCousinGap += spareForGroupGaps;
  }

  const x_ = new Map<Node, number>();
  const x0 = new Map<Node, number>();
  const x1 = new Map<Node, number>();

  // ... any left is used to center the fixed group.
  let x = spare / 2;

  for (let memberIdx = 0; memberIdx !== level.length; memberIdx++) {
    const group = level[memberIdx];
    let nodeSpacing = 0;
    for (let nodeIdx = 0; nodeIdx !== group.length; nodeIdx++) {
      x += nodeSpacing;
      const node = group[nodeIdx];
      x_.set(node, x);
      x += 1;
      nodeSpacing = usesiblingGap;
    }
    x += useCousinGap;
  }

  // Fixed to top; parent to average of children.
  for (let levelIdx = fixedLevel - 1; levelIdx >= 0; levelIdx--) {
    const level = levels[levelIdx];
    // Find positions
    for (let memberIdx = 0; memberIdx !== level.length; memberIdx++) {
      const group = level[memberIdx];
      for (let nodeIdx = 0; nodeIdx !== group.length; nodeIdx++) {
        const node = group[nodeIdx];
        if (node.children.length === 0) {
          continue;
        }
        let totalX = 0;
        for (let childIdx = 0; childIdx !== node.children.length; childIdx++) {
          const child = node.children[childIdx];
          totalX += assertDefined(x_.get(child));
        }
        x_.set(node, totalX / node.children.length);
      }
    }
    sweepAndAverage(x_, x0, x1, level, maxWidth, options);
  }

  // Second level to bottom; children distributed under parent.
  for (let levelIdx = fixedLevel + 1; levelIdx < levels.length; levelIdx++) {
    const level = levels[levelIdx];
    // Find positions
    for (let memberIdx = 0; memberIdx !== level.length; memberIdx++) {
      const group = level[memberIdx];
      const parent = assertDefined(group[0].parent);

      const groupWidth = (group.length - 1) * (1 + options.idealSiblingGap);
      let x = assertDefined(x_.get(parent)) - groupWidth / 2;
      for (let nodeIdx = 0; nodeIdx !== group.length; nodeIdx++) {
        const node = group[nodeIdx];
        x_.set(node, x);
        x += 1 + options.idealSiblingGap;
      }
    }
    sweepAndAverage(x_, x0, x1, level, maxWidth, options);
  }

  // Now render the tree.
  diagramSvg.getElementById('arrowHead').setAttribute('markerHeight', `${options.arrowHeadSize}`);

  // Find height ratio
  const useLevels = Math.max(levels.length, options.minimumDepth);
  const height = useLevels + (useLevels - 1) * options.levelsGap;

  let xAttribute;
  let yAttribute;
  let widthAttribute;
  let heightAttribute;
  let diagramWidth;
  let diagramHeight;

  if (options.flipXY) {
    xAttribute = 'y';
    yAttribute = 'x';
    diagramWidth = options.height;
    diagramHeight = options.width;
    widthAttribute = 'height';
    heightAttribute = 'width';
  } else {
    xAttribute = 'x';
    yAttribute = 'y';
    diagramWidth = options.width;
    diagramHeight = options.height;
    widthAttribute = 'width';
    heightAttribute = 'height';
  }

  diagramSvg.style.width = options.width + 'px';
  diagramSvg.style.height = options.height + 'px';

  const xMultiplier = diagramWidth / maxWidth;
  const yMultiplier = diagramHeight / height;

  // Add visual elements.
  const namespace = 'http://www.w3.org/2000/svg';
  for (let levelIdx = 0; levelIdx !== levels.length; levelIdx++) {
    const level = levels[levelIdx];
    for (let memberIdx = 0; memberIdx !== level.length; memberIdx++) {
      const group = level[memberIdx];
      for (let nodeIdx = 0; nodeIdx !== group.length; nodeIdx++) {
        const node = group[nodeIdx];

        const rect = document.createElementNS(namespace, 'rect');
        diagramGroup.appendChild(rect);

        const yValue = levelIdx * (1 + options.levelsGap);

        rect.setAttribute(xAttribute, Math.floor(assertDefined(x_.get(node)) * xMultiplier) + 'px');
        rect.setAttribute(yAttribute, Math.floor(yValue * yMultiplier) + 'px');
        rect.setAttribute(widthAttribute, Math.floor(xMultiplier) + 'px');
        rect.setAttribute(heightAttribute, Math.floor(yMultiplier) + 'px');
        if (options.cornerRounding) {
          rect.setAttribute('rx', options.cornerRounding + 'px');
          rect.setAttribute('ry', options.cornerRounding + 'px');
        }

        const text = document.createElementNS(namespace, 'text');
        diagramGroup.appendChild(text);

        // Arrange text; method is different for horizontal diagrams.
        if (options.flipXY) {
          const xPos = Math.floor(assertDefined(x_.get(node)) * xMultiplier);
          const yPos = Math.floor((yValue + 0.5) * yMultiplier);
          text.setAttribute(xAttribute, xPos + 'px');
          text.setAttribute(yAttribute, Math.floor(yValue * yMultiplier) + 'px');
          layoutText(text, node.label, yMultiplier - options.labelPadding, yPos, xMultiplier,
              options.labelLineSpacing);
        } else {
          const xPos = Math.floor((assertDefined(x_.get(node)) + 0.5) * xMultiplier);
          text.setAttribute(xAttribute, xPos + 'px');
          text.setAttribute(yAttribute, Math.floor(yValue * yMultiplier) + 'px');
          layoutText(text, node.label, xMultiplier - options.labelPadding, xPos, yMultiplier,
              options.labelLineSpacing);
        }

        if (levelIdx === 0) {
          continue;  // Level 0 nodes don't have parents.
        }

        // Draw lines to parents.
        const line = document.createElementNS(namespace, 'line');
        diagramGroup.appendChild(line);
        const parentOffset = (nodeIdx + 1) / (group.length + 1);
        const parentY = (levelIdx - 1) * (1 + options.levelsGap);
        let first;
        let second;
        if (options.arrowsUp) {
          first = '2';
          second = '1';
        } else {
          first = '1';
          second = '2';
        }
        line.setAttribute(xAttribute + first, Math.floor((assertDefined(
            x_.get(assertDefined(node.parent))) + parentOffset) * xMultiplier) + 'px');
        line.setAttribute(yAttribute + first, Math.floor((parentY + 1) * yMultiplier) + 'px');
        line.setAttribute(xAttribute + second,
            Math.floor((assertDefined(x_.get(node)) + 0.5) * xMultiplier) + 'px');
        line.setAttribute(yAttribute + second, Math.floor(yValue * yMultiplier) + 'px');

        line.setAttribute('marker-end', 'url(#arrowHead)');
      }
    }
  }
}
