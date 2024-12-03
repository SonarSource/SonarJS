/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// typedoc looks for plugins in node_modules/, therefore we create a symlink to this folder in node_modules/

import fs from 'fs';
import path from 'path';
import url from 'url';

// Directory name of the current module
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const linkPath = path.join(__dirname, '..', '..', 'node_modules', 'searchable-parameters-plugin');
const targetPath = path.join(__dirname);

if (!fs.existsSync(linkPath)) {
  fs.symlinkSync(targetPath, linkPath);
}
