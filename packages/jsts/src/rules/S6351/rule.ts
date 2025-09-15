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
// https://sonarsource.github.io/rspec/#/rspec/S6351/javascript

import { Rule, Scope } from 'eslint';
import type estree from 'estree';
import {
  functionLike,
  generateMeta,
  getParent,
  getUniqueWriteUsage,
  getVariableFromName,
  isCallingMethod,
  isDotNotation,
  isMethodCall,
  isRegexLiteral,
  report,
  toSecondaryLocation,
} from '../helpers/index.js';
import * as meta from './generated-meta.js';
import { isRegExpConstructor } from '../helpers/regex/ast.js';
import { getFlags } from '../helpers/regex/flags.js';

type RegexInfo = { node: estree.Node; flags: string };

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    const invocations = new Map<Scope.Variable, estree.CallExpression[]>();
    const regexes: RegexInfo[] = [];
    const resets = new Set<Scope.Variable>();
    return {
      'Literal:exit': (node: estree.Node) => {
        extractRegex(node, regexes);
      },
      'CallExpression:exit': (node: estree.Node) => {
        const callExpr = node as estree.CallExpression;
        extractRegex(node, regexes);
        extractRegexInvocation(callExpr, regexes, invocations, context);
        checkWhileConditionRegex(callExpr, context);
      },
      'MemberExpression:exit': (node: estree.Node) => {
        extractResetRegex(node, regexes, resets, context);
      },
      'NewExpression:exit': (node: estree.Node) => {
        extractRegex(node, regexes);
      },
      'Program:exit': () => {
        for (const regex of regexes) checkGlobalStickyRegex(regex, context);
        for (const [regex, usages] of invocations.entries())
          checkMultipleInputsRegex(regex, usages, resets, context);
      },
    };
  },
};

function extractRegex(node: estree.Node, acc: RegexInfo[]) {
  if (isRegexLiteral(node)) {
    const { flags } = node.regex;
    acc.push({ node, flags });
  } else if (isRegExpConstructor(node)) {
    const flags = getFlags(node) ?? '';
    acc.push({ node, flags });
  }
}

function extractRegexInvocation(
  callExpr: estree.CallExpression,
  regexes: RegexInfo[],
  invocations: Map<Scope.Variable, estree.CallExpression[]>,
  context: Rule.RuleContext,
) {
  if (
    isCallingMethod(callExpr, 1, 'exec', 'test') &&
    callExpr.callee.object.type === 'Identifier'
  ) {
    const { object } = callExpr.callee;
    const variable = getVariableFromName(context, object.name, callExpr);
    if (variable) {
      const value = getUniqueWriteUsage(context, variable.name, callExpr);
      const regex = regexes.find(r => r.node === value);
      if (regex?.flags.includes('g')) {
        const usages = invocations.get(variable);
        if (usages) {
          usages.push(callExpr);
        } else {
          invocations.set(variable, [callExpr]);
        }
      }
    }
  }
}

function extractResetRegex(
  node: estree.Node,
  regexes: RegexInfo[],
  resets: Set<Scope.Variable>,
  context: Rule.RuleContext,
) {
  /* RegExp.prototype.lastIndex = ... */
  if (
    isDotNotation(node) &&
    node.object.type === 'Identifier' &&
    node.property.name === 'lastIndex'
  ) {
    const parent = getParent(context, node);
    if (parent?.type === 'AssignmentExpression' && parent.left === node) {
      const variable = getVariableFromName(context, node.object.name, node);
      if (variable) {
        const value = getUniqueWriteUsage(context, variable.name, node);
        const regex = regexes.find(r => r.node === value);
        if (regex) {
          resets.add(variable);
        }
      }
    }
  }
}

function checkWhileConditionRegex(callExpr: estree.CallExpression, context: Rule.RuleContext) {
  /* RegExp.prototype.exec() within while conditions */
  if (isMethodCall(callExpr)) {
    const { object, property } = callExpr.callee;
    if ((isRegexLiteral(object) || isRegExpConstructor(object)) && property.name === 'exec') {
      const flags = object.type === 'Literal' ? object.regex.flags : getFlags(object);
      if (flags?.includes('g') && isWithinWhileCondition(callExpr, context)) {
        report(context, {
          message: 'Extract this regular expression to avoid infinite loop.',
          node: object,
        });
      }
    }
  }
}

function checkGlobalStickyRegex(regex: RegexInfo, context: Rule.RuleContext) {
  /* RegExp with `g` and `y` flags */
  if (regex.flags.includes('g') && regex.flags.includes('y')) {
    report(context, {
      message: `Remove the 'g' flag from this regex as it is shadowed by the 'y' flag.`,
      node: regex.node,
    });
  }
}

function checkMultipleInputsRegex(
  regex: Scope.Variable,
  usages: estree.CallExpression[],
  resets: Set<Scope.Variable>,
  context: Rule.RuleContext,
) {
  /* RegExp.prototype.exec(input) / RegExp.prototype.test(input) */
  if (!resets.has(regex)) {
    const definition = regex.defs.find(def => def.type === 'Variable' && def.node.init);
    const uniqueInputs = new Set<string>(
      usages.map(callExpr => context.sourceCode.getText(callExpr.arguments[0])),
    );
    const regexReset = uniqueInputs.has(`''`) || uniqueInputs.has(`""`);
    if (definition && uniqueInputs.size > 1 && !regexReset) {
      const pattern = definition.node.init as estree.Expression;
      report(
        context,
        {
          message: `Remove the 'g' flag from this regex as it is used on different inputs.`,
          node: pattern,
        },
        usages.map((node, idx) => toSecondaryLocation(node, `Usage ${idx + 1}`)),
      );
    }
  }
}

function isWithinWhileCondition(node: estree.Node, context: Rule.RuleContext) {
  const ancestors = context.sourceCode.getAncestors(node);
  let parent: estree.Node | undefined;
  let child: estree.Node = node;
  while ((parent = ancestors.pop()) !== undefined) {
    if (functionLike.has(parent.type)) {
      break;
    }
    if (parent.type === 'WhileStatement' || parent.type === 'DoWhileStatement') {
      return parent.test === child;
    }
    child = parent;
  }
  return false;
}
