import {assertDefined} from '../common/check/defined';
import {layoutText} from './layoutText';
import {Options} from './options';

type Field = 'x' | 'x0' | 'x1';

interface Node {
  x: number;
  x0: number;
  x1: number;
  label: string;
  children: Node[];
  parent?: Node;
  line?: SVGLineElement;
}

function buildNextLevel(groups: Node[][]) {
  const groupsOut = [];
  for (let groupIdx = 0; groupIdx !== groups.length; groupIdx++) {
    const group = groups[groupIdx];

    for (let memberIdx = 0; memberIdx !== group.length; memberIdx++) {
      const member = group[memberIdx];
      if (!member.children.length) {
        continue;
      }
      groupsOut.push(member.children);
    }
  }
  return groupsOut;
}

// Converts the tree structure into an array of levels 0... n of cousin and sibling nodes.
function makeLevels(tree: Node, drawRoot: boolean) {

  let groups: Node[][] = [];
  if (drawRoot) {
    groups.push([tree]);
  } else {
    const group = tree.children;
    for (let memberIdx = 0; memberIdx !== group.length; memberIdx++) {
      groups.push([group[memberIdx]]);
    }
  }

  const levels = [];
  while (true) {
    levels.push(groups);
    groups = buildNextLevel(groups);
    if (groups.length === 0) {
      break;
    }
  }
  return levels;
}

// Sweep from the left to the right along a level, moving nodes along the row if they overlap with a
// previous node, or the edge of the diagram area.
function sweepLeftToRight(level: Node[][], infield: Field, outfield: Field, options: Options) {
  let minX = 0;
  for (let memberIdx = 0; memberIdx !== level.length; memberIdx++) {
    const group = level[memberIdx];
    for (let nodeIdx = 0; nodeIdx !== group.length; nodeIdx++) {
      const node = group[nodeIdx];
      let newX;
      if (infield in node && infield === 'x' ? node.x : node.x1 > minX) {
        newX = node[infield];
      } else {
        newX = minX;
      }
      if (nodeIdx === group.length - 1) {
        minX = newX + 1 + options.minimumCousinGap;
      } else {
        minX = newX + 1 + options.siblingGap;
      }
      node[outfield] = newX;
    }
  }
}

// Sweep from the right to the left along a level, moving nodes along the row if they overlap with a
// previous node, or the edge of the diagram area (specified).
function sweepRightToLeft(level: Node[][], infield: Field, outfield: Field, maxWidth: number,
                          options: Options) {
  let maxX = maxWidth - 1;
  for (let memberIdx = level.length - 1; memberIdx >= 0; memberIdx--) {
    const group = level[memberIdx];
    for (let nodeIdx = group.length - 1; nodeIdx >= 0; nodeIdx--) {
      const node = group[nodeIdx];
      let newX;
      if (infield in node && node[infield] < maxX) {
        newX = node[infield];
      } else {
        newX = maxX;
      }
      if (nodeIdx === 0) {
        maxX = newX - 1 - options.minimumCousinGap;
      } else {
        maxX = newX - 1 - options.siblingGap;
      }
      node[outfield] = newX;
    }
  }
}

// Positions the nodes on a level in a position that is guaranteed not to overlap with other nodes
// on that level, but as close as possible to the ideal position (if one is set).
function sweepAndAverage(level: Node[][], maxWidth: number, options: Options) {
  sweepLeftToRight(level, 'x', 'x0', options);
  sweepRightToLeft(level, 'x0', 'x0', maxWidth, options);
  sweepRightToLeft(level, 'x', 'x1', maxWidth, options);
  sweepLeftToRight(level, 'x1', 'x1', options);
  for (let memberIdx = 0; memberIdx !== level.length; memberIdx++) {
    const group = level[memberIdx];
    for (let nodeIdx = 0; nodeIdx !== group.length; nodeIdx++) {
      const node = group[nodeIdx];
      node.x = (node.x0 + node.x1) / 2;
    }
  }
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
  // ... any left is used to center the fixed group.
  let x = spare / 2;

  for (let memberIdx = 0; memberIdx !== level.length; memberIdx++) {
    const group = level[memberIdx];
    let nodeSpacing = 0;
    for (let nodeIdx = 0; nodeIdx !== group.length; nodeIdx++) {
      x += nodeSpacing;
      const node = group[nodeIdx];
      node.x = x;
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
          totalX += child.x;
        }
        node.x = totalX / node.children.length;
      }
    }
    sweepAndAverage(level, maxWidth, options);
  }

  // Second level to bottom; children distributed under parent.
  for (let levelIdx = fixedLevel + 1; levelIdx < levels.length; levelIdx++) {
    const level = levels[levelIdx];
    // Find positions
    for (let memberIdx = 0; memberIdx !== level.length; memberIdx++) {
      const group = level[memberIdx];
      const parent = assertDefined(group[0].parent);

      const groupWidth = (group.length - 1) * (1 + options.idealSiblingGap);
      let x = parent.x - groupWidth / 2;
      for (let nodeIdx = 0; nodeIdx !== group.length; nodeIdx++) {
        const node = group[nodeIdx];
        node.x = x;
        x += 1 + options.idealSiblingGap;
      }
    }
    sweepAndAverage(level, maxWidth, options);
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

        rect.setAttribute(xAttribute, Math.floor(node.x * xMultiplier) + 'px');
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
          const xPos = Math.floor(node.x * xMultiplier);
          const yPos = Math.floor((yValue + 0.5) * yMultiplier);
          text.setAttribute(xAttribute, xPos + 'px');
          text.setAttribute(yAttribute, Math.floor(yValue * yMultiplier) + 'px');
          layoutText(text, node.label, yMultiplier - options.labelPadding, yPos, xMultiplier,
              options.labelLineSpacing);
        } else {
          const xPos = Math.floor((node.x + 0.5) * xMultiplier);
          text.setAttribute(xAttribute, xPos + 'px');
          text.setAttribute(yAttribute, Math.floor(yValue * yMultiplier) + 'px');
          layoutText(text, node.label, xMultiplier - options.labelPadding, xPos, yMultiplier,
              options.labelLineSpacing);
        }

        if (levelIdx === 0) {
          continue;  // Level 0 nodes don't have parents.
        }

        // Draw lines to parents.
        node.line = document.createElementNS(namespace, 'line');
        diagramGroup.appendChild(node.line);
        const parentOffset = (nodeIdx + 1) / (group.length + 1);
        const line = node.line;
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
        line.setAttribute(xAttribute + first,
            Math.floor((assertDefined(node.parent).x + parentOffset) * xMultiplier) + 'px');
        line.setAttribute(yAttribute + first, Math.floor((parentY + 1) * yMultiplier) + 'px');
        line.setAttribute(xAttribute + second, Math.floor((node.x + 0.5) * xMultiplier) + 'px');
        line.setAttribute(yAttribute + second, Math.floor(yValue * yMultiplier) + 'px');

        line.setAttribute('marker-end', 'url(#arrowHead)');
      }
    }
  }
}
