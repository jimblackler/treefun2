import {RequestHandler} from 'express';
import {DomStream} from '../domStream';
import {addScripts} from '../manifest';

export const mainHandler: RequestHandler = async (req, res, next) => {
  res.setHeader('Content-Type', 'text/html');

  const domStream = new DomStream(res);
  const document = domStream.document;

  document.documentElement.setAttribute('lang', 'en');

  const head = document.head;
  const metaCharset = document.createElement('meta');
  head.append(metaCharset);
  metaCharset.setAttribute('charset', 'utf-8');

  const metaViewport = document.createElement('meta');
  head.append(metaViewport);
  metaViewport.setAttribute('name', 'viewport');
  metaViewport.setAttribute('content', 'width=device-width, initial-scale=1');

  const titleElement = document.createElement('title');
  head.append(titleElement);
  titleElement.append('Test application');

  const style = document.createElement('link');
  head.append(style);
  style.setAttribute('rel', 'stylesheet');
  style.setAttribute('href', '/styles/base.css');

  const body = document.body;
  const main = document.createElement('main');
  body.append(main);

  const menuBar = document.createElement('vaadin-menu-bar');
  main.append(menuBar);

  const section = document.createElement('section');
  body.append(section);
  section.setAttribute('id', 'container');

  addScripts(document, body, 'main');

  await domStream.end()
};
