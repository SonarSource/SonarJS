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
// https://sonarsource.github.io/rspec/#/rspec/S2999/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import ts from 'typescript';
import {
  generateMeta,
  getSignatureFromCallee,
  getTypeFromTreeNode,
  isRequiredParserServices,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import { FromSchema } from 'json-schema-to-ts';
import * as meta from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    const considerJSDoc = !!(context.options as FromSchema<typeof meta.schema>)[0]?.considerJSDoc;
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    return {
      'NewExpression[callee.type!="ThisExpression"]': (node: estree.Node) => {
        const { callee } = node as estree.NewExpression;
        const type = getTypeFromTreeNode(callee, services);
        const signature = getSignatureFromCallee(node, services);
        if (!isInstantiable(type, signature, considerJSDoc) && !isAny(type)) {
          const functionToken = context.sourceCode.getFirstToken(
            node,
            token => token.type === 'Keyword' && token.value === 'function',
          );
          const newToken = context.sourceCode.getFirstToken(
            node,
            token => token.type === 'Keyword' && token.value === 'new',
          )!;
          const text = isFunction(type) ? 'this function' : context.sourceCode.getText(callee);
          const loc = callee.type === 'FunctionExpression' ? functionToken!.loc : callee.loc!;
          report(
            context,
            {
              message: `Replace ${text} with a constructor function.`,
              loc,
            },
            [toSecondaryLocation(newToken)],
          );
        }
      },
    };
  },
};

function isInstantiable(
  type: ts.Type,
  signature: ts.Signature | undefined,
  considerJSDoc: boolean,
): boolean {
  return (
    isClass(type) ||
    isModule(type) ||
    isConstructor(type, signature, considerJSDoc) ||
    (type.isUnionOrIntersection() &&
      type.types.some(tp => isInstantiable(tp, signature, considerJSDoc)))
  );
}

function isClass(type: ts.Type) {
  return (
    type.symbol &&
    ((type.symbol.flags & ts.SymbolFlags.Class) !== 0 ||
      (type.symbol.flags & ts.SymbolFlags.Type) !== 0)
  );
}

function isModule(type: ts.Type) {
  return type.symbol && (type.symbol.flags & ts.SymbolFlags.Module) !== 0;
}

function isFunction(type: ts.Type) {
  return type.symbol && (type.symbol.flags & ts.SymbolFlags.Function) !== 0;
}

function isConstructor(type: ts.Type, signature: ts.Signature | undefined, considerJSDoc: boolean) {
  return isFunction(type) && (!considerJSDoc || hasJSDocAnnotation(signature));
}

function hasJSDocAnnotation(signature: ts.Signature | undefined) {
  return signature?.getJsDocTags().some(tag => ['constructor', 'class'].includes(tag.name));
}

function isAny(type: ts.Type) {
  return type.flags === ts.TypeFlags.Any;
}
