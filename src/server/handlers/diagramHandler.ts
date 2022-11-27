import {createCanvas} from 'canvas';
import {Canvg} from 'canvg';
import {RequestHandler} from 'express';
import {JSDOM} from 'jsdom';
import {assertString} from '../../common/check/string'
import {treeToDiagram} from '../../treefun/treeToDiagram';

export const diagramHandler: RequestHandler = async (req, res, next) => {

  const jsdom = new JSDOM();
  const window = jsdom.window;
  const document = window.document;

  const tree = JSON.parse(assertString(req.query['tree']));
  const options = JSON.parse(assertString(req.query['options']));
  const css = assertString(req.query['css']);
  const mode = assertString(req.query['mode']);

  treeToDiagram(document, document.body, tree, options, css);

  if (mode === 'svg') {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.write(document.body.innerHTML);
  } else if (mode === 'png') {
    res.setHeader('Content-Type', 'image/png');
    const canvas = createCanvas(options.width, options.height);
    const ctx = canvas.getContext('2d');
    const canvg = new Canvg(ctx, document, {DOMParser: window.DOMParser});
    await canvg.render();
    const buffer = canvas.toBuffer('image/png');
    res.send(buffer);
  }

  res.end();
};
