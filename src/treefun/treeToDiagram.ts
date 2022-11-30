import {assertDefined} from '../common/check/defined';
import {layoutText} from './layoutText';
import {Node} from './node';
import {Options} from './options';

interface Group {
  parent: Node | undefined;
  members: Node[];
}

// Sweep from the left to the right along a level, moving nodes along the row if they overlap with a
// previous node, or the edge of the diagram area.
function sweepLeftToRight(level: Group[], inPos: Map<Node, number>, outPos: Map<Node, number>,
                          options: Options) {
  let minX = 0;
  level.forEach(group => {
    group.members.forEach((node, nodeIdx) => {
      const x = inPos.get(node);
      const newX = x === undefined || x <= minX ? minX : x;
      minX = nodeIdx === group.members.length - 1 ?
          newX + 1 + options.minimumCousinGap : newX + 1 + options.siblingGap;
      outPos.set(node, newX);
    });
  });
}

// Sweep from the right to the left along a level, moving nodes along the row if they overlap with a
// previous node, or the edge of the diagram area (specified).
function sweepRightToLeft(level: Group[], inPos: Map<Node, number>,
                          outPos: Map<Node, number>, maxWidth: number, options: Options) {
  let maxX = maxWidth - 1;
  for (let memberIdx = level.length - 1; memberIdx >= 0; memberIdx--) {
    const group = level[memberIdx];
    for (let nodeIdx = group.members.length - 1; nodeIdx >= 0; nodeIdx--) {
      const node = group.members[nodeIdx];
      const x = inPos.get(node);
      const newX = x === undefined || x >= maxX ? maxX : x;
      maxX = nodeIdx === 0 ? newX - 1 - options.minimumCousinGap : newX - 1 - options.siblingGap;
      outPos.set(node, newX);
    }
  }
}

// Positions the nodes on a level in a position that is guaranteed not to overlap with other nodes
// on that level, but as close as possible to the ideal position (if one is set).
function sweepAndAverage(x: Map<Node, number>, level: Group[], maxWidth: number,
                         options: Options) {
  const x0 = new Map<Node, number>();
  sweepLeftToRight(level, x, x0, options);
  sweepRightToLeft(level, x0, x0, maxWidth, options);

  const x1 = new Map<Node, number>();
  sweepRightToLeft(level, x, x1, maxWidth, options);
  sweepLeftToRight(level, x1, x1, options);

  level.forEach(group => group.members.forEach(
      node => x.set(node, (assertDefined(x0.get(node)) + assertDefined(x1.get(node))) / 2)));
}

// Converts the specified tree to a diagram under diagramGroup in the SVG diagramSvg. Options are
// configured in the specified options object.
export function treeToDiagram(document: Document, parent: HTMLElement, tree: Node[],
                              options: Options, css: string) {
  // Convert the tree structure into an array of levels 0... n of cousin and sibling nodes.
  let groups: Group[] = tree.map(node => ({parent: undefined, members: [node]}));
  const levels = [];
  while (groups.length) {
    levels.push(groups);
    groups = groups.map(group =>
        group.members.filter(member => member.children?.length).map(member => ({
          parent: member,
          members: assertDefined(member.children)
        }))).flat();
  }

  // Decide which level should be fixed.
  let fixedLevel: number | undefined;
  let fixedLevelWidth: number | undefined;

  levels.forEach((level, levelIdx) => {
    const width = level.map(
        group => group.members.length + (group.members.length - 1) * options.siblingGap +
            options.minimumCousinGap).reduce((a, b) => a + b, -options.minimumCousinGap);
    if (fixedLevelWidth === undefined || width > fixedLevelWidth) {
      fixedLevel = levelIdx;
      fixedLevelWidth = width;
    }
  });

  if (fixedLevel === undefined || fixedLevelWidth === undefined) {
    throw new Error();
  }

  const maxWidth = Math.max(fixedLevelWidth, options.minimumBreadth * (1 + options.levelsGap));

  // Position and make elements.
  const level = levels[fixedLevel];

  // Use any extra space to increase group gap up to ideal gap.
  let spare = maxWidth - fixedLevelWidth;
  let useCousinGap = options.minimumCousinGap;
  if (level.length > 1) {
    const spareForGroupGaps =
        Math.min(spare / (level.length - 1), options.idealCousinGap - options.minimumCousinGap);
    spare -= spareForGroupGaps * (level.length - 1);
    useCousinGap += spareForGroupGaps;
  }

  const x_ = new Map<Node, number>();

  // ... any left is used to center the fixed group.
  let x = spare / 2;

  // Position fixed level.
  level.forEach(group => {
    group.members.forEach((node, nodeIdx) => {
      if (nodeIdx > 0) {
        x += options.siblingGap;
      }
      x_.set(node, x);
      x += 1;
    });
    x += useCousinGap;
  });

  // Fixed to top; parent to average of children.
  for (let levelIdx = fixedLevel - 1; levelIdx >= 0; levelIdx--) {
    const level = levels[levelIdx];
    // Find positions
    level.forEach(group => {
      group.members.forEach(node => {
        const children = node.children;
        if (!children || children.length === 0) {
          return;
        }
        const totalX =
            children.map(child => assertDefined(x_.get(child))).reduce((a, b) => a + b, 0);
        x_.set(node, totalX / children.length);
      });
    });
    sweepAndAverage(x_, level, maxWidth, options);
  }

  // Below fixed to bottom; children distributed under parent.
  for (let levelIdx = fixedLevel + 1; levelIdx < levels.length; levelIdx++) {
    const level = levels[levelIdx];
    // Find positions.
    level.forEach(group => {
      const parent = assertDefined(group.parent);

      const groupWidth = (group.members.length - 1) * (1 + options.idealSiblingGap) + 1;
      let x = assertDefined(x_.get(parent)) - groupWidth / 2 + 0.5;
      group.members.forEach(node => {
        x_.set(node, x);
        x += 1 + options.idealSiblingGap;
      });
    });
    sweepAndAverage(x_, level, maxWidth, options);
  }

  // Now render the tree.
  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  parent.append(svg);
  svg.setAttribute('xmlns', svgNs);
  svg.setAttribute('style', `width:${options.width}px; height:${options.height}px`);

  const styleSheet = document.createElementNS(svgNs, 'style');
  svg.append(styleSheet);
  styleSheet.append(css);

  const defs = document.createElementNS(svgNs, 'defs');
  svg.append(defs);

  const marker = document.createElementNS(svgNs, 'marker');
  defs.append(marker);
  marker.setAttribute('id', 'arrowHead');
  marker.setAttribute('viewBox', '-10 -5 10 10');
  marker.setAttribute('markerUnits', 'strokeWidth');
  marker.setAttribute('markerWidth', `${options.arrowHeadSize}`);
  marker.setAttribute('markerHeight', `${options.arrowHeadSize}`);
  marker.setAttribute('orient', 'auto');

  const path = document.createElementNS(svgNs, 'path');
  marker.append(path);
  path.setAttribute('d', 'M -10 -5 L 0 0 L -10 5 z');

  const diagramGroup = document.createElementNS(svgNs, 'g');
  svg.append(diagramGroup);

  // Find height ratio.
  const useLevels = Math.max(levels.length, options.minimumDepth);
  const height = useLevels + (useLevels - 1) * options.levelsGap;

  const xAttribute = options.flipXY ? 'y' : 'x';
  const yAttribute = options.flipXY ? 'x' : 'y';
  const diagramWidth = options.flipXY ? options.height : options.width;
  const diagramHeight = options.flipXY ? options.width : options.height;
  const widthAttribute = options.flipXY ? 'height' : 'width';
  const heightAttribute = options.flipXY ? 'width' : 'height';

  const xMultiplier = diagramWidth / maxWidth;
  const yMultiplier = diagramHeight / height;

  // Add visual elements.
  const namespace = 'http://www.w3.org/2000/svg';
  levels.forEach((level, levelIdx) => {
    level.forEach(group => {
      group.members.forEach((node, nodeIdx) => {
        const rect = document.createElementNS(namespace, 'rect');
        diagramGroup.append(rect);

        const yValue = levelIdx * (1 + options.levelsGap);

        rect.setAttribute(xAttribute, Math.floor(assertDefined(x_.get(node)) * xMultiplier) + 'px');
        rect.setAttribute(yAttribute, Math.floor(yValue * yMultiplier) + 'px');
        rect.setAttribute(widthAttribute, Math.floor(xMultiplier) + 'px');
        rect.setAttribute(heightAttribute, Math.floor(yMultiplier) + 'px');

        const text = document.createElementNS(namespace, 'text');
        diagramGroup.append(text);

        // Arrange text; method is different for horizontal diagrams.
        if (options.flipXY) {
          const xPos = Math.floor(assertDefined(x_.get(node)) * xMultiplier);
          const yPos = Math.floor((yValue + 0.5) * yMultiplier);
          text.setAttribute(xAttribute, xPos + 'px');
          text.setAttribute(yAttribute, Math.floor(yValue * yMultiplier) + 'px');
          layoutText(document, text, node.label, yMultiplier - options.labelPadding, yPos,
              xMultiplier, options.labelLineSpacing);
        } else {
          const xPos = Math.floor((assertDefined(x_.get(node)) + 0.5) * xMultiplier);
          text.setAttribute(xAttribute, xPos + 'px');
          text.setAttribute(yAttribute, Math.floor(yValue * yMultiplier) + 'px');
          layoutText(document, text, node.label, xMultiplier - options.labelPadding, xPos,
              yMultiplier, options.labelLineSpacing);
        }

        if (levelIdx === 0) {
          return;  // Level 0 nodes don't have parents.
        }

        // Draw lines to parents.
        const line = document.createElementNS(namespace, 'line');
        diagramGroup.append(line);
        const parentOffset = (nodeIdx + 1) / (group.members.length + 1);
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
            x_.get(assertDefined(group.parent))) + parentOffset) * xMultiplier) + 'px');
        line.setAttribute(yAttribute + first, Math.floor((parentY + 1) * yMultiplier) + 'px');
        line.setAttribute(xAttribute + second,
            Math.floor((assertDefined(x_.get(node)) + 0.5) * xMultiplier) + 'px');
        line.setAttribute(yAttribute + second, Math.floor(yValue * yMultiplier) + 'px');

        line.setAttribute('marker-end', 'url(#arrowHead)');
      });
    });
  });
}
