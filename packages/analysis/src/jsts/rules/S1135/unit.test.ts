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
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { rule } from './rule.js';
import { describe, it } from 'node:test';

describe('S1135', () => {
  it('S1135', () => {
    const ruleTester = new DefaultParserRuleTester();
    ruleTester.run('todo-tag', rule, {
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
        // Todo el mundo

        // No puedo saber. Todo el mundo...

        // esta todo bien

        // Todo just do it

        /*
          Todo em um comentario de bloco

          esta todo bem
        */
        `,
        },
        {
          code: `
        /* eslint-disable-next-line rule-to-test/todo-tag */
        // TODO whatever
        `,
        },
        {
          code: `// TODO JS-1234 remove this later`,
        },
        {
          code: `// ToDo(JS-1234): remove this later`,
        },
        {
          code: `/* TODO APPSEC-42 remove this later */`,
        },
        {
          code: `// Temporary fix. (TODO PROJ-123 improve method)`,
        },
        {
          code: `// TODO fix this. See PROJ-123.`,
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
          ],
        },
        {
          code: `// TODO  TODO`,
          errors: 1,
        },
        {
          code: `// TODO task-123 remove this later`,
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
          code: `// todo comment`,
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
          code: `// todo: things to do`,
          errors: 1,
        },
        {
          code: `// No puedo saber. todo el mundo...`,
          errors: 1,
        },
        {
          code: `// esta Todo bien`,
          errors: 1,
        },
        {
          code: `// ToDo just do it`,
          errors: 1,
        },
        {
          code: `// Todo el mundo. TODO fix this later`,
          errors: [
            {
              message: 'Complete the task associated to this "TODO" comment.',
              line: 1,
              endLine: 1,
              column: 19,
              endColumn: 23,
            },
          ],
        },
        {
          code: `
      // TODO just do it

      // This is a TODO just do it

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
          errors: 6,
        },
      ],
    });
  });
});
