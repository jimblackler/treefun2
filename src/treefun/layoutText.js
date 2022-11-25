// Splits all the strings in the array by the specified character, without
// removing that character from the strings. Returns an array of all the split
// strings.
function splitBy(array, char) {
  const out = [];
  for (let i = 0; i !== array.length; i++) {
    const word = array[i];
    const split = word.split(char);
    for (let j = 0; j !== split.length - 1; j++) {
      out.push(split[j] + char);
    }
    out.push(split[split.length - 1]);
  }
  return out;
}

// Creates text arranged in rows, with the maximum specified width and height,
// centered around the 'x' coordinate, and with the specified line spacing.
// Adds to the specified text node.
export function layoutText(textNode, text, width, x, height, dy) {
  const namespace = "http://www.w3.org/2000/svg";
  let previousFit = "";
  let tspan = document.createElementNS(namespace, "tspan");
  tspan.setAttributeNS(null, "x", x);
  textNode.appendChild(tspan);
  tspan.textContent = "!";
  height -= dy;
  tspan.textContent = "";

  const firstTspan = tspan;

  // Split by split characters.
  let words = splitBy(text.split(/\s/));
  const splitChars = ".-";
  for (let j = 0; j !== splitChars.length; j++)
    words = splitBy(words, splitChars[j]);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (tspan.textContent &&
        splitChars.indexOf(tspan.textContent[tspan.textContent.length - 1]) === -1)
      tspan.textContent += " ";
    tspan.textContent += word;

    if (tspan.getComputedTextLength() > width) {
      if (previousFit) {
        tspan.textContent = previousFit;
        if (height < dy)
          break;
        height -= dy;
        tspan = document.createElementNS(namespace, "tspan");
        tspan.setAttributeNS(null, "x", x);
        tspan.setAttributeNS(null, "dy", dy);
      }
      tspan.textContent = word;

      textNode.appendChild(tspan);
      while (tspan.getComputedTextLength() > width) {
        tspan.textContent =
            tspan.textContent.substring(0, tspan.textContent.length - 1);
      }
    }
    previousFit = tspan.textContent;
  }

  const baselineShift = -2;
  firstTspan.setAttributeNS(null, "dy", dy + baselineShift + height / 2);
}
