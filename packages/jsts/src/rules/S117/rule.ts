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
// https://sonarsource.github.io/rspec/#/rspec/S117/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import { resolveIdentifiers } from '../helpers';

interface FunctionLike {
  declare?: boolean;
  params: TSESTree.Parameter[];
}

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      renameSymbol: `Rename this {{symbolType}} "{{symbol}}" to match the regular expression {{format}}.`,
    },
  },
  create(context: Rule.RuleContext) {
    return {
      VariableDeclaration: (node: estree.Node) =>
        checkVariable(node as TSESTree.VariableDeclaration, context),
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression, TSDeclareFunction, TSMethodSignature, TSConstructSignatureDeclaration, TSEmptyBodyFunctionExpression':
        (node: estree.Node) => checkFunction(node as TSESTree.Node as FunctionLike, context),
      PropertyDefinition: (node: estree.Node) =>
        checkProperty(node as unknown as TSESTree.PropertyDefinition, context),
      CatchClause: (node: estree.Node) => checkCatch(node as TSESTree.CatchClause, context),
    };
  },
};

function checkVariable(decl: TSESTree.VariableDeclaration, context: Rule.RuleContext) {
  if (decl.declare) {
    return;
  }
  decl.declarations.forEach(declaration =>
    resolveIdentifiers(declaration.id).forEach(id =>
      raiseOnInvalidIdentifier(id, 'local variable', context),
    ),
  );
}

function checkFunction(func: FunctionLike, context: Rule.RuleContext) {
  if (func.declare) {
    return;
  }
  func.params.forEach(param =>
    resolveIdentifiers(param).forEach(id => raiseOnInvalidIdentifier(id, 'parameter', context)),
  );
}

function checkProperty(prop: TSESTree.PropertyDefinition, context: Rule.RuleContext) {
  if (prop.key.type === 'Identifier') {
    raiseOnInvalidIdentifier(prop.key, 'property', context);
  }
}

function checkCatch(catchh: TSESTree.CatchClause, context: Rule.RuleContext) {
  if (catchh.param) {
    resolveIdentifiers(catchh.param).forEach(id =>
      raiseOnInvalidIdentifier(id, 'parameter', context),
    );
  }
}

function raiseOnInvalidIdentifier(
  id: TSESTree.Identifier,
  idType: string,
  context: Rule.RuleContext,
) {
  const [{ format }] = context.options;
  const { name } = id;
  if (!name.match(format)) {
    context.report({
      messageId: 'renameSymbol',
      data: {
        symbol: name,
        symbolType: idType,
        format,
      },
      node: id,
    });
  }
}
