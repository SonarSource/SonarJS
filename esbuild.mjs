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
import { buildBundle } from './esbuild-common.mjs';

await buildBundle({
  entryPoint: './server.mjs',
  outfile: './bin/server.cjs',
  additionalAssets: [
    // We copy run-node into the bundle, as it's used from the java side on Mac
    {
      from: ['./run-node'],
      to: ['./bin/'],
    },
  ],
});
