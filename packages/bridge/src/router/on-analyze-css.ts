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
import { worker } from '../server';

/**
 * Handles CSS analysis requests
 */
export default async (
  request: express.Request,
  response: express.Response,
  next: express.NextFunction,
) => {
  worker.once('message', msg => {
    switch (msg.type) {
      case 'success':
        response.json(msg.result);
        break;
      case 'failure':
        next(msg.error);
        break;
    }
  });
  worker.postMessage({ type: 'on-analyze-css', data: request.body });
};
