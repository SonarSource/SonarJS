/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { Router, transports } from '@open-rpc/server-js';
import { parseOpenRPCDocument } from '@open-rpc/schema-utils-js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Application } from 'express';
import type { Worker } from 'node:worker_threads';
import type { WorkerData } from '../../shared/src/helpers/worker.js';
import { handleRequest } from './handle-request.js';
import type { WorkerMessageListeners } from './server.js';
import { debug } from '../../shared/src/helpers/logging.js';
import type { Server } from 'connect';
import type { ProjectAnalysisInput } from '../../jsts/src/analysis/projectAnalysis/projectAnalysis.js';
import * as metas from '../../jsts/src/rules/metas.js';
import type { SonarMeta } from '../../jsts/src/rules/helpers/index.js';
import type { RuleConfig } from '../../jsts/src/linter/config/rule-config.js';

const rules = Object.entries(metas).flatMap(([key, meta]: [string, SonarMeta]): RuleConfig[] => {
  return meta.languages.map(language => ({
    key,
    configurations: [],
    language,
    fileTypeTargets: meta.scope === 'Tests' ? ['TEST'] : ['MAIN'],
    analysisModes: ['DEFAULT'],
    blacklistedExtensions: meta.blacklistedExtensions,
  }));
});
/**
 * Creates and configures OpenRPC middleware for the Express app
 * @param app Express application to attach OpenRPC middleware to
 * @param worker Worker thread to handle analysis requests
 * @param workerData Worker configuration data
 * @param listeners Worker message listeners
 */
export async function setupOpenRPC(
  app: Application,
  worker: Worker | undefined,
  workerData: WorkerData,
  listeners: WorkerMessageListeners,
) {
  // Load and parse the OpenRPC schema
  const openrpcDocumentRaw = JSON.parse(
    await readFile(join(import.meta.dirname, 'openrpc-server.json'), 'utf-8'),
  );
  const openrpcDocument = await parseOpenRPCDocument(openrpcDocumentRaw);
  const methodMapping = {
    analyze_file: async (
      _contextId: string,
      filename: string,
      fileContent: string,
      activeRules: string[],
    ) => {
      debug(`OpenRPC analyze_file called for ${filename}`);

      // Map OpenRPC parameters to JsTsAnalysisInput format
      const analysisInput: ProjectAnalysisInput = {
        files: {
          [filename]: {
            filePath: filename,
            fileContent: fileContent,
            fileType: 'MAIN', // Default to MAIN, could be parameterized
            // The contextId and activeRules would need to be handled based on your specific requirements
            // For now, using minimal configuration
          },
        },
        rules: rules.filter(ruleConfig => activeRules.includes(ruleConfig.key)),
        configuration: {
          baseDir: '/tmp',
          canAccessFileSystem: false,
        },
      };

      if (worker) {
        // Use worker thread
        return new Promise((resolve, reject) => {
          listeners.oneTimers.push(message => {
            debug(
              `OpenRPC received message: ${JSON.stringify({ type: message.type, ws: message.ws })}`,
            );
            if (!message.ws) {
              if (message.type === 'success') {
                debug(`OpenRPC analysis successful for ${filename}`);
                resolve(message.result);
              } else if (message.type === 'failure') {
                debug(`OpenRPC analysis failed for ${filename}: ${JSON.stringify(message.error)}`);
                reject(message.error);
              }
            }
          });
          worker.postMessage({ type: 'on-analyze-project', data: analysisInput });
        });
      } else {
        // Handle in the main thread
        const result = await handleRequest(
          { type: 'on-analyze-project', data: analysisInput },
          workerData,
        );

        if (result.type === 'success') {
          return result.result;
        } else {
          throw result.error;
        }
      }
    },
  };

  // Create OpenRPC router
  const rpcRouter = new Router(openrpcDocument, methodMapping);

  // The server created by the HTTPTransport will never be used, so we can pass any port.
  new transports.HTTPTransport({
    app: app as unknown as Server,
    middleware: [],
    port: 0,
  }).addRouter(rpcRouter);
  // hack: remove unneeded middleware set by openrpc
  app.router.stack.splice(2, 2);
  debug('OpenRPC middleware configured successfully');
}
