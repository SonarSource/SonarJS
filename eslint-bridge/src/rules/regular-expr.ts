/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-4784

import { Rule } from "eslint";
import * as estree from "estree";
import { isMemberWithProperty, getModuleNameOfIdentifier } from "./utils";

const stringMethods = ["match", "search", "replace", "split"];
const regexMethods = ["exec", "test"];

const message = "Make sure that using a regular expression is safe here.";

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      CallExpression(node: estree.Node) {
        const { callee, arguments: args } = node as estree.CallExpression;
        checkStringMethods(callee, args, context);
        checkRegexMethods(callee, args, context);
      },
    };
  },
};

function checkStringMethods(callee: estree.Node, args: estree.Node[], context: Rule.RuleContext) {
  if (isMemberWithProperty(callee, ...stringMethods) && args[0] && !isStringLiteral(args[0])) {
    report(args[0], context);
  }
}

function checkRegexMethods(callee: estree.Node, args: estree.Node[], context: Rule.RuleContext) {
  if (
    callee.type === "MemberExpression" &&
    isMemberWithProperty(callee, ...regexMethods) &&
    args.length === 1 &&
    !isChildProcess(callee.object, context)
  ) {
    report(callee.object, context);
  }
}

function report(node: estree.Node, context: Rule.RuleContext) {
  if (!isSafeRegexLiteral(node)) {
    context.report({
      message,
      node,
    });
  }
}

function isStringLiteral(node: estree.Node) {
  return node.type === "Literal" && typeof node.value === "string";
}

function isSafeRegexLiteral(node: estree.Node) {
  if (node.type === "Literal" && (node as estree.RegExpLiteral).regex) {
    const pattern = (node as estree.RegExpLiteral).regex.pattern;
    return pattern.length <= 1 || pattern.match(/^[\^$\w\\]+$/);
  }

  return false;
}

function isChildProcess(node: estree.Node, context: Rule.RuleContext) {
  const module = node.type === "Identifier" && getModuleNameOfIdentifier(node, context);
  return module && module.value === "child_process";
}
