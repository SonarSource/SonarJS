/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S117/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, resolveIdentifiers } from '../helpers/index.js';
import { FromSchema } from 'json-schema-to-ts';
import * as meta from './generated-meta.js';

interface FunctionLike {
  declare?: boolean;
  params: TSESTree.Parameter[];
}

const CAMEL_CASED = '^[_$A-Za-z][$A-Za-z0-9]*$';
const UPPER_CASED = '^[_$A-Z][_$A-Z0-9]+$';
const DEFAULT_FORMAT = `${CAMEL_CASED}|${UPPER_CASED}`;

const messages = {
  renameSymbol: `Rename this {{symbolType}} "{{symbol}}" to match the regular expression {{format}}.`,
};

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
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
  const format = (context.options as FromSchema<typeof meta.schema>)[0]?.format ?? DEFAULT_FORMAT;
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
