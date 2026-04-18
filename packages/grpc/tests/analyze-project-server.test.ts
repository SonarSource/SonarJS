/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */

import { describe, it } from 'node:test';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { expect } from 'expect';
import * as grpc from '@grpc/grpc-js';
import type { Worker } from 'node:worker_threads';
import { normalizePath } from '../../shared/src/helpers/files.js';
import { startAnalyzeProjectServer } from '../src/analyze-project-server.js';
import { createAnalyzeProjectWorker } from '../src/analyze-project-worker/create-worker.js';
import { sonarjs as analyzeProjectProto } from '../src/proto/analyze-project.js';

const SERVICE_NAME = 'sonarjs.analyzeproject.v1.AnalyzeProjectService';
const basicFixtureDir = normalizePath(
  fileURLToPath(new URL('../../analysis/tests/fixtures-sonarqube/basic', import.meta.url)),
);
const basicFixtureFile = normalizePath(
  fileURLToPath(new URL('../../analysis/tests/fixtures-sonarqube/basic/main.ts', import.meta.url)),
);
const analyzeProjectWorkerPath = fileURLToPath(new URL('../../../server.mjs', import.meta.url));

type AnalyzeProjectRequest = analyzeProjectProto.analyzeproject.v1.IAnalyzeProjectRequest;
type AnalyzeProjectStreamResponse =
  analyzeProjectProto.analyzeproject.v1.IAnalyzeProjectStreamResponse;
type AnalyzeProjectUnaryResponse =
  analyzeProjectProto.analyzeproject.v1.IAnalyzeProjectUnaryResponse;

function createAnalyzeProjectClient(port: number) {
  const analyzeProjectMethodDefinition: grpc.MethodDefinition<
    AnalyzeProjectRequest,
    AnalyzeProjectStreamResponse
  > = {
    path: `/${SERVICE_NAME}/AnalyzeProject`,
    requestStream: false,
    responseStream: true,
    requestSerialize: value =>
      Buffer.from(
        analyzeProjectProto.analyzeproject.v1.AnalyzeProjectRequest.encode(value).finish(),
      ),
    requestDeserialize: buffer =>
      analyzeProjectProto.analyzeproject.v1.AnalyzeProjectRequest.decode(buffer),
    responseSerialize: value =>
      Buffer.from(
        analyzeProjectProto.analyzeproject.v1.AnalyzeProjectStreamResponse.encode(value).finish(),
      ),
    responseDeserialize: buffer =>
      analyzeProjectProto.analyzeproject.v1.AnalyzeProjectStreamResponse.decode(buffer),
  };

  const analyzeProjectUnaryMethodDefinition: grpc.MethodDefinition<
    AnalyzeProjectRequest,
    AnalyzeProjectUnaryResponse
  > = {
    path: `/${SERVICE_NAME}/AnalyzeProjectUnary`,
    requestStream: false,
    responseStream: false,
    requestSerialize: value =>
      Buffer.from(
        analyzeProjectProto.analyzeproject.v1.AnalyzeProjectRequest.encode(value).finish(),
      ),
    requestDeserialize: buffer =>
      analyzeProjectProto.analyzeproject.v1.AnalyzeProjectRequest.decode(buffer),
    responseSerialize: value =>
      Buffer.from(
        analyzeProjectProto.analyzeproject.v1.AnalyzeProjectUnaryResponse.encode(value).finish(),
      ),
    responseDeserialize: buffer =>
      analyzeProjectProto.analyzeproject.v1.AnalyzeProjectUnaryResponse.decode(buffer),
  };

  const serviceDefinition = {
    AnalyzeProject: analyzeProjectMethodDefinition,
    AnalyzeProjectUnary: analyzeProjectUnaryMethodDefinition,
  } as grpc.ServiceDefinition<grpc.UntypedServiceImplementation>;

  const Client = grpc.makeGenericClientConstructor(serviceDefinition, 'AnalyzeProjectService');
  const client = new Client(`127.0.0.1:${port}`, grpc.credentials.createInsecure()) as grpc.Client;

  return {
    analyzeProject: (request: AnalyzeProjectRequest) =>
      new Promise<AnalyzeProjectStreamResponse[]>((resolve, reject) => {
        const responses: AnalyzeProjectStreamResponse[] = [];
        const call = client.makeServerStreamRequest(
          analyzeProjectMethodDefinition.path,
          analyzeProjectMethodDefinition.requestSerialize,
          analyzeProjectMethodDefinition.responseDeserialize,
          request,
        );
        call.on('data', response => {
          responses.push(response);
        });
        call.on('end', () => resolve(responses));
        call.on('error', reject);
      }),
    analyzeProjectUnary: (request: AnalyzeProjectRequest) =>
      new Promise<AnalyzeProjectUnaryResponse>((resolve, reject) => {
        client.makeUnaryRequest(
          analyzeProjectUnaryMethodDefinition.path,
          analyzeProjectUnaryMethodDefinition.requestSerialize,
          analyzeProjectUnaryMethodDefinition.responseDeserialize,
          request,
          (error: grpc.ServiceError | null, response?: AnalyzeProjectUnaryResponse) => {
            if (error) {
              reject(error);
            } else {
              resolve(response!);
            }
          },
        );
      }),
    close: () => client.close(),
  };
}

async function findOpenPort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to resolve a free port'));
        return;
      }
      probe.close(error => {
        if (error) {
          reject(error);
        } else {
          resolve(address.port);
        }
      });
    });
  });
}

function createAnalyzeProjectPayload() {
  return {
    configuration: {
      baseDir: basicFixtureDir,
    },
    files: {
      [basicFixtureFile]: {
        filePath: basicFixtureFile,
        fileType: 'MAIN',
      },
    },
    rules: [
      {
        key: 'S1116',
        configurations: [],
        fileTypeTargets: ['MAIN'],
        language: 'ts',
        analysisModes: ['DEFAULT'],
      },
    ],
    bundles: [],
  };
}

type ServerMode = {
  label: string;
  createWorker: () => Promise<Worker | undefined>;
};

const serverModes: ServerMode[] = [
  {
    label: 'with worker',
    createWorker: async () =>
      createAnalyzeProjectWorker(analyzeProjectWorkerPath, { debugMemory: false }),
  },
  {
    label: 'without worker',
    createWorker: async () => undefined,
  },
];

async function withAnalyzeProjectServer(
  worker: Worker | undefined,
  run: (client: ReturnType<typeof createAnalyzeProjectClient>) => Promise<void>,
) {
  const port = await findOpenPort();
  const { server, serverClosed } = await startAnalyzeProjectServer(port, '127.0.0.1', worker);
  const client = createAnalyzeProjectClient(port);

  try {
    await run(client);
  } finally {
    if (worker) {
      await worker.terminate();
      await serverClosed;
      client.close();
    } else {
      client.close();
      await new Promise<void>((resolve, reject) => {
        server.tryShutdown(error => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }
  }
}

describe('analyze-project gRPC server', () => {
  it('should handle unary analyze-project requests', async t => {
    for (const mode of serverModes) {
      await t.test(mode.label, async () => {
        const worker = await mode.createWorker();
        await withAnalyzeProjectServer(worker, async client => {
          const response = await client.analyzeProjectUnary({
            requestJson: JSON.stringify(createAnalyzeProjectPayload()),
          });

          const parsedResponse = JSON.parse(response.responseJson ?? '{}');
          const fileResult = parsedResponse.files?.[basicFixtureFile];

          expect(fileResult).toBeDefined();
          expect(fileResult.issues.length).toBeGreaterThan(0);
        });
      });
    }
  });

  it('should stream incremental analyze-project results', async t => {
    for (const mode of serverModes) {
      await t.test(mode.label, async () => {
        const worker = await mode.createWorker();
        await withAnalyzeProjectServer(worker, async client => {
          const responses = await client.analyzeProject({
            requestJson: JSON.stringify(createAnalyzeProjectPayload()),
          });

          const parsedMessages = responses.map(response =>
            JSON.parse(response.messageJson ?? '{}'),
          );

          expect(parsedMessages.some(message => message.messageType === 'fileResult')).toBe(true);
          expect(parsedMessages.some(message => message.messageType === 'meta')).toBe(true);
        });
      });
    }
  });
});
