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
import {
  generateMeta,
  isLogicalExpression,
  isStringLiteral,
  shannonEntropy,
} from '../helpers/index.js';
import path from 'node:path';
import type { FromSchema } from 'json-schema-to-ts';
import * as meta from './generated-meta.js';

const DEFAULT_NAMES = ['password', 'pwd', 'passwd', 'passphrase'];
const ENTROPY_THRESHOLD = 3;
const MIN_PASSWORD_LENGTH = 5;
const NON_CREDENTIAL_CHARS = /[\s/["'\]<>]/;
const TEST_FILE_PATTERN = /\.(spec|test|mock)\.[jt]sx?$/;

const messages = {
  reviewPassword: 'Review this potentially hard-coded password.',
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    const filename = context.physicalFilename;
    if (TEST_FILE_PATTERN.test(filename)) {
      return {};
    }

    const dir = path.dirname(filename);
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
        const value = extractDefaultOperatorIfNeeded(assignment);
        checkAssignment(context, lowerCaseVariableNames, assignment.left, value);
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

function extractDefaultOperatorIfNeeded(node: estree.AssignmentExpression): estree.Node {
  if (
    isLogicalExpression(node.right as TSESTree.Node) &&
    ['??', '||'].includes((node.right as estree.LogicalExpression).operator)
  ) {
    return (node.right as estree.LogicalExpression).right;
  }
  return node.right;
}

function checkAssignment(
  context: Rule.RuleContext,
  patterns: string[],
  variable: estree.Node,
  initializer?: estree.Node | null,
) {
  if (
    initializer &&
    patterns.some(pattern =>
      context.sourceCode.getText(variable).toLowerCase().includes(pattern),
    ) &&
    findValueSuspect(initializer)
  ) {
    context.report({
      messageId: 'reviewPassword',
      node: initializer,
    });
  }
}

function findValueSuspect(node: estree.Node | undefined | null): boolean {
  if (!node) {
    return false;
  }
  if (isStringLiteral(node)) {
    const value = node.value as string;
    return (
      value.length >= MIN_PASSWORD_LENGTH &&
      !NON_CREDENTIAL_CHARS.test(value) &&
      hasHighEntropy(value)
    );
  }
  if (node.type === 'ConditionalExpression') {
    return findValueSuspect(node.consequent) || findValueSuspect(node.alternate);
  }
  return false;
}

function checkLiteral(context: Rule.RuleContext, patterns: RegExp[], literal: estree.Literal) {
  if (isStringLiteral(literal)) {
    const value = literal.value as string;
    const lowerValue = value.toLowerCase();
    for (const pattern of patterns) {
      const match = pattern.exec(lowerValue);
      if (match) {
        const eqIndex = value.indexOf('=', match.index);
        if (eqIndex !== -1) {
          const passwordPart = value.substring(eqIndex + 1);
          const nextSep = findNextSeparator(passwordPart);
          const passwordValue = nextSep === -1 ? passwordPart : passwordPart.substring(0, nextSep);
          if (passwordValue.length >= MIN_PASSWORD_LENGTH && hasHighEntropy(passwordValue)) {
            context.report({
              messageId: 'reviewPassword',
              node: literal,
            });
            return;
          }
        }
      }
    }
  }
}

function findNextSeparator(str: string): number {
  const separators = ['&', ' ', ';'];
  let minIndex = -1;
  for (const sep of separators) {
    const idx = str.indexOf(sep);
    if (idx !== -1 && (minIndex === -1 || idx < minIndex)) {
      minIndex = idx;
    }
  }
  return minIndex;
}

function hasHighEntropy(value: string): boolean {
  return shannonEntropy(value) > ENTROPY_THRESHOLD;
}
