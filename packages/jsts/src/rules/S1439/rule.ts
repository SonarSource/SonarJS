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
// https://sonarsource.github.io/rspec/#/rspec/S1439/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      removeLabel: 'Remove this "{{label}}" label.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      LabeledStatement: (node: estree.Node) =>
        checkLabeledStatement(node as estree.LabeledStatement, context),
    };
  },
};

function checkLabeledStatement(node: estree.LabeledStatement, context: Rule.RuleContext) {
  if (!isLoopStatement(node.body) && !isSwitchStatement(node.body)) {
    context.report({
      messageId: 'removeLabel',
      data: {
        label: node.label.name,
      },
      node: node.label,
    });
  }
}

function isLoopStatement(node: estree.Node) {
  return (
    node.type === 'WhileStatement' ||
    node.type === 'DoWhileStatement' ||
    node.type === 'ForStatement' ||
    node.type === 'ForOfStatement' ||
    node.type === 'ForInStatement'
  );
}

function isSwitchStatement(node: estree.Node) {
  return node.type === 'SwitchStatement';
}
