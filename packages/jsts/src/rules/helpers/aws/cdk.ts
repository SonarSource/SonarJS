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
import * as estree from 'estree';
import { getFullyQualifiedName } from '../module';
import {
  getProperty,
  getUniqueWriteUsage,
  getUniqueWriteUsageOrNode,
  isIdentifier,
  isLiteral,
  isUndefined,
  isUnresolved,
  getValueOfExpression,
} from '../ast';

const AWS_OPTIONS_ARGUMENT_POSITION = 2;

/**
 * A symbol fully qualified name, e.g. `aws-cdk-lib.aws_sns.Topic`.
 */
export type FullyQualifiedName = string;
export type AwsCdkCallback = {
  functionName?: string;
  methods?: string[];
  callExpression(expr: estree.CallExpression, ctx: Rule.RuleContext, fqn?: string): void;
  newExpression?(expr: estree.NewExpression, ctx: Rule.RuleContext): void;
};
export type AwsCdkConsumer =
  | ((expr: estree.NewExpression, ctx: Rule.RuleContext) => void)
  | AwsCdkCallback;
type AwsCdkNode = estree.NewExpression | estree.CallExpression;

type Values = { invalid?: any[]; valid?: any[]; case_insensitive?: boolean };
type ValuesByType = {
  primitives?: Values;
  fqns?: Values;
  customChecker?: (ctx: Rule.RuleContext, node: estree.Node) => boolean;
};
type NodeAndReport = {
  node: estree.Node;
  nodeToReport: estree.Node;
};

export type AwsCdkConsumerMap = { [key: FullyQualifiedName]: AwsCdkConsumer };

/**
 * A rule template for AWS CDK resources
 *
 * @param mapOrFactory callbacks to invoke when a new expression or a call expression matches a fully qualified name
 * @param metadata the rule metadata
 * @returns the instantiated rule module
 */
export function AwsCdkTemplate(
  mapOrFactory: AwsCdkConsumerMap | ((ctx: Rule.RuleContext) => AwsCdkConsumerMap),
  metadata: { meta: Rule.RuleMetaData } = { meta: {} },
): Rule.RuleModule {
  return {
    ...metadata,
    create(ctx: Rule.RuleContext) {
      const consumers = typeof mapOrFactory === 'function' ? mapOrFactory(ctx) : mapOrFactory;
      return {
        'NewExpression, CallExpression'(node: AwsCdkNode) {
          if (node.arguments.some(arg => arg.type === 'SpreadElement')) {
            return;
          }
          for (const fqn in consumers) {
            const normalizedExpectedFQN = normalizeFQN(fqn);
            const callback = consumers[fqn];
            if (typeof callback === 'object' || node.type === 'CallExpression') {
              executeIfMatching(node, normalizedExpectedFQN!, callback);
              continue;
            }
            const normalizedActualFQN = normalizeFQN(getFullyQualifiedName(ctx, node.callee));
            if (normalizedActualFQN === normalizedExpectedFQN) {
              callback(node, ctx);
            }
          }
        },
      };

      function executeIfMatching(node: AwsCdkNode, expected: string, callback: AwsCdkConsumer) {
        if (typeof callback === 'function') {
          return;
        }

        const fqn = normalizeFQN(getFullyQualifiedName(ctx, node.callee));
        if (node.type === 'NewExpression' && fqn === expected) {
          callback.newExpression?.(node, ctx);
        } else if (isMethodCall(callback, fqn, expected)) {
          callback.callExpression(node, ctx, fqn);
        }
      }

      function isMethodCall(callback: AwsCdkCallback, fqn: string | undefined, expected: string) {
        if (callback.functionName) {
          return fqn === `${expected}.${callback.functionName}`;
        } else if (callback.methods && fqn?.startsWith(expected)) {
          const methodNames = fqn.substring(expected.length).split('.');
          const methods = callback.methods;
          return methodNames.every(name => name === '' || methods.includes(name));
        } else {
          return fqn === expected;
        }
      }
    },
  };
}

/**
 * Get the messageId at the given position from an array. If a string is used
 * instead of an array, return it
 * @param messageId Array of messageIds or single string if only one messageId is used
 * @param pos
 */
function getMessageAtPos(messageId: string | string[], pos = 0): string {
  if (typeof messageId === 'string') {
    return messageId;
  }
  return messageId[pos];
}

/**
 * Function to analyse arguments in a function and check for correct values. It will report if the
 * conditions are not met unless `silent = true`, in which case it will return boolean `true`
 * indicating conditions are not met.
 *
 * @param messageId Array of messageIds or single string if only one messageId is used. When an array is passed,
 *                  first messageId is used for omitted values and second for invalid values.
 * @param needsProps whether default (undefined) values are allowed or if it must be set
 * @param propertyName property name to search in the object (Array of strings for nested props)
 * @param values allowed or disallowed values
 * @param silent whether the function must report or just return conflicting Node when conditions are not met
 * @param position position of the argument to be analysed (3rd argument by default)
 */
export function AwsCdkCheckArguments(
  messageId: string | string[],
  needsProps: boolean,
  propertyName: string | string[],
  values?: ValuesByType,
  silent = false,
  position = AWS_OPTIONS_ARGUMENT_POSITION,
) {
  return (expr: estree.NewExpression, ctx: Rule.RuleContext): estree.Node | undefined => {
    const argument = expr.arguments[position];

    // Argument not found or undefined
    if (!argument || isUndefined(argument)) {
      if (needsProps) {
        if (silent) {
          return expr.callee;
        }
        ctx.report({ messageId: getMessageAtPos(messageId, 0), node: expr.callee });
      }
      return;
    }

    const properties = traverseProperties(
      { node: argument, nodeToReport: argument },
      typeof propertyName === 'string' ? [propertyName] : propertyName,
      ctx,
      getMessageAtPos(messageId, 0),
      needsProps,
      silent,
    );

    if (!Array.isArray(properties)) {
      return properties;
    }

    if (!properties?.length) {
      return;
    }

    for (const property of properties) {
      const propertyValue = getUniqueWriteUsageOrNode(
        ctx,
        (property.node as estree.Property).value,
        true,
      );

      if (isUnresolved(propertyValue, ctx)) {
        continue;
      }

      /* Property is undefined or an empty array, which is the undefined equivalent
         for properties with an array-form where we expect multiple nested values */
      if (
        isUndefined(propertyValue) ||
        (propertyValue.type === 'ArrayExpression' && !propertyValue.elements.length)
      ) {
        if (needsProps) {
          if (silent) {
            return getNodeToReport(property);
          }
          ctx.report({ messageId: getMessageAtPos(messageId, 0), node: getNodeToReport(property) });
        }
        continue;
      }

      // Value is expected to be a primitive (string, number)
      if (values?.primitives && disallowedValue(ctx, propertyValue, values.primitives)) {
        if (silent) {
          return getNodeToReport(property);
        }
        ctx.report({ messageId: getMessageAtPos(messageId, 1), node: getNodeToReport(property) });
      }
      // Value is expected to be an Identifier following a specific FQN
      if (values?.fqns && disallowedFQNs(ctx, propertyValue, values.fqns)) {
        if (silent) {
          return getNodeToReport(property);
        }
        ctx.report({ messageId: getMessageAtPos(messageId, 1), node: getNodeToReport(property) });
      }
      // The value needs to be validated with a customized function
      if (values?.customChecker && values.customChecker(ctx, propertyValue)) {
        if (silent) {
          return getNodeToReport(property);
        }
        ctx.report({ messageId: getMessageAtPos(messageId, 1), node: getNodeToReport(property) });
      }
    }
  };
}

function getNodeToReport(property: NodeAndReport): estree.Node {
  if (property.nodeToReport.type === 'Property') {
    return property.nodeToReport.value;
  }
  return property.nodeToReport;
}

/**
 * Given an object expression, check for [nested] attributes. If at some level an
 * array is found, the search for next level properties will be performed on each element
 * of the array.
 *
 * @returns an array of Nodes which have the given property path.
 *
 * @param node node to look for the next property.
 * @param propertyPath pending property paths to traverse
 * @param ctx rule context
 * @param messageId messageId to report when path cannot be met and silent = `false`
 * @param needsProp whether missing (undefined) values are allowed or if it must be set
 * @param silent whether the function must report or just return conflicting Node when conditions are not met
 */

function traverseProperties(
  node: NodeAndReport,
  propertyPath: string[],
  ctx: Rule.RuleContext,
  messageId: string,
  needsProp: boolean,
  silent: boolean,
): NodeAndReport[] | estree.Node {
  const [propertyName, ...nextElements] = propertyPath;
  const properties: NodeAndReport[] = [];
  const children: NodeAndReport[] = [];

  if (isUnresolved(node.node, ctx)) {
    return [];
  }

  const objExpr = getValueOfExpression(ctx, node.node, 'ObjectExpression', true);

  if (objExpr === undefined) {
    const arrayExpr = getValueOfExpression(ctx, node.node, 'ArrayExpression', true);

    if (arrayExpr === undefined || !arrayExpr.elements.length) {
      if (needsProp) {
        if (silent) {
          return node.nodeToReport;
        }
        ctx.report({ messageId, node: node.nodeToReport });
      }
      return [];
    }

    for (const element of arrayExpr.elements) {
      const elemObjExpr = getValueOfExpression(ctx, element, 'ObjectExpression', true);
      if (elemObjExpr && element) {
        children.push({ node: elemObjExpr, nodeToReport: element });
      }
    }
  } else {
    children.push({ node: objExpr, nodeToReport: node.nodeToReport });
  }

  for (const child of children) {
    const property = getProperty(child.node as estree.ObjectExpression, propertyName, ctx);
    if (property === undefined) {
      continue;
    }

    if (!property) {
      if (needsProp) {
        if (silent) {
          return node.nodeToReport;
        }
        ctx.report({ messageId, node: node.nodeToReport });
      }
      continue;
    }

    if (nextElements.length) {
      if (
        child.node === child.nodeToReport &&
        (child.node as estree.ObjectExpression).properties.includes(property)
      ) {
        child.nodeToReport = property.value;
      }
      child.node = property.value;
      const nextElementChildren = traverseProperties(
        child,
        nextElements,
        ctx,
        messageId,
        needsProp,
        silent,
      );
      if (!Array.isArray(nextElementChildren)) {
        return nextElementChildren;
      }
      properties.push(...nextElementChildren);
    } else {
      if (
        child.node === child.nodeToReport &&
        (child.node as estree.ObjectExpression).properties.includes(property)
      ) {
        child.nodeToReport = property;
      }
      child.node = property;
      properties.push(child);
    }
  }
  return properties;
}

function disallowedValue(ctx: Rule.RuleContext, node: estree.Node, values: Values): boolean {
  const literal = getLiteralValue(ctx, node);
  if (literal) {
    if (values.valid?.length) {
      const found = values.valid.some(value => {
        if (values.case_insensitive && typeof literal.value === 'string') {
          return value.toLowerCase() === literal.value.toLowerCase();
        }
        return value === literal.value;
      });
      if (!found) {
        return true;
      }
    }
    if (values.invalid?.length) {
      const found = values.invalid.some(value => {
        if (values.case_insensitive && typeof literal.value === 'string') {
          return value.toLowerCase() === literal.value.toLowerCase();
        }
        return value === literal.value;
      });
      if (found) {
        return true;
      }
    }
  }
  return false;
}

export function getLiteralValue(
  ctx: Rule.RuleContext,
  node: estree.Node,
): estree.Literal | undefined {
  if (isLiteral(node)) {
    return node;
  } else if (isIdentifier(node)) {
    const usage = getUniqueWriteUsage(ctx, node.name);
    if (usage) {
      return getLiteralValue(ctx, usage);
    }
  }
  return undefined;
}

function disallowedFQNs(ctx: Rule.RuleContext, node: estree.Node, values: Values) {
  const normalizedFQN = normalizeFQN(getFullyQualifiedName(ctx, node));

  if (
    values.valid?.length &&
    (!normalizedFQN || !values.valid.map(normalizeFQN).includes(normalizedFQN))
  ) {
    return true;
  }
  return normalizedFQN && values.invalid?.map(normalizeFQN).includes(normalizedFQN);
}

export function normalizeFQN(fqn?: string | null) {
  return fqn?.replace(/-/g, '_');
}
