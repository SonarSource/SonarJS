/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { FunctionInfo, Parameter } from '../ir-gen/ir_pb';
import { TSESTree } from '@typescript-eslint/utils';
import { ScopeTranslator } from './scope-translator';
import { handleStatement } from './statements';

export function translateTopLevel(
  context: Rule.RuleContext,
  node: TSESTree.Program,
): [FunctionInfo, Set<string>] | null {
  const scopeTranslator = new ScopeTranslator(context, node);
  node.body.forEach(param => {
    if (param.type === TSESTree.AST_NODE_TYPES.FunctionDeclaration) {
      // skip function declarations
      return;
    }
    handleStatement(scopeTranslator, param);
  });
  if (scopeTranslator.isEmpty()) {
    return null;
  }
  return [scopeTranslator.finish(), scopeTranslator.methodCalls];
}

export function translateMethod(
  context: Rule.RuleContext,
  node: TSESTree.FunctionDeclaration,
): [FunctionInfo, Set<string>] {
  const scopeTranslator = new ScopeTranslator(context, node);

  node.params.forEach(param => {
    if (param.type !== 'Identifier') {
      throw new Error(`Unknown method parameter type ${param.type}`);
    }
    const valueId = scopeTranslator.getNewValueId();
    scopeTranslator.valueTable.parameters.push(new Parameter({ valueId, name: param.name }));
    scopeTranslator.variableMap.set(param.name, valueId);
  });

  node.body.body.forEach(statement => handleStatement(scopeTranslator, statement), scopeTranslator);
  return [scopeTranslator.finish(), scopeTranslator.methodCalls];
}
