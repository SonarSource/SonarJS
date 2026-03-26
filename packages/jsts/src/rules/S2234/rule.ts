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
// https://sonarsource.github.io/rspec/#/rspec/S2234/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  type FunctionNodeType,
  isFunctionNode,
  resolveFromFunctionReference,
  resolveIdentifiers,
} from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getSignatureFromCallee, getTypeAsString } from '../helpers/type.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import { report, toSecondaryLocation } from '../helpers/location.js';
import * as meta from './generated-meta.js';

interface FunctionSignature {
  params: Array<string | undefined>;
  declaration?: FunctionNodeType;
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),

  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    const canResolveType = isRequiredParserServices(services);

    function checkArguments(functionCall: estree.CallExpression) {
      // Extract argument names first (cheap operation)
      const argumentNames = functionCall.arguments.map(arg => {
        const argument = arg as TSESTree.Node;
        return argument.type === 'Identifier' ? argument.name : undefined;
      });

      // Early exit: detecting swapped arguments requires at least 2 identifier arguments.
      // Skip expensive type resolution if there aren't enough identifiers to check.
      // This avoids a TypeScript performance issue where type inference for complex
      // destructuring patterns with nested defaults can have exponential complexity.
      const identifierCount = argumentNames.filter(name => name !== undefined).length;
      if (identifierCount < 2) {
        return;
      }

      const resolvedFunction = resolveFunctionDeclaration(functionCall);
      if (!resolvedFunction) {
        return;
      }

      const { params: functionParameters, declaration: functionDeclaration } = resolvedFunction;

      if (isCryptoCyclicRotation(functionCall, functionParameters)) {
        return;
      }

      for (let argumentIndex = 0; argumentIndex < argumentNames.length; argumentIndex++) {
        const argumentName = argumentNames[argumentIndex];
        if (argumentName) {
          const swappedArgumentName = getSwappedArgumentName(
            argumentNames,
            functionParameters,
            argumentName,
            argumentIndex,
            functionCall,
          );
          if (
            swappedArgumentName &&
            !areComparedArguments([argumentName, swappedArgumentName], functionCall) &&
            !isIntentionalComparatorReversal(functionCall, argumentName, swappedArgumentName) &&
            !isInDirectionalContext(functionCall) &&
            !isIntentionalTernarySwap(functionCall, argumentName, swappedArgumentName)
          ) {
            raiseIssue(argumentName, swappedArgumentName, functionDeclaration, functionCall);
            return;
          }
        }
      }
    }

    function areComparedArguments(argumentNames: string[], node: estree.Node): boolean {
      function getName(node: estree.Node): string | undefined {
        switch (node.type) {
          case 'Identifier':
            return node.name;
          case 'CallExpression':
            return getName(node.callee);
          case 'MemberExpression':
            return getName(node.object);
          default:
            return undefined;
        }
      }
      function checkComparedArguments(lhs: estree.Node, rhs: estree.Node): boolean {
        return (
          [lhs, rhs].map(getName).filter(name => name && argumentNames.includes(name)).length ===
          argumentNames.length
        );
      }
      const maybeIfStmt = context.sourceCode
        .getAncestors(node)
        .reverse()
        .find(ancestor => ancestor.type === 'IfStatement');
      if (maybeIfStmt) {
        const { test } = maybeIfStmt;
        switch (test.type) {
          case 'BinaryExpression': {
            const binExpr = test;
            if (['==', '!=', '===', '!==', '<', '<=', '>', '>='].includes(binExpr.operator)) {
              const { left: lhs, right: rhs } = binExpr;
              return checkComparedArguments(lhs, rhs);
            }
            break;
          }

          case 'CallExpression': {
            const callExpr = test;
            if (callExpr.arguments.length === 1 && callExpr.callee.type === 'MemberExpression') {
              const [lhs, rhs] = [callExpr.callee.object, callExpr.arguments[0]];
              return checkComparedArguments(lhs, rhs);
            }
            break;
          }
        }
      }
      return false;
    }

    /**
     * Returns true when the detected argument swap is an intentional reversal wrapper.
     *
     * A reversal wrapper is an ArrowFunctionExpression or FunctionExpression with exactly
     * 2 single-character identifier parameters (e.g. `a`, `b`, `x`, `y`) whose sole body
     * is a single call that passes those same 2 parameters in swapped order,
     * e.g. `(a, b) => compare(b, a)`.
     *
     * Requiring single-character parameter names ensures that only placeholder-style names
     * are treated as intentional reversals. Meaningful names like `year` or `month` indicate
     * that the swap is likely a bug rather than a deliberate comparator reversal.
     */
    function isIntentionalComparatorReversal(
      functionCall: estree.CallExpression,
      arg1Name: string,
      arg2Name: string,
    ): boolean {
      const enclosingFunc = context.sourceCode
        .getAncestors(functionCall)
        .reverse()
        .find(
          ancestor =>
            ancestor.type === 'ArrowFunctionExpression' || ancestor.type === 'FunctionExpression',
        );

      if (enclosingFunc?.params.length !== 2) {
        return false;
      }

      const [param0, param1] = enclosingFunc.params;
      if (param0.type !== 'Identifier' || param1.type !== 'Identifier') {
        return false;
      }

      // Only suppress when parameter names are single-character placeholders like 'a', 'b', 'x', 'y'.
      // Meaningful names (e.g. 'year', 'month') suggest the swap is a real bug, not an intentional reversal.
      if (param0.name.length > 1 || param1.name.length > 1) {
        return false;
      }

      const paramNames = new Set([param0.name, param1.name]);
      if (!paramNames.has(arg1Name) || !paramNames.has(arg2Name)) {
        return false;
      }

      const body = enclosingFunc.body;
      if (body === functionCall) {
        return true;
      }
      if (
        body.type === 'BlockStatement' &&
        body.body.length === 1 &&
        body.body[0].type === 'ReturnStatement' &&
        body.body[0].argument === functionCall
      ) {
        return true;
      }

      return false;
    }

    // Returns true if the node is nested inside an object property whose key is a
    // directional keyword (e.g. 'rtl', 'ltr', 'reverse'). In such cases, parameter
    // swapping is intentional — it represents the opposite ordering for bidirectional
    // text handling or conditional reversal logic.
    function isInDirectionalContext(node: estree.CallExpression): boolean {
      const ancestors = context.sourceCode.getAncestors(node);
      for (const ancestor of ancestors) {
        if (ancestor.type === 'Property') {
          const { key } = ancestor;
          if (key.type === 'Identifier' && DIRECTIONAL_KEYWORD_PATTERN.test(key.name)) {
            return true;
          }
          if (
            key.type === 'Literal' &&
            typeof key.value === 'string' &&
            DIRECTIONAL_KEYWORD_PATTERN.test(key.value)
          ) {
            return true;
          }
        }
      }
      return false;
    }

    /**
     * Returns true when the detected argument swap is in one branch of a ConditionalExpression,
     * the other branch calls the same function with those arguments in the opposite (normal) order,
     * AND the ternary condition itself is a comparison that involves both of those same arguments.
     *
     * This ensures the condition is actually selecting the correct ordering rather than being an
     * unrelated boolean. For example:
     *   `start < stop ? fn(start, stop) : fn(stop, start)` — suppressed (condition compares the pair)
     *   `legacy ? fn(stop, start) : fn(start, stop)` — reported (condition unrelated to arg order)
     */
    function isIntentionalTernarySwap(
      functionCall: estree.CallExpression,
      arg1Name: string,
      arg2Name: string,
    ): boolean {
      const ancestors = context.sourceCode.getAncestors(functionCall);
      const parent = ancestors.at(-1);

      if (parent?.type !== 'ConditionalExpression') {
        return false;
      }

      const conditional = parent;

      // Determine the "other" branch of the ternary
      let otherBranch: estree.Node | null = null;
      if (conditional.consequent === functionCall) {
        otherBranch = conditional.alternate;
      } else if (conditional.alternate === functionCall) {
        otherBranch = conditional.consequent;
      }

      if (otherBranch?.type !== 'CallExpression') {
        return false;
      }

      const otherCall = otherBranch as estree.CallExpression;

      // Both calls must target the same callee (by source text)
      if (
        context.sourceCode.getText(functionCall.callee) !==
        context.sourceCode.getText(otherCall.callee)
      ) {
        return false;
      }

      if (otherCall.arguments.length !== functionCall.arguments.length) {
        return false;
      }

      // Find positions of arg1 and arg2 in the flagged call
      const args = functionCall.arguments;
      const idx1 = args.findIndex(a => a.type === 'Identifier' && a.name === arg1Name);
      const idx2 = args.findIndex(a => a.type === 'Identifier' && a.name === arg2Name);

      if (idx1 < 0 || idx2 < 0) {
        return false;
      }

      // In the other branch, those same positions must carry arg2 and arg1 (reversed)
      const otherArgs = otherCall.arguments;
      const otherAtIdx1 = otherArgs[idx1];
      const otherAtIdx2 = otherArgs[idx2];

      if (
        !(
          otherAtIdx1?.type === 'Identifier' &&
          otherAtIdx1.name === arg2Name &&
          otherAtIdx2?.type === 'Identifier' &&
          otherAtIdx2.name === arg1Name
        )
      ) {
        return false;
      }

      // The ternary condition must itself compare the same argument pair. This ties the
      // suppression to condition-controlled ordering (e.g. `a < b ? fn(a, b) : fn(b, a)`)
      // rather than an arbitrary boolean selector (e.g. `flag ? fn(b, a) : fn(a, b)`).
      const test = conditional.test;
      if (test.type !== 'BinaryExpression') {
        return false;
      }
      const COMPARISON_OPERATORS = ['==', '!=', '===', '!==', '<', '<=', '>', '>='];
      if (!COMPARISON_OPERATORS.includes(test.operator)) {
        return false;
      }
      const leftName = test.left.type === 'Identifier' ? test.left.name : undefined;
      const rightName = test.right.type === 'Identifier' ? test.right.name : undefined;
      if (!leftName || !rightName) {
        return false;
      }
      const conditionNames = new Set([leftName, rightName]);
      return conditionNames.has(arg1Name) && conditionNames.has(arg2Name);
    }

    function resolveFunctionDeclaration(node: estree.CallExpression): FunctionSignature | null {
      if (canResolveType) {
        return resolveFromTSSignature(node);
      }

      let functionDeclaration: FunctionNodeType | null = null;

      if (isFunctionNode(node.callee)) {
        functionDeclaration = node.callee;
      } else if (node.callee.type === 'Identifier') {
        functionDeclaration = resolveFromFunctionReference(context, node.callee);
      }

      if (!functionDeclaration) {
        return null;
      }

      return {
        params: extractFunctionParameters(functionDeclaration),
        declaration: functionDeclaration,
      };
    }

    function resolveFromTSSignature(node: estree.CallExpression) {
      const signature = getSignatureFromCallee(node, services);
      if (signature?.declaration) {
        return {
          params: signature.parameters.map(param => param.name),
          declaration: services.tsNodeToESTreeNodeMap.get(signature.declaration),
        };
      }
      return null;
    }

    function getSwappedArgumentName(
      argumentNames: Array<string | undefined>,
      functionParameters: Array<string | undefined>,
      argumentName: string,
      argumentIndex: number,
      node: estree.CallExpression,
    ) {
      const indexInFunctionDeclaration = functionParameters.indexOf(argumentName);
      if (indexInFunctionDeclaration >= 0 && indexInFunctionDeclaration !== argumentIndex) {
        const potentiallySwappedArgument = argumentNames[indexInFunctionDeclaration];
        if (
          potentiallySwappedArgument &&
          potentiallySwappedArgument === functionParameters[argumentIndex] &&
          haveCompatibleTypes(
            node.arguments[argumentIndex],
            node.arguments[indexInFunctionDeclaration],
          )
        ) {
          return potentiallySwappedArgument;
        }
      }
      return null;
    }

    function haveCompatibleTypes(arg1: estree.Node, arg2: estree.Node) {
      if (canResolveType) {
        const type1 = normalizeType(getTypeAsString(arg1, services));
        const type2 = normalizeType(getTypeAsString(arg2, services));
        return type1 === type2;
      }
      return true;
    }

    function raiseIssue(
      arg1: string,
      arg2: string,
      functionDeclaration: FunctionNodeType | undefined,
      node: estree.CallExpression,
    ) {
      report(
        context,
        {
          message: `Arguments '${arg1}' and '${arg2}' have the same names but not the same order as the function parameters.`,
          loc: getParametersClauseLocation(node.arguments),
        },
        getSecondaryLocations(functionDeclaration),
      );
    }

    return {
      NewExpression: (node: estree.Node) => {
        checkArguments(node as estree.NewExpression);
      },
      CallExpression: (node: estree.Node) => {
        checkArguments(node as estree.CallExpression);
      },
    };
  },
};

const DIRECTIONAL_KEYWORD_PATTERN = /\b(rtl|ltr|reverse|flip|swap|forward|backward)\b/i;
const CRYPTO_FUNCTION_PATTERN = /^(md[45]_?)?(ff|gg|hh|ii)$/i;
const CRYPTO_STATE_PARAM_COUNT = 4;

function isCryptoCyclicRotation(
  functionCall: estree.CallExpression,
  functionParameters: Array<string | undefined>,
): boolean {
  const callee = functionCall.callee;
  let calleeName: string | null = null;
  if (callee.type === 'Identifier') {
    calleeName = callee.name;
  } else if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
    calleeName = callee.property.name;
  }

  if (!calleeName || !CRYPTO_FUNCTION_PATTERN.test(calleeName)) {
    return false;
  }

  if (
    functionParameters.length < CRYPTO_STATE_PARAM_COUNT ||
    functionCall.arguments.length < CRYPTO_STATE_PARAM_COUNT
  ) {
    return false;
  }

  // First 4 arguments must all be identifiers
  const argNames: string[] = [];
  for (let i = 0; i < CRYPTO_STATE_PARAM_COUNT; i++) {
    const arg = functionCall.arguments[i];
    if (arg.type !== 'Identifier') {
      return false;
    }
    argNames.push(arg.name);
  }

  // First 4 parameters must all be defined
  const paramNames = functionParameters.slice(0, CRYPTO_STATE_PARAM_COUNT);
  if (paramNames.includes(undefined)) {
    return false;
  }

  // Check if args[0..3] are a cyclic rotation of params[0..3]
  for (let k = 1; k <= CRYPTO_STATE_PARAM_COUNT - 1; k++) {
    if (argNames.every((arg, i) => arg === paramNames[(i + k) % CRYPTO_STATE_PARAM_COUNT])) {
      return true;
    }
  }

  return false;
}

function extractFunctionParameters(functionDeclaration: FunctionNodeType) {
  return functionDeclaration.params.map(param => {
    const identifiers = resolveIdentifiers(param as TSESTree.Node);
    if (identifiers.length === 1 && identifiers[0]) {
      return identifiers[0].name;
    }
    return undefined;
  });
}

function getSecondaryLocations(functionDeclaration: FunctionNodeType | undefined) {
  if (functionDeclaration?.params && functionDeclaration.params.length > 0) {
    const { start, end } = getParametersClauseLocation(functionDeclaration.params);
    return [toSecondaryLocation({ loc: { start, end } }, 'Formal parameters')];
  }
  return [];
}

function getParametersClauseLocation(parameters: Array<estree.Node>) {
  const firstParam = parameters[0] as TSESTree.Node;
  const lastParam = parameters.at(-1) as TSESTree.Node;
  return { start: firstParam.loc.start, end: lastParam.loc.end };
}

function normalizeType(typeAsString: string) {
  switch (typeAsString) {
    case 'String':
      return 'string';
    case 'Boolean':
      return 'boolean';
    case 'Number':
      return 'number';
    default:
      return typeAsString;
  }
}
