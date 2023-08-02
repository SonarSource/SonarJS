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
import { Rule } from 'eslint';
import { AST } from 'regexpp';
import { createRegExpRule } from '@sonar/jsts/rules/helpers/regex';
import { JavaScriptRuleTester } from '../../../../../tools';

const rule: Rule.RuleModule = createRegExpRule(context => {
  return {
    onCharacterEnter(character: AST.Character) {
      if (character.value === 'a'.charCodeAt(0)) {
        context.reportRegExpNode({
          message: `Found character 'a'.`,
          node: context.node,
          regexpNode: character,
        });
      }
    },
  };
});

const ruleTester = new JavaScriptRuleTester();
ruleTester.run('Template for regular expressions rules', rule, {
  valid: [
    {
      code: `const str = 'abc123';`,
    },
    {
      code: `const re = RegExpression();`,
    },
    {
      code: `const re = RegExp();`,
    },
    {
      code: `const re = new RegExp();`,
    },
    {
      code: `const re = new RegExp(pattern);`,
    },
    {
      code: `const re = new RegExp(pattern, flags);`,
    },
    {
      code: `const re = /z/;`,
    },
    {
      code: `const re = new RegExp('z');`,
    },
    {
      code: `const re = new RegExp(42);`,
    },
    {
      code: `const re = new RegExp('[malformed');`,
    },
    {
      code: `        
        let pattern = 'a';
        pattern = 'b';
        const re = new RegExp(pattern);
      `,
    },
    {
      code: `const re = RegExp(\`a \${pattern}\`);`,
    },
    {
      // FN
      code: `
        const pattern = 'a';
        const re = RegExp(\`b \${pattern}\`);`,
    },
    {
      code: `const re = RegExp('42' - '24');`,
    },
    {
      // should work for 'recursive' reassignments
      code: `
      let regex;
      if (isString(regex)) {
        regex = new RegExp('^' + regex + '$');
      }`,
    },
  ],
  invalid: [
    {
      code: `
        const re = /a/u;
                 // ^
      `,
      errors: [
        {
          message: `Found character 'a'.`,
          line: 2,
          column: 21,
          endLine: 2,
          endColumn: 22,
        },
      ],
    },
    {
      code: `const re = RegExp('ab');`,
      errors: [
        {
          message: `Found character 'a'.`,
          line: 1,
          column: 20,
          endLine: 1,
          endColumn: 21,
        },
      ],
    },
    {
      code: `const re = new RegExp('a');`,
      errors: [
        {
          message: `Found character 'a'.`,
          line: 1,
          column: 24,
          endLine: 1,
          endColumn: 25,
        },
      ],
    },
    {
      code: `const re = new RegExp('\u0061', 'u');`,
      errors: 1,
    },
    {
      code: `const re = RegExp(\`a\`);`,
      errors: 1,
    },
    {
      code: `
        const pattern = 'a';
        const re = new RegExp(pattern);
        //                    ^^^^^^^
        `,
      errors: [
        {
          line: 3,
          column: 31,
          endColumn: 38,
        },
      ],
    },
    {
      code: `
        const re = new RegExp(('a' + 'c') + 'b');
                           // ^^^^^^^^^^^^^^^^^
      `,

      errors: [
        {
          line: 2,
          column: 31,
          endColumn: 48,
        },
      ],
    },
    {
      code: `
        const pattern = 'a';
        const re = new RegExp('c' + pattern + 'b');`,
      errors: 1,
    },
    {
      code: `
        'str'.match('a');
        'str'.matchAll('a');
        'str'.search('a');
      `,
      errors: 3,
    },
    {
      // test we are reporting only once
      code: `
        const pattern = 'a';
        const regexPattern = /a/;
        'str'.search(pattern);
        'str'.search('a');
        'str'.search(/a/);
        'str'.search(regexPattern); // we should not report here, as we are reporting on regex literal
        'str'.search(new RegExp(pattern));
      `,
      errors: [{ line: 3 }, { line: 4 }, { line: 5 }, { line: 6 }, { line: 8 }],
    },
    {
      code: `RegExp('//a')`,
      errors: 1,
    },
  ],
});
