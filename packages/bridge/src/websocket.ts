/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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

import type { Request, Response, NextFunction } from 'express';
import type { Server } from 'ws';

export function wsMiddleware(wss: Server) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.headers.upgrade) {
      if (req.headers.upgrade.toLowerCase() === 'websocket' && req.url === '/ws') {
        wss.handleUpgrade(req, req.socket, Buffer.alloc(0), ws => {
          wss.emit('connection', ws, req);
        });
      }
      // else {
      //   _res.status(505).set('Connection', 'close').send('HTTP Version Not Supported');
      // }
    } else {
      next();
    }
  };
}
