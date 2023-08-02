/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { AnalysisOutput } from '@sonar/shared/types';
import { runner } from '@sonar/bridge/router/runner';

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

  it('should forward the caught runtime error to the next middleware', async () => {
    const mockRequest = () => ({ body: 'whatever' } as express.Request);
    const mockResponse = () =>
      ({
        json: () => {
          throw 'Something went wrong';
        },
      } as any as express.Response);

    const analysis = input => Promise.resolve(input as AnalysisOutput);

    const request = mockRequest();
    const response = mockResponse();
    const next = jest.fn();

    const handler = runner(analysis) as (
      request: express.Request,
      response: express.Response,
      next: express.NextFunction,
    ) => Promise<void>;
    await handler(request, response, next);

    expect(next).toHaveBeenCalledWith('Something went wrong');
  });
});
