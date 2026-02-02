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
// https://sonarsource.github.io/rspec/#/rspec/S2077/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta, getFullyQualifiedName, isMemberWithProperty } from '../helpers/index.js';
import * as meta from './generated-meta.js';

const sqlQuerySignatures = [
  'pg.Client.query',
  'pg.Pool.query',
  'mysql.createConnection.query',
  'mysql.createPool.query',
  'mysql.createPoolCluster.query',
  'mysql2.createConnection.query',
  'mysql2.createPool.query',
  'mysql2.createPoolCluster.query',
  'sequelize.Sequelize.query', // Sequelize is typically destructured: const { Sequelize } = require('sequelize')
  'sqlite3.Database.run',
  'sqlite3.Database.get',
  'sqlite3.Database.all',
  'sqlite3.Database.each',
  'sqlite3.Database.exec',
  'better-sqlite3.exec',
  'better-sqlite3.prepare',
];

type Argument = estree.Expression | estree.SpreadElement;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      safeQuery: `Make sure that executing SQL queries is safe here.`,
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      CallExpression(node: estree.CallExpression) {
        const fqn = getFullyQualifiedName(context, node);
        if (fqn && sqlQuerySignatures.includes(fqn) && isQuestionable(node.arguments[0])) {
          context.report({
            messageId: 'safeQuery',
            node: node.callee,
          });
        }
      },
    };
  },
};

function isQuestionable(sqlQuery: Argument | undefined) {
  if (!sqlQuery) {
    return false;
  }
  if (isTemplateWithVar(sqlQuery)) {
    return true;
  }
  if (isConcatenation(sqlQuery)) {
    return isVariableConcat(sqlQuery);
  }
  return (
    sqlQuery.type === 'CallExpression' && isMemberWithProperty(sqlQuery.callee, 'concat', 'replace')
  );
}

function isVariableConcat(node: estree.BinaryExpression): boolean {
  const { left, right } = node;
  if (!isHardcodedLiteral(right)) {
    return true;
  }
  if (isConcatenation(left)) {
    return isVariableConcat(left);
  }
  return !isHardcodedLiteral(left);
}

function isTemplateWithVar(node: estree.Node) {
  return node.type === 'TemplateLiteral' && node.expressions.length !== 0;
}

function isTemplateWithoutVar(node: estree.Node) {
  return node.type === 'TemplateLiteral' && node.expressions.length === 0;
}

function isConcatenation(node: estree.Node): node is estree.BinaryExpression {
  return node.type === 'BinaryExpression' && node.operator === '+';
}

function isHardcodedLiteral(node: estree.Node) {
  return node.type === 'Literal' || isTemplateWithoutVar(node);
}
