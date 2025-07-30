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

import { resolve } from 'node:path/posix';
import { createNewRule } from './create-rule-boilerplate.js';
import { readFile } from 'fs/promises';

type PluginConfig = {
  name: string;
  prefix: string;
  rulesImport: string;
  languages: ('js' | 'ts')[];
  scope: 'Main' | 'Tests';
  rules: string[];
};

// Get the JSON path from command-line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(`Usage: tsx ${process.argv[1]} <path-to-json>`);
  process.exit(1);
}
const jsonPath = resolve(args[0]);

// Read and parse the JSON file
const fileContent = await readFile(jsonPath, 'utf-8');
const config: PluginConfig = JSON.parse(fileContent);

function stringToFiveDigitNumber(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  // Map hash to 10000–99999
  return Math.abs(hash % 90000) + 10000;
}

// Helper to run all rule creations in parallel
async function processRules() {
  for (const rule of config.rules) {
    await createNewRule(
      `S${stringToFiveDigitNumber(config.prefix + rule)}`, // sonarKey
      rule,
      'external',
      config.languages,
      config.scope,
      false,
      {
        ...config,
      },
    );
  }
}

processRules().catch(console.error);
