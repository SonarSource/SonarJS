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
import { Analysis } from 'services/analysis';
import { readFile } from 'helpers';

/**
 * Runs an analysis
 *
 * This function is a generic analyzer used for any kind of analysis request,
 * be it a YAML, CSS, JavaScrip or TypeScript analysis request. The point is
 * to centralize the extraction of the analysis input, executes the concrete
 * analysis function, and either return the analysis output or forward back
 * any analysis error to the requester.
 *
 * @param analysis the analysis function to run
 */
export function runner(analysis: Analysis): express.RequestHandler {
  return async (
    request: express.Request,
    response: express.Response,
    next: express.NextFunction,
  ) => {
    try {
      const input = request.body;
      if (input.filePath && !input.fileContent) {
        input.fileContent = await readFile(input.filePath);
      }
      const output = await analysis(input);
      response.json(output);
    } catch (error) {
      next(error);
    }
  };
}
