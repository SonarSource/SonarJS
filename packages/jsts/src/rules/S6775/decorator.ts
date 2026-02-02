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
// https://sonarsource.github.io/rspec/#/rspec/S6775/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import {
  generateMeta,
  getProperty,
  getUniqueWriteUsageOrNode,
  interceptReportForReact,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';

/**
 * Decorates the react/default-props-match-prop-types rule to handle spread in propTypes.
 *
 * The eslint-plugin-react rule cannot "unpack" spread elements when analyzing propTypes.
 * When propTypes uses spread from a constant (e.g., `static propTypes = { ...SharedPropTypes }`),
 * the rule sees the spread as an opaque reference and cannot see properties inside it.
 *
 * This decorator finds the component's propTypes declaration and uses the getProperty helper
 * to resolve spread elements and check if the flagged defaultProp exists in any of them.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, descriptor) => {
      // Only filter 'defaultHasNoType' messages - let 'requiredHasDefault' pass through
      if ('messageId' in descriptor && descriptor.messageId !== 'defaultHasNoType') {
        context.report(descriptor);
        return;
      }

      // Extract the property name from descriptor.data.name
      const propertyName = extractPropertyName(descriptor);
      if (!propertyName) {
        context.report(descriptor);
        return;
      }

      // Get the reported node
      if (!('node' in descriptor)) {
        context.report(descriptor);
        return;
      }

      const node = descriptor.node;

      // Find the component's propTypes declaration
      const propTypesValue = findPropTypesDeclaration(node, context);
      if (!propTypesValue) {
        // Can't find propTypes, pass through
        context.report(descriptor);
        return;
      }

      // Use getProperty helper to check if property exists (handles spreads)
      // Returns: Property if found, null if not found, undefined if unresolved spreads
      const property = getProperty(propTypesValue, propertyName, context);

      if (property !== null) {
        // Property found or there are unresolved spreads - suppress the issue
        // When spreads are unresolved, we err on the side of not reporting
        return;
      }

      // Property not found in propTypes, report the issue
      context.report(descriptor);
    },
  );
}

/**
 * Extract the property name from the report descriptor.
 */
function extractPropertyName(descriptor: Rule.ReportDescriptor): string | null {
  if ('data' in descriptor && descriptor.data && typeof descriptor.data === 'object') {
    const data = descriptor.data;
    if ('name' in data && typeof data.name === 'string') {
      return data.name;
    }
  }
  return null;
}

/**
 * Navigate from the reported node (property in defaultProps) to find the component's
 * propTypes declaration and return its value.
 */
function findPropTypesDeclaration(
  node: estree.Node,
  context: Rule.RuleContext,
): estree.Node | null {
  const ancestors = context.sourceCode.getAncestors(node);

  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i];
    const propTypes = findPropTypesForAncestor(ancestor, ancestors, context);
    if (propTypes) {
      return propTypes;
    }
  }

  return null;
}

/**
 * Try to find propTypes based on the ancestor node type.
 */
function findPropTypesForAncestor(
  ancestor: estree.Node,
  ancestors: estree.Node[],
  context: Rule.RuleContext,
): estree.Node | null {
  // Pattern 1: Class component with static propTypes
  if (ancestor.type === 'ClassBody') {
    return findPropTypesFromClassBody(ancestor, context);
  }

  // Pattern 2: External assignment - Component.defaultProps = {...}
  if (ancestor.type === 'AssignmentExpression') {
    return findPropTypesFromAssignment(ancestor, ancestors, context);
  }

  // Pattern 3: Reported node is inside a constant used as defaultProps
  if (ancestor.type === 'VariableDeclarator' && ancestor.id.type === 'Identifier') {
    return findPropTypesFromVariableDeclarator(ancestor, ancestors, context);
  }

  return null;
}

/**
 * Find propTypes from a class body.
 */
function findPropTypesFromClassBody(
  classBody: estree.ClassBody,
  context: Rule.RuleContext,
): estree.Node | null {
  const propTypes = findStaticPropTypes(classBody);
  if (propTypes) {
    return getUniqueWriteUsageOrNode(context, propTypes, true);
  }
  return null;
}

/**
 * Find propTypes from an assignment expression (Component.defaultProps = {...}).
 */
function findPropTypesFromAssignment(
  assignment: estree.AssignmentExpression,
  ancestors: estree.Node[],
  context: Rule.RuleContext,
): estree.Node | null {
  const componentName = getDefaultPropsComponentName(assignment.left);
  if (!componentName) {
    return null;
  }
  const propTypes = findExternalPropTypes(componentName, ancestors);
  if (propTypes) {
    return getUniqueWriteUsageOrNode(context, propTypes, true);
  }
  return null;
}

/**
 * Extract component name from a defaultProps assignment target.
 */
function getDefaultPropsComponentName(left: estree.Pattern): string | null {
  if (
    left.type === 'MemberExpression' &&
    left.object.type === 'Identifier' &&
    left.property.type === 'Identifier' &&
    left.property.name === 'defaultProps'
  ) {
    return left.object.name;
  }
  return null;
}

/**
 * Find propTypes from a variable declarator (constant used as defaultProps).
 */
function findPropTypesFromVariableDeclarator(
  declarator: estree.VariableDeclarator,
  ancestors: estree.Node[],
  context: Rule.RuleContext,
): estree.Node | null {
  if (declarator.id.type !== 'Identifier') {
    return null;
  }
  const constantName = declarator.id.name;
  const propTypes = findPropTypesForDefaultPropsConstant(constantName, ancestors);
  if (propTypes) {
    return getUniqueWriteUsageOrNode(context, propTypes, true);
  }
  return null;
}

/**
 * Find static propTypes in a class body.
 */
function findStaticPropTypes(classBody: estree.ClassBody): estree.Node | null {
  for (const element of classBody.body) {
    if (
      element.type === 'PropertyDefinition' &&
      element.static &&
      element.key.type === 'Identifier' &&
      element.key.name === 'propTypes' &&
      element.value
    ) {
      return element.value;
    }
  }
  return null;
}

/**
 * Find external propTypes assignment (Component.propTypes = {...}).
 */
function findExternalPropTypes(
  componentName: string,
  ancestors: estree.Node[],
): estree.Node | null {
  const program = ancestors.find((n): n is estree.Program => n.type === 'Program');
  if (!program) {
    return null;
  }

  // Search for ComponentName.propTypes = {...}
  for (const statement of program.body) {
    if (statement.type === 'ExpressionStatement') {
      const expr = statement.expression;
      if (
        expr.type === 'AssignmentExpression' &&
        expr.left.type === 'MemberExpression' &&
        expr.left.object.type === 'Identifier' &&
        expr.left.object.name === componentName &&
        expr.left.property.type === 'Identifier' &&
        expr.left.property.name === 'propTypes'
      ) {
        return expr.right;
      }
    }
  }

  // Also check for class with static propTypes
  for (const statement of program.body) {
    const classInfo = extractClassDeclaration(statement);
    if (classInfo && classInfo.id?.name === componentName) {
      const propTypes = findStaticPropTypes(classInfo.body);
      if (propTypes) {
        return propTypes;
      }
    }
  }

  return null;
}

/**
 * Extract a class body and name from various statement types.
 */
function extractClassDeclaration(
  statement: estree.Statement | estree.ModuleDeclaration,
): { id: estree.Identifier | null; body: estree.ClassBody } | null {
  if (statement.type === 'ClassDeclaration') {
    return { id: statement.id, body: statement.body };
  }
  if (statement.type === 'ExportDefaultDeclaration') {
    const decl = statement.declaration;
    if (decl.type === 'ClassDeclaration' || decl.type === 'ClassExpression') {
      return { id: decl.id ?? null, body: decl.body };
    }
  }
  if (statement.type === 'ExportNamedDeclaration' && statement.declaration) {
    const decl = statement.declaration;
    if (decl.type === 'ClassDeclaration') {
      return { id: decl.id, body: decl.body };
    }
  }
  return null;
}

/**
 * Find propTypes for a component that uses a constant as its defaultProps.
 * Pattern: const MyDefaultProps = {...}; class Component { static defaultProps = MyDefaultProps; }
 */
function findPropTypesForDefaultPropsConstant(
  constantName: string,
  ancestors: estree.Node[],
): estree.Node | null {
  const program = ancestors.find((n): n is estree.Program => n.type === 'Program');
  if (!program) {
    return null;
  }

  for (const statement of program.body) {
    const propTypes = findPropTypesInStatement(statement, constantName);
    if (propTypes) {
      return propTypes;
    }
  }

  return null;
}

/**
 * Search a statement for a component that uses constantName as defaultProps.
 */
function findPropTypesInStatement(
  statement: estree.Statement | estree.ModuleDeclaration,
  defaultPropsConstantName: string,
): estree.Node | null {
  // Check class declarations
  const classInfo = extractClassDeclaration(statement);
  if (classInfo && classUsesDefaultPropsConstant(classInfo.body, defaultPropsConstantName)) {
    return findStaticPropTypes(classInfo.body);
  }

  // Check for function declarations that return classes (factory pattern)
  if (statement.type === 'FunctionDeclaration' && statement.body) {
    const propTypes = findPropTypesInFunctionBody(statement.body, defaultPropsConstantName);
    if (propTypes) {
      return propTypes;
    }
  }

  // Check for exported functions
  if (
    statement.type === 'ExportNamedDeclaration' &&
    statement.declaration?.type === 'FunctionDeclaration' &&
    statement.declaration.body
  ) {
    const propTypes = findPropTypesInFunctionBody(
      statement.declaration.body,
      defaultPropsConstantName,
    );
    if (propTypes) {
      return propTypes;
    }
  }

  return null;
}

/**
 * Check if a class body uses a specific constant as its defaultProps.
 */
function classUsesDefaultPropsConstant(classBody: estree.ClassBody, constantName: string): boolean {
  for (const element of classBody.body) {
    if (
      element.type === 'PropertyDefinition' &&
      element.static &&
      element.key.type === 'Identifier' &&
      element.key.name === 'defaultProps' &&
      element.value?.type === 'Identifier' &&
      element.value.name === constantName
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Search a function body for class expressions that use a constant as defaultProps.
 */
function findPropTypesInFunctionBody(
  body: estree.BlockStatement,
  defaultPropsConstantName: string,
): estree.Node | null {
  for (const stmt of body.body) {
    if (
      stmt.type === 'ReturnStatement' &&
      stmt.argument?.type === 'ClassExpression' &&
      classUsesDefaultPropsConstant(stmt.argument.body, defaultPropsConstantName)
    ) {
      return findStaticPropTypes(stmt.argument.body);
    }
  }
  return null;
}
