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
import { createProgramOptions } from 'services/program';

/**
 * Handles TSConfig files resolving requests
 *
 * TSConfig-based analysis either for JavaScript or TypeScript requires first
 * resolving the files to be analyzed based on provided TSConfigs. The logic
 * of the whole resolving lies in the bridge since it includes and bundles
 * TypeScript dependency, which is able to parse and analyze TSConfig files.
 */
export default function (
  request: express.Request,
  response: express.Response,
  next: express.NextFunction,
) {
  try {
    const tsconfig = request.body.tsconfig;
    const options = createProgramOptions(tsconfig);
    response.json({
      files: options.rootNames,
      projectReferences: options.projectReferences?.map(ref => ref.path) || [],
    });
  } catch (error) {
    next(error);
  }
}
