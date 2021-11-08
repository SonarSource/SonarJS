/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
import express from 'express';
import {
  AnalysisInput,
  analyzeCss,
  analyzeJavaScript,
  analyzeTypeScript,
  EMPTY_RESPONSE,
  AnalysisResponse,
  initLinter,
  Rule,
  loadCustomRuleBundle,
} from './analyzer';
import { AddressInfo } from 'net';
import { unloadTypeScriptEslint, ParseExceptionCode } from './parser';
import { getFilesForTsConfig } from './tsconfig';

const MAX_REQUEST_SIZE = '50mb';

export function start(
  port = 0,
  host = '127.0.0.1',
  additionalRuleBundles: string[] = [],
): Promise<Server> {
  return startServer(
    analyzeJavaScript,
    analyzeTypeScript,
    analyzeCss,
    port,
    host,
    additionalRuleBundles,
  );
}

type AnalysisFunction = (input: AnalysisInput) => Promise<AnalysisResponse>;

// exported for test
export function startServer(
  analyzeJS: AnalysisFunction,
  analyzeTS: AnalysisFunction,
  analyzeCss: AnalysisFunction,
  port = 0,
  host = '127.0.0.1',
  additionalRuleBundles: string[] = [],
): Promise<Server> {
  loadAdditionalRuleBundles(additionalRuleBundles);
  return new Promise(resolve => {
    console.log('DEBUG starting eslint-bridge server at port', port);
    let server: Server;
    const app = express();

    // for parsing application/json requests
    app.use(express.json({ limit: MAX_REQUEST_SIZE }));

    app.post('/init-linter', (req, resp) => {
      initLinter(
        req.body.rules as Rule[],
        req.body.environments as string[],
        req.body.globals as string[],
      );
      resp.send('OK!');
    });

    app.post('/analyze-js', analyze(analyzeJS));

    app.post('/analyze-ts', analyze(analyzeTS));

    app.post('/analyze-css', analyze(analyzeCss));

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

    server = app.listen(port, host, () => {
      console.log(
        'DEBUG eslint-bridge server is running at port',
        (server.address() as AddressInfo).port,
      );
      resolve(server);
    });
  });
}

function analyze(analysisFunction: AnalysisFunction): express.RequestHandler {
  return (request: express.Request, response: express.Response) => {
    function processError(e: any) {
      console.error(e.stack);
      response.json({
        ...EMPTY_RESPONSE,
        parsingError: {
          message: e.message,
          code: ParseExceptionCode.GeneralError,
        },
      });
    }
    try {
      const parsedRequest = request.body as AnalysisInput;
      analysisFunction(parsedRequest)
        .then(analysisResponse => response.json(analysisResponse))
        .catch(processError);
    } catch (e) {
      processError(e);
    }
  };
}

function loadAdditionalRuleBundles(additionalRuleBundles: string[]) {
  for (const bundle of additionalRuleBundles) {
    const ruleIds = loadCustomRuleBundle(bundle);
    console.log(`DEBUG Loaded rules ${ruleIds} from ${bundle}`);
  }
}
