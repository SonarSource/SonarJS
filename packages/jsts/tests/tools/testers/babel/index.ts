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
import { RuleTester } from '../rule-tester.js';
import parser from '@babel/eslint-parser';

export function BabelRuleTester() {
  return new RuleTester({
    // we use babel to parse JSX syntax
    languageOptions: {
      parser,
      parserOptions: {
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
      ecmaVersion: 2015,
    },
  });
}
