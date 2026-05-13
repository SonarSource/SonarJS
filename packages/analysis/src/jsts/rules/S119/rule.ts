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
// https://sonarsource.github.io/rspec/#/rspec/S119/javascript

import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta } from '../helpers/generate-meta.js';
import type { FromSchema } from 'json-schema-to-ts';
import * as meta from './generated-meta.js';
import { DEFAULT_FORMAT } from './config.js';

const messages = {
  invalidFormat: 'The regular expression {{format}} is invalid.',
  renameTypeParameter:
    'Rename this type parameter name to match the regular expression {{format}}.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    const format = (context.options as FromSchema<typeof meta.schema>)[0]?.format ?? DEFAULT_FORMAT;
    let regexp: RegExp;

    try {
      regexp = new RegExp(format);
    } catch {
      return {
        Program: node => {
          context.report({
            messageId: 'invalidFormat',
            data: {
              format,
            },
            node,
          });
        },
      };
    }

    return {
      TSTypeParameter: (node: unknown) => {
        // Safe: ESLint invokes this visitor only for TSTypeParameter nodes.
        const typeParameter = node as TSESTree.TSTypeParameter;
        checkIdentifier(typeParameter.name, format, regexp, context);
      },
      TSMappedType: (node: unknown) => {
        // Safe: ESLint invokes this visitor only for TSMappedType nodes.
        const mappedType = node as TSESTree.TSMappedType;
        checkIdentifier(mappedType.key, format, regexp, context);
      },
    };
  },
};

function checkIdentifier(
  identifier: TSESTree.Identifier,
  format: string,
  regexp: RegExp,
  context: Rule.RuleContext,
) {
  const { name } = identifier;

  if (!regexp.test(name)) {
    context.report({
      messageId: 'renameTypeParameter',
      data: {
        format,
      },
      node: identifier,
    });
  }
}
