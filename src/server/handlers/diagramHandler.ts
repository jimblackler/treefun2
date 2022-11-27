import {RequestHandler} from 'express';
import {JSDOM} from 'jsdom';
import {assertString} from '../../common/check/string'
import {treeToDiagram} from '../../treefun/treeToDiagram';

export const diagramHandler: RequestHandler = async (req, res, next) => {
  res.setHeader('Content-Type', 'image/svg+xml');

  const jsdom = new JSDOM();
  const document = jsdom.window.document;

  const tree = JSON.parse(assertString(req.query['tree']));
  const options = JSON.parse(assertString(req.query['options']));
  const css = assertString(req.query['css']);

  treeToDiagram(document, document.body, tree, options, css);
  res.write(document.body.innerHTML);
  res.end();
};
