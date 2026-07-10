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
import type { Rule } from 'eslint';
import { describe } from 'node:test';
import { NoTypeCheckingRuleTester } from '../../tools/testers/rule-tester.js';
import { getRuntimeImportDeclarations } from '../../../../src/jsts/rules/helpers/module.js';

const reportRuntimeImports: Rule.RuleModule = {
  meta: {
    messages: {
      runtimeImport: 'Runtime import from {{moduleName}}',
    },
    schema: [],
  },
  create(context) {
    return {
      Program(node) {
        for (const declaration of getRuntimeImportDeclarations(context)) {
          context.report({
            node,
            messageId: 'runtimeImport',
            data: {
              moduleName: String(declaration.source.value),
            },
          });
        }
      },
    };
  },
};

describe('module', () => {
  const ruleTester = new NoTypeCheckingRuleTester();
  ruleTester.run('getRuntimeImportDeclarations', reportRuntimeImports, {
    valid: [
      {
        code: `import type { TypeOnly } from 'type-only';`,
      },
      {
        code: `import { type TypeOnly } from 'type-specifier-only';`,
      },
    ],
    invalid: [
      {
        code: `import value from 'value-import';`,
        errors: [{ message: 'Runtime import from value-import' }],
      },
      {
        code: `import { type TypeOnly, value } from 'mixed-import';`,
        errors: [{ message: 'Runtime import from mixed-import' }],
      },
      {
        code: `import 'side-effect-import';`,
        errors: [{ message: 'Runtime import from side-effect-import' }],
      },
    ],
  });
});
