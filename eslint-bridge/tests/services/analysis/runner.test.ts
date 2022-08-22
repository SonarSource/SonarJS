/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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

import express from 'express';
import { AnalysisErrorCode, AnalysisOutput, runner } from 'services/analysis';
import { LinterError } from 'linting/eslint';

describe('runner', () => {
  it('should run an analysis', async () => {
    const mockRequest = () => ({ body: 'done' } as express.Request);
    const mockResponse = () => ({ json: jest.fn() } as any as express.Response);

    const analysis = input => Promise.resolve(input.toUpperCase() as AnalysisOutput);

    const request = mockRequest();
    const response = mockResponse();

    const handler = runner(analysis) as (
      request: express.Request,
      response: express.Response,
    ) => Promise<void>;
    await handler(request, response);

    expect(response.json).toHaveBeenCalledWith('DONE');
  });

  it('should catch an analysis failure', async () => {
    console.error = jest.fn();

    const mockRequest = () => ({ body: {} } as express.Request);
    const mockResponse = () => ({ json: jest.fn() } as any as express.Response);

    const analysis = _ => Promise.reject({ message: 'failed', stack: 'some stack trace' });

    const request = mockRequest();
    const response = mockResponse();

    const handler = runner(analysis) as (
      request: express.Request,
      response: express.Response,
    ) => Promise<void>;
    await handler(request, response);

    expect(console.error).toHaveBeenCalledWith('some stack trace');
    expect(response.json).toHaveBeenCalledWith({
      parsingError: {
        code: AnalysisErrorCode.GeneralError,
        message: 'failed',
      },
    });
  });

  it('should catch a linter failure', async () => {
    const errorLogger = jest.fn();
    const jsonSerializer = jest.fn();

    const error = new LinterError('Linter is undefined. Did you call /init-linter?');
    const handler = runner(() => Promise.reject(error)) as (request, response) => Promise<void>;

    console.error = errorLogger;
    await handler({ body: {} }, { json: jsonSerializer });

    expect(errorLogger).toHaveBeenCalledWith(error.stack);
    expect(jsonSerializer).toHaveBeenCalledWith({
      parsingError: {
        code: AnalysisErrorCode.LinterInitialization,
        message: 'Linter is undefined. Did you call /init-linter?',
      },
    });
  });
});
