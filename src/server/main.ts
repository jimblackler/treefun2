import express, {Express} from 'express';
import parseurl from 'parseurl';
import send from 'send';
import {assertTruthy} from '../common/check/truthy';
import {mainHandler} from './handlers/mainHandler';

const app: Express = express();

app.use(express.urlencoded({extended: true}));
app.use(express.json());

app.route('/').get(mainHandler);
app.route('/dist/*').get((req, res) => {
  res.set('Cache-control', `public, max-age=${365 * 24 * 60 * 60}`);
  send(req, assertTruthy(parseurl(req)?.pathname), {root: 'static'}).pipe(res);
});
app.route('*').get((req, res) =>
    send(req, assertTruthy(parseurl(req)?.pathname), {root: 'static'}).pipe(res));

app.listen(8082);
