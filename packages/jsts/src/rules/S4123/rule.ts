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
// https://sonarsource.github.io/rspec/#/rspec/S4123/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import ts from 'typescript';
import {
  generateMeta,
  getSignatureFromCallee,
  getTypeFromTreeNode,
  isRequiredParserServices,
} from '../helpers/index.js';
import type { ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      refactorAwait: "Refactor this redundant 'await' on a non-promise.",
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (isRequiredParserServices(services)) {
      return {
        AwaitExpression: (node: estree.AwaitExpression) => {
          const awaitedType = getTypeFromTreeNode(node.argument, services);
          if (
            !isException(node, services) &&
            !isThenable(awaitedType) &&
            !isAny(awaitedType) &&
            !isUnknown(awaitedType) &&
            !isUnion(awaitedType)
          ) {
            context.report({
              messageId: 'refactorAwait',
              node,
            });
          }
        },
      };
    }
    return {};
  },
};

/**
 * If the awaited expression is a call expression, check if it is a call to a function with
 * a JSDoc containing a return tag.
 */
function isException(node: estree.AwaitExpression, services: ParserServicesWithTypeInformation) {
  if (node.argument.type !== 'CallExpression') {
    return false;
  }
  const signature = getSignatureFromCallee(node.argument, services);
  return signature?.declaration && hasJsDocReturn(signature.declaration);

  function hasJsDocReturn(declaration: ts.Declaration & { jsDoc?: ts.JSDoc[] }) {
    const RETURN_TAGS = ['return', 'returns'];
    if (!declaration.jsDoc) {
      return false;
    }
    for (const jsDoc of declaration.jsDoc) {
      if (jsDoc.tags?.some(tag => RETURN_TAGS.includes(tag.tagName.escapedText.toString()))) {
        return true;
      }
    }
    return false;
  }
}

function isThenable(type: ts.Type) {
  const thenProperty = type.getProperty('then');
  return thenProperty?.declarations?.some(
    d =>
      d.kind === ts.SyntaxKind.MethodSignature ||
      d.kind === ts.SyntaxKind.MethodDeclaration ||
      d.kind === ts.SyntaxKind.PropertyDeclaration,
  );
}

function isAny(type: ts.Type) {
  return Boolean(type.flags & ts.TypeFlags.Any);
}

function isUnknown(type: ts.Type) {
  return Boolean(type.flags & ts.TypeFlags.Unknown);
}

function isUnion(type: ts.Type) {
  return Boolean(type.flags & ts.TypeFlags.Union);
}
