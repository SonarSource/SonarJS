/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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
import { Server } from "http";
import * as express from "express";
import * as bodyParser from "body-parser";
import { AnalysisInput, analyze } from "./analyzer";
import { AddressInfo } from "net";

export function start(port = 0): Promise<Server> {
  return new Promise(resolve => {
    console.log("DEBUG starting eslint-bridge server at port", port);
    const app = express();

    // for parsing application/json requests
    app.use(bodyParser.json({ limit: "50mb" }));

    app.post("/analyze", (request: express.Request, response: express.Response) => {
      const parsedRequest = request.body as AnalysisInput;
      const issues = analyze(parsedRequest);
      response.json(issues);
    });

    const server = app.listen(port, () => {
      console.log(
        "DEBUG eslint-bridge server is running at port",
        (server.address() as AddressInfo).port,
      );
      resolve(server);
    });
  });
}
