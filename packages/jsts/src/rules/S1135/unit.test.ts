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
import { DefaultParserRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S1135', () => {
  it('S1135', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('Track uses of TODO tags', rule, {
      valid: [
        {
          code: `// Just a regular comment`,
        },
        {
          code: `
        // This is not aTODO comment

        // notatodo comment

        // a todolist

        // método
        `,
        },
        {
          code: '// todos',
        },
        {
          code: '// todos ',
        },
        {
          code: `
        /* eslint-disable-next-line sonarjs/todo-tag */
        // TODO whatever
        `,
        },
      ],
      invalid: [
        {
          code: `// TODO`,
          errors: [
            {
              message: 'Complete the task associated to this "TODO" comment.',
              line: 1,
              endLine: 1,
              column: 4,
              endColumn: 8,
            },
          ],
        },

        {
          code: `/*TODO Multiline comment 
      TODO: another todo
      (this line is not highlighted)
      with three todo
      */`,
          errors: [
            {
              message: 'Complete the task associated to this "TODO" comment.',
              line: 1,
              endLine: 1,
              column: 3,
              endColumn: 7,
            },
            {
              message: 'Complete the task associated to this "TODO" comment.',
              line: 2,
              endLine: 2,
              column: 7,
              endColumn: 11,
            },
            {
              message: 'Complete the task associated to this "TODO" comment.',
              line: 4,
              endLine: 4,
              column: 18,
              endColumn: 22,
            },
          ],
        },
        {
          code: `// TODO  TODO`,
          errors: 1,
        },
        {
          code: `
      // TODO just do it

      // Todo just do it

      //todo comment

      // This is a TODO just do it

      // todo: things to do

      // :TODO: things to do

      // valid end of line todo

      /*
        TODO Multiline comment 
      */

      /*
        TODO Multiline comment 

        with two todo
      */

      // valid end of file TODO
        `,
          errors: 11,
        },
      ],
    });
  });
});
