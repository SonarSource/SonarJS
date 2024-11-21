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
import { NodeRuleTester } from '../rule-tester.js';
import { fileURLToPath } from 'node:url';

export function BabelRuleTester() {
  return new NodeRuleTester({
    // we use babel to parse JSX syntax
    parser: fileURLToPath(import.meta.resolve('@babel/eslint-parser')),
    parserOptions: {
      ecmaVersion: 2015,
      requireConfigFile: false,
      babelOptions: {
        targets: 'defaults',
        presets: ['@babel/preset-react', '@babel/preset-flow', '@babel/preset-env'],
        plugins: [['@babel/plugin-proposal-decorators', { version: '2022-03' }]],
        babelrc: false,
        configFile: false,
        parserOpts: {
          allowReturnOutsideFunction: true,
        },
      },
    },
  });
}
