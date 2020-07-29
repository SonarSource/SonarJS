/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { Server } from 'http';
import * as express from 'express';
import { RequestHandler } from 'express';
import * as bodyParser from 'body-parser';
import {
  AnalysisInput,
  analyzeJavaScript,
  analyzeTypeScript,
  EMPTY_RESPONSE,
  AnalysisResponse,
  initLinter,
  Rule,
} from './analyzer';
import { AddressInfo } from 'net';
import { unloadTypeScriptEslint, ParseExceptionCode } from './parser';
import { getFilesForTsConfig } from './tsconfig';

const MAX_REQUEST_SIZE = '50mb';

export function start(port = 0): Promise<Server> {
  return startServer(port, analyzeJavaScript, analyzeTypeScript);
}

type AnalysisFunction = (input: AnalysisInput) => AnalysisResponse;

// exported for test
export function startServer(
  port = 0,
  analyzeJS: AnalysisFunction,
  analyzeTS: AnalysisFunction,
): Promise<Server> {
  return new Promise(resolve => {
    console.log('DEBUG starting eslint-bridge server at port', port);
    let server: Server;
    const app = express();

    // for parsing application/json requests
    app.use(bodyParser.json({ limit: MAX_REQUEST_SIZE }));

    app.post('/init', (req, resp) => {
      initLinter(req.body as Rule[]);
      resp.send('OK!');
    });

    app.post('/analyze-js', analyze(analyzeJS));

    app.post('/analyze-ts', analyze(analyzeTS));

    app.post('/new-tsconfig', (_request: express.Request, response: express.Response) => {
      unloadTypeScriptEslint();
      response.send('OK!');
    });

    app.post('/tsconfig-files', (request: express.Request, response: express.Response) => {
      try {
        const tsconfig = request.body.tsconfig;
        response.json(getFilesForTsConfig(tsconfig));
      } catch (e) {
        console.error(e.stack);
        response.json({ error: e.message });
      }
    });

    app.get('/status', (_: express.Request, resp: express.Response) => resp.send('OK!'));

    app.post('/close', (_req: express.Request, resp: express.Response) => {
      console.log('DEBUG eslint-bridge server will shutdown');
      resp.end(() => {
        server.close();
      });
    });

    server = app.listen(port, () => {
      console.log(
        'DEBUG eslint-bridge server is running at port',
        (server.address() as AddressInfo).port,
      );
      resolve(server);
    });
  });
}

function analyze(analysisFunction: AnalysisFunction): RequestHandler {
  return (request: express.Request, response: express.Response) => {
    try {
      const parsedRequest = request.body as AnalysisInput;
      const analysisResponse = analysisFunction(parsedRequest);
      response.json(analysisResponse);
    } catch (e) {
      console.error(e.stack);
      response.json({
        ...EMPTY_RESPONSE,
        parsingError: {
          message: e.message,
          code: ParseExceptionCode.GeneralError,
        },
      });
    }
  };
}
