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
import path from 'node:path';
import ts from 'typescript';
import fs from 'node:fs';
import { writeMessagesToDir } from './generate-proto-file';
import { writeJavaClassesToDir } from './generate-java-ast';
import { getEstreeNodes } from './get-estree-nodes';

const TYPES_PATH = path.join('..', '..', 'node_modules', '@types', 'estree', 'index.d.ts');
const file = ts.createSourceFile(
  TYPES_PATH,
  fs.readFileSync(TYPES_PATH, 'utf-8'),
  ts.ScriptTarget.ESNext,
);

const nodes = getEstreeNodes(file);

const arg = process.argv[2];
const output = 'output';

fs.mkdirSync(output, { recursive: true });
if (arg === 'proto') {
  writeMessagesToDir(nodes, output);
} else if (arg === 'java') {
  writeJavaClassesToDir(nodes, output);
} else {
  console.error('Error: Argument should be "proto" or "java"');
  process.exit(1); // Exit with a failure code
}
