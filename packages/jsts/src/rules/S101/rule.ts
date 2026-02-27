/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
// https://sonarsource.github.io/rspec/#/rspec/S101/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta } from '../helpers/index.js';
import type { FromSchema } from 'json-schema-to-ts';
import * as meta from './generated-meta.js';

type ClassOrInterfaceDeclaration = TSESTree.ClassDeclaration | TSESTree.TSInterfaceDeclaration;

const DEFAULT_FORMAT = '^\\$?[A-Z][a-zA-Z0-9]*$';
const messages = {
  renameClass: 'Rename {{symbolType}} "{{symbol}}" to match the regular expression {{format}}.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    return {
      ClassDeclaration: (node: estree.Node) =>
        checkName(node as ClassOrInterfaceDeclaration, 'class', context),
      TSInterfaceDeclaration: (node: estree.Node) =>
        checkName(node as ClassOrInterfaceDeclaration, 'interface', context),
    };
  },
};

function checkName(
  node: ClassOrInterfaceDeclaration,
  declarationType: string,
  context: Rule.RuleContext,
) {
  const format = (context.options as FromSchema<typeof meta.schema>)[0]?.format ?? DEFAULT_FORMAT;
  if (node.id) {
    const name = node.id.name;
    if (!name.match(format)) {
      context.report({
        messageId: 'renameClass',
        data: {
          symbol: name,
          symbolType: declarationType,
          format,
        },
        node: node.id,
      });
    }
  }
}
