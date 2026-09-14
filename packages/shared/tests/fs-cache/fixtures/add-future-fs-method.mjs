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
import fs from 'node:fs';

Object.defineProperty(fs, 'futureRead', {
  configurable: true,
  enumerable: true,
  value: () => 'unexpected native result',
  writable: true,
});
Object.defineProperty(fs.promises, 'futureRead', {
  configurable: true,
  enumerable: true,
  value: async () => 'unexpected native result',
  writable: true,
});
