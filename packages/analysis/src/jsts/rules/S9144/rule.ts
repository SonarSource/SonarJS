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
import { getUniqueWriteReference, getVariableFromName, isIdentifier } from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getFullyQualifiedName, isRequire } from '../helpers/module.js';
import * as meta from './generated-meta.js';

type JQueryMethod = {
  alternative: string;
  messageId: 'deprecated' | 'dependencyReduction';
};

const JQUERY_IDENTIFIERS = new Set(['jQuery', '$']);
const JQUERY_MODULES = new Set([
  'jquery',
  'jquery.slim',
  'jquery.dist.jquery.slim',
  'jquery.dist.jquery.slim.js',
]);
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
    const jqueryReceivers = new Map<Scope.Variable, boolean>();

    return {
      CallExpression(node: estree.Node): void {
        const call = node as estree.CallExpression;
        const jqueryMethod = getJQueryMethod(call, context, jqueryReceivers);
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
  jqueryReceivers: Map<Scope.Variable, boolean>,
): { method: JQueryMethod; property: estree.Identifier } | undefined {
  const { callee } = call;
  if (
    call.type !== 'CallExpression' ||
    call.optional ||
    callee.type !== 'MemberExpression' ||
    callee.computed ||
    callee.optional ||
    !isIdentifier(callee.object) ||
    !isIdentifier(callee.property) ||
    !isJQueryReceiver(callee.object, context, jqueryReceivers)
  ) {
    return undefined;
  }

  const method = JQUERY_METHODS.get(callee.property.name);
  return method === undefined ? undefined : { method, property: callee.property };
}

function isJQueryReceiver(
  identifier: estree.Identifier,
  context: Rule.RuleContext,
  jqueryReceivers: Map<Scope.Variable, boolean>,
): boolean {
  const variable = getVariableFromName(context, identifier.name, identifier);
  if (variable === undefined || variable.defs.length === 0) {
    return JQUERY_IDENTIFIERS.has(identifier.name);
  }

  if (jqueryReceivers.has(variable)) {
    return jqueryReceivers.get(variable)!;
  }

  const isReceiver =
    isDirectJQueryModuleBinding(variable) &&
    JQUERY_MODULES.has(getFullyQualifiedName(context, identifier) ?? '');
  jqueryReceivers.set(variable, isReceiver);
  return isReceiver;
}

function isDirectJQueryModuleBinding(variable: Scope.Variable): boolean {
  if (variable.defs.length !== 1) {
    return false;
  }

  const [definition] = variable.defs;
  return (
    isDirectJQueryImportBinding(definition) || isDirectJQueryRequireBinding(variable, definition)
  );
}

function isDirectJQueryImportBinding(definition: Scope.Definition): boolean {
  if (definition.type !== 'ImportBinding') {
    return false;
  }

  const { node: specifier, parent: declaration } = definition;
  if ((declaration as TSESTree.Node).type === 'TSImportEqualsDeclaration') {
    return (
      (declaration as unknown as TSESTree.TSImportEqualsDeclaration).moduleReference.type ===
      'TSExternalModuleReference'
    );
  }

  return (
    declaration.type === 'ImportDeclaration' &&
    (specifier.type === 'ImportDefaultSpecifier' ||
      specifier.type === 'ImportNamespaceSpecifier' ||
      (specifier.type === 'ImportSpecifier' && isDefaultImportSpecifier(specifier)))
  );
}

function isDefaultImportSpecifier(specifier: estree.ImportSpecifier): boolean {
  return (
    (specifier.imported.type === 'Identifier' && specifier.imported.name === 'default') ||
    (specifier.imported.type === 'Literal' && specifier.imported.value === 'default')
  );
}

function isDirectJQueryRequireBinding(
  variable: Scope.Variable,
  definition: Scope.Definition,
): boolean {
  const value = getUniqueWriteReference(variable);
  return (
    definition.type === 'Variable' &&
    definition.node.id.type === 'Identifier' &&
    value !== undefined &&
    isRequire(value)
  );
}
