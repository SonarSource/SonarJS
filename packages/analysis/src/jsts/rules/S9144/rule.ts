/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S9144/javascript

import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  getUniqueWriteReference,
  getVariableFromName,
  isIdentifier,
  isTypeOnlyImportDeclaration,
} from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { isRequire } from '../helpers/module.js';
import * as meta from './generated-meta.js';

type JQueryMethod = {
  alternative: string;
  messageId: 'deprecated' | 'dependencyReduction';
};

const JQUERY_IDENTIFIERS = new Set(['jQuery', '$']);
const JQUERY_METHODS = new Map<string, JQueryMethod>([
  ['isArray', { alternative: 'Array.isArray()', messageId: 'deprecated' }],
  ['parseJSON', { alternative: 'JSON.parse()', messageId: 'deprecated' }],
  ['now', { alternative: 'Date.now()', messageId: 'deprecated' }],
  ['trim', { alternative: 'String.prototype.trim()', messageId: 'deprecated' }],
  [
    'inArray',
    {
      alternative: 'Array.prototype.indexOf()',
      messageId: 'dependencyReduction',
    },
  ],
]);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      deprecated: 'Use {{alternative}} instead of deprecated jQuery.{{method}}().',
      dependencyReduction:
        'Use {{alternative}} instead of jQuery.{{method}}() to reduce dependence on jQuery.',
    },
  }),
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      CallExpression(node: estree.Node): void {
        const call = node as estree.CallExpression;
        const jqueryMethod = getJQueryMethod(call, context);
        if (jqueryMethod === undefined) {
          return;
        }

        context.report({
          node: jqueryMethod.property,
          messageId: jqueryMethod.method.messageId,
          data: {
            alternative: jqueryMethod.method.alternative,
            method: jqueryMethod.property.name,
          },
        });
      },
    };
  },
};

function getJQueryMethod(
  call: estree.CallExpression,
  context: Rule.RuleContext,
): { method: JQueryMethod; property: estree.Identifier } | undefined {
  const { callee } = call;
  if (
    callee.type !== 'MemberExpression' ||
    callee.computed ||
    callee.optional ||
    !isIdentifier(callee.object) ||
    !isIdentifier(callee.property) ||
    !isJQueryReceiver(callee.object, context)
  ) {
    return undefined;
  }

  const method = JQUERY_METHODS.get(callee.property.name);
  return method === undefined ? undefined : { method, property: callee.property };
}

function isJQueryReceiver(identifier: estree.Identifier, context: Rule.RuleContext): boolean {
  if (!JQUERY_IDENTIFIERS.has(identifier.name)) {
    return false;
  }

  const variable = getVariableFromName(context, identifier.name, identifier);
  if (variable === undefined || variable.defs.length === 0) {
    return identifier.name === 'jQuery';
  }

  if (variable.defs.length !== 1) {
    return false;
  }

  const [definition] = variable.defs;
  return isJQueryImport(definition) || isJQueryRequireBinding(variable, definition, context);
}

function isJQueryImport(definition: Scope.Definition): boolean {
  if (definition.type !== 'ImportBinding') {
    return false;
  }

  const { node: specifier, parent: declaration } = definition;
  if (declaration.type === 'ImportDeclaration') {
    return (
      declaration.source.value === 'jquery' &&
      !isTypeOnlyImportDeclaration(declaration) &&
      (specifier.type === 'ImportDefaultSpecifier' || specifier.type === 'ImportNamespaceSpecifier')
    );
  }

  return isJQueryImportEquals(declaration);
}

function isJQueryImportEquals(declaration: estree.Node): boolean {
  if ((declaration as TSESTree.Node).type !== 'TSImportEqualsDeclaration') {
    return false;
  }

  const { moduleReference } = declaration as unknown as TSESTree.TSImportEqualsDeclaration;
  return (
    moduleReference.type === 'TSExternalModuleReference' &&
    moduleReference.expression.type === 'Literal' &&
    moduleReference.expression.value === 'jquery'
  );
}

function isJQueryRequireBinding(
  variable: Scope.Variable,
  definition: Scope.Definition,
  context: Rule.RuleContext,
): boolean {
  if (definition.type !== 'Variable' || definition.node.id.type !== 'Identifier') {
    return false;
  }

  const value = getUniqueWriteReference(variable);
  return value !== undefined && isUnshadowedJQueryRequire(value, context);
}

function isUnshadowedJQueryRequire(node: estree.Node, context: Rule.RuleContext): boolean {
  if (!isRequire(node)) {
    return false;
  }

  const [moduleName] = node.arguments;
  return (
    moduleName?.type === 'Literal' &&
    moduleName.value === 'jquery' &&
    isUnshadowedGlobal('require', node, context)
  );
}

function isUnshadowedGlobal(name: string, node: estree.Node, context: Rule.RuleContext): boolean {
  const variable = getVariableFromName(context, name, node);
  return variable === undefined || variable.defs.length === 0;
}
