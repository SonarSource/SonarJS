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
// https://sonarsource.github.io/rspec/#/rspec/S2068/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, isStringLiteral } from '../helpers/index.js';
import path from 'node:path';
import type { FromSchema } from 'json-schema-to-ts';
import * as meta from './generated-meta.js';

const DEFAULT_NAMES = ['password', 'pwd', 'passwd', 'passphrase'];

const messages = {
  reviewPassword: 'Review this potentially hard-coded password.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    const dir = path.dirname(context.physicalFilename);
    const parts = dir.split(path.sep).map(part => part.toLowerCase());
    if (parts.includes('l10n')) {
      return {};
    }

    const variableNames =
      (context.options as FromSchema<typeof meta.schema>)[0]?.passwordWords ?? DEFAULT_NAMES;
    const lowerCaseVariableNames = variableNames.map(name => name.toLowerCase());
    const literalRegExp = lowerCaseVariableNames.map(name => new RegExp(`${name}=.+`));
    return {
      VariableDeclarator: (node: estree.Node) => {
        const declaration = node as estree.VariableDeclarator;
        checkAssignment(context, lowerCaseVariableNames, declaration.id, declaration.init);
      },
      AssignmentExpression: (node: estree.Node) => {
        const assignment = node as estree.AssignmentExpression;
        checkAssignment(context, lowerCaseVariableNames, assignment.left, assignment.right);
      },
      Property: (node: estree.Node) => {
        const property = node as estree.Property;
        checkAssignment(context, lowerCaseVariableNames, property.key, property.value);
      },
      Literal: (node: estree.Node) => {
        const literal = node as estree.Literal;
        checkLiteral(context, literalRegExp, literal);
      },
      PropertyDefinition: (node: estree.Node) => {
        const property = node as TSESTree.PropertyDefinition;
        checkAssignment(
          context,
          lowerCaseVariableNames,
          property.key as estree.Node,
          property.value as estree.Node,
        );
      },
    };
  },
};

function checkAssignment(
  context: Rule.RuleContext,
  patterns: string[],
  variable: estree.Node,
  initializer?: estree.Node | null,
) {
  if (
    initializer &&
    isStringLiteral(initializer) &&
    (initializer.value as string).length > 0 &&
    patterns.some(pattern => context.sourceCode.getText(variable).toLowerCase().includes(pattern))
  ) {
    context.report({
      messageId: 'reviewPassword',
      node: initializer,
    });
  }
}

function checkLiteral(context: Rule.RuleContext, patterns: RegExp[], literal: estree.Literal) {
  if (
    isStringLiteral(literal) &&
    patterns.some(pattern => pattern.test((literal.value as string).toLowerCase()))
  ) {
    context.report({
      messageId: 'reviewPassword',
      node: literal,
    });
  }
}
