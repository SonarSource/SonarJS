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
// https://sonarsource.github.io/rspec/#/rspec/S9025/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { mergeRules } from '../helpers/decorators/merger.js';
import { getFullyQualifiedName } from '../helpers/module.js';
import { isFunctionNode, type FunctionNodeType } from '../helpers/ast.js';
import * as meta from './generated-meta.js';

type NodeWithParent<T extends estree.Node> = T & Rule.NodeParentExtension;

// The upstream rule only recognizes `this.$nextTick(...)` and `Vue.nextTick(...)`
// (both `MemberExpression` callees). It misses the idiomatic Composition API form,
// where `nextTick` is imported directly from 'vue' and called as a bare identifier.
function findEnclosingFunction(
  node: NodeWithParent<estree.Node>,
): NodeWithParent<FunctionNodeType> | undefined {
  let current = node.parent as NodeWithParent<estree.Node> | undefined;
  while (current) {
    if (isFunctionNode(current)) {
      return current as NodeWithParent<FunctionNodeType>;
    }
    current = current.parent as NodeWithParent<estree.Node> | undefined;
  }
  return undefined;
}

function keyName(key: estree.Property['key']): string | undefined {
  if (key.type === 'Identifier') {
    return key.name;
  }
  if (key.type === 'Literal' && typeof key.value === 'string') {
    return key.value;
  }
  return undefined;
}

// Options API: computed: { propertyName() { ... } }
function getOptionsApiComputedPropertyName(
  fn: NodeWithParent<FunctionNodeType>,
): string | undefined {
  const property = fn.parent as NodeWithParent<estree.Property> | undefined;
  if (property?.type !== 'Property' || property.value !== fn) {
    return undefined;
  }
  const computedObject = property.parent as NodeWithParent<estree.Node> | undefined;
  const computedProperty = computedObject?.parent as NodeWithParent<estree.Property> | undefined;
  if (
    computedObject?.type !== 'ObjectExpression' ||
    computedProperty?.type !== 'Property' ||
    keyName(computedProperty.key) !== 'computed'
  ) {
    return undefined;
  }
  return keyName(property.key);
}

// Composition API: computed(() => { ... }), where `computed` is imported from 'vue'
function isCompositionApiComputedCallback(
  context: Rule.RuleContext,
  fn: NodeWithParent<FunctionNodeType>,
): boolean {
  // a FunctionDeclaration can never be a call argument, only an expression can
  if (fn.type === 'FunctionDeclaration') {
    return false;
  }
  const call = fn.parent;
  return (
    call?.type === 'CallExpression' &&
    call.arguments.includes(fn) &&
    getFullyQualifiedName(context, call) === 'vue.computed'
  );
}

function createNextTickImportListener(context: Rule.RuleContext): Rule.RuleListener {
  return {
    CallExpression(node: estree.CallExpression) {
      const call = node as NodeWithParent<estree.CallExpression>;
      // Only bare identifier calls, e.g. `nextTick()`, are this listener's concern.
      // The upstream rule already recognizes `this.$nextTick(...)` and `Vue.nextTick(...)`
      // (both `MemberExpression` callees) on its own; getFullyQualifiedName() would resolve
      // the latter to 'vue.nextTick' too (regardless of the default import's local name),
      // so without this guard both listeners would report the same call twice.
      if (call.callee.type !== 'Identifier') {
        return;
      }
      if (getFullyQualifiedName(context, call) !== 'vue.nextTick') {
        return;
      }
      const enclosingFn = findEnclosingFunction(call);
      if (!enclosingFn) {
        return;
      }
      const propertyName = getOptionsApiComputedPropertyName(enclosingFn);
      if (propertyName !== undefined) {
        context.report({
          node: call,
          messageId: 'unexpectedInProperty',
          data: { expressionName: 'asynchronous action', propertyName },
        });
      } else if (isCompositionApiComputedCallback(context, enclosingFn)) {
        context.report({
          node: call,
          messageId: 'unexpectedInFunction',
          data: { expressionName: 'asynchronous action' },
        });
      }
    },
  };
}

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
      create(context: Rule.RuleContext) {
        return mergeRules(rule.create(context), createNextTickImportListener(context));
      },
    },
    (context, reportDescriptor) => {
      if ('messageId' in reportDescriptor) {
        const { messageId, data, ...rest } = reportDescriptor;
        const expressionName = data?.expressionName as string;
        if (messageId === 'unexpectedInProperty') {
          const propertyName = data?.propertyName as string;
          context.report({
            ...rest,
            message: `Move this ${expressionName} out of the computed property "${propertyName}".`,
          });
        } else if (messageId === 'unexpectedInFunction') {
          context.report({
            ...rest,
            message: `Move this ${expressionName} out of the computed function.`,
          });
        } else {
          context.report(reportDescriptor);
        }
      }
    },
  );
}
