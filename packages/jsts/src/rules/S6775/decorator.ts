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
 * Context object containing validated data needed for propTypes search.
 */
interface PropTypesSearchContext {
  node: estree.Node;
  propertyName: string;
  ancestors: estree.Node[];
  program: estree.Program;
  context: Rule.RuleContext;
}

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

      // Validate and extract all required data
      const searchCtx = createSearchContext(descriptor, context);
      if (!searchCtx) {
        context.report(descriptor);
        return;
      }

      // Find the component's propTypes declaration
      const propTypesValue = findComponentPropTypes(searchCtx);
      if (!propTypesValue) {
        context.report(descriptor);
        return;
      }

      // Use getProperty helper to check if property exists (handles spreads)
      // Returns: Property if found, null if not found, undefined if unresolved spreads
      const property = getProperty(propTypesValue, searchCtx.propertyName, context);

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
 * Validates the report descriptor and extracts all required data for propTypes search.
 * Returns null if any validation fails.
 *
 * All validation conditions here are guaranteed by the React rule:
 * - descriptor.data.name is always provided
 * - descriptor.node is always included
 * - Program root is always in ancestors
 */
/* istanbul ignore next - Defensive: All validation conditions guaranteed by React rule */
function createSearchContext(
  descriptor: Rule.ReportDescriptor,
  context: Rule.RuleContext,
): PropTypesSearchContext | null {
  // Extract property name from descriptor.data.name
  if (!('data' in descriptor) || !descriptor.data || typeof descriptor.data !== 'object') {
    return null;
  }
  const data = descriptor.data;
  if (!('name' in data) || typeof data.name !== 'string') {
    return null;
  }

  // Get node from descriptor
  if (!('node' in descriptor)) {
    return null;
  }
  const node = descriptor.node;

  // Get ancestors and program
  const ancestors = context.sourceCode.getAncestors(node);
  const program = ancestors.find((n): n is estree.Program => n.type === 'Program');
  if (!program) {
    return null;
  }

  return { node, propertyName: data.name, ancestors, program, context };
}

/**
 * Main orchestrator that finds the component's propTypes declaration.
 * Tries each pattern (class body, external assignment, constant) in order.
 */
function findComponentPropTypes(ctx: PropTypesSearchContext): estree.Node | undefined {
  for (let i = ctx.ancestors.length - 1; i >= 0; i--) {
    const result = findPropTypesForAncestor(ctx.ancestors[i], ctx);
    if (result) {
      return result;
    }
  }
}

/**
 * Try to find propTypes for a single ancestor node.
 */
function findPropTypesForAncestor(
  ancestor: estree.Node,
  ctx: PropTypesSearchContext,
): estree.Node | null {
  // Pattern 1: Class component with static propTypes
  if (ancestor.type === 'ClassBody') {
    const propTypes = findStaticPropTypes(ancestor);
    if (propTypes) {
      return getUniqueWriteUsageOrNode(ctx.context, propTypes, true);
    }
  }

  // Pattern 2: External assignment (Component.defaultProps = {...})
  if (ancestor.type === 'AssignmentExpression') {
    const result = findPropTypesForExternalAssignment(ancestor, ctx);
    if (result) {
      return result;
    }
  }

  // Pattern 3: Constant used as defaultProps
  if (ancestor.type === 'VariableDeclarator' && ancestor.id.type === 'Identifier') {
    const result = findPropTypesForDefaultPropsConstant(ancestor.id.name, ctx);
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * Find propTypes for external assignment pattern (Component.defaultProps = {...}).
 */
function findPropTypesForExternalAssignment(
  assignment: estree.AssignmentExpression,
  ctx: PropTypesSearchContext,
): estree.Node | null {
  const componentName = getDefaultPropsComponentName(assignment.left);
  if (!componentName) {
    return null;
  }

  const propTypes = findExternalPropTypes(componentName, ctx.program);
  if (propTypes) {
    return getUniqueWriteUsageOrNode(ctx.context, propTypes, true);
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
 * Find propTypes for constant pattern (const MyDefaults = {...}; class C { static defaultProps = MyDefaults }).
 */
function findPropTypesForDefaultPropsConstant(
  constantName: string,
  ctx: PropTypesSearchContext,
): estree.Node | null {
  for (const statement of ctx.program.body) {
    const propTypes = findPropTypesInStatement(statement, constantName);
    if (propTypes) {
      return getUniqueWriteUsageOrNode(ctx.context, propTypes, true);
    }
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
function findExternalPropTypes(componentName: string, program: estree.Program): estree.Node | null {
  // Search for ComponentName.propTypes = {...}
  for (const statement of program.body) {
    if (statement.type !== 'ExpressionStatement') {
      continue;
    }

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
  if (
    statement.type === 'ExportDefaultDeclaration' &&
    (statement.declaration.type === 'ClassDeclaration' ||
      statement.declaration.type === 'ClassExpression')
  ) {
    return { id: statement.declaration.id ?? null, body: statement.declaration.body };
  }
  if (
    statement.type === 'ExportNamedDeclaration' &&
    statement.declaration?.type === 'ClassDeclaration'
  ) {
    return { id: statement.declaration.id, body: statement.declaration.body };
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
