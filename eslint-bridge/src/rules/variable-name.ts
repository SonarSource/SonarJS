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
// https://jira.sonarsource.com/browse/RSPEC-117

import { Rule } from "eslint";
import * as estree from "estree";
import { TSESTree } from "@typescript-eslint/experimental-utils";

interface FunctionLike {
  declare?: boolean;
  params: TSESTree.Parameter[];
}

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    return {
      VariableDeclaration: (node: estree.Node) =>
        checkVariable(node as TSESTree.VariableDeclaration, context),
      "FunctionDeclaration, FunctionExpression, ArrowFunctionExpression, TSMethodSignature, TSConstructSignatureDeclaration, TSEmptyBodyFunctionExpression": (
        node: estree.Node,
      ) => checkFunction(node as FunctionLike, context),
      ClassProperty: (node: estree.Node) =>
        checkProperty((node as unknown) as TSESTree.ClassProperty, context),
      CatchClause: (node: estree.Node) => checkCatch(node as TSESTree.CatchClause, context),
    };
  },
};

function checkVariable(decl: TSESTree.VariableDeclaration, context: Rule.RuleContext) {
  if (decl.declare) {
    return;
  }
  decl.declarations.forEach(declaration =>
    resolveIdentifiers(declaration.id).forEach(id =>
      raiseOnInvalidIdentifier(id, "local variable", context),
    ),
  );
}

function checkFunction(func: FunctionLike, context: Rule.RuleContext) {
  if (func.declare) {
    return;
  }
  func.params.forEach(param =>
    resolveIdentifiers(param).forEach(id => raiseOnInvalidIdentifier(id, "parameter", context)),
  );
}

function checkProperty(prop: TSESTree.ClassProperty, context: Rule.RuleContext) {
  if (prop.key.type === "Identifier") {
    raiseOnInvalidIdentifier(prop.key, "property", context);
  }
}

function checkCatch(catchh: TSESTree.CatchClause, context: Rule.RuleContext) {
  if (catchh.param) {
    resolveIdentifiers(catchh.param).forEach(id =>
      raiseOnInvalidIdentifier(id, "parameter", context),
    );
  }
}

function raiseOnInvalidIdentifier(
  id: TSESTree.Identifier,
  idType: string,
  context: Rule.RuleContext,
) {
  const [{ format }] = context.options;
  const { name } = id;
  if (!name.match(format)) {
    context.report({
      message: `Rename this ${idType} "${name}" to match the regular expression ${format}.`,
      node: id,
    });
  }
}

function resolveIdentifiers(node: TSESTree.Node): TSESTree.Identifier[] {
  const identifiers: TSESTree.Identifier[] = [];
  resolveIdentifiersAcc(node, identifiers);
  return identifiers;
}

function resolveIdentifiersAcc(node: TSESTree.Node, identifiers: TSESTree.Identifier[]): void {
  switch (node.type) {
    case "Identifier":
      identifiers.push(node);
      break;
    case "ObjectPattern":
      node.properties.forEach(prop => resolveIdentifiersAcc(prop, identifiers));
      break;
    case "ArrayPattern":
      node.elements.forEach(elem => resolveIdentifiersAcc(elem, identifiers));
      break;
    case "Property":
      if (!node.shorthand) {
        resolveIdentifiersAcc(node.value, identifiers);
      }
      break;
    case "RestElement":
      resolveIdentifiersAcc(node.argument, identifiers);
      break;
    case "AssignmentPattern":
      resolveIdentifiersAcc(node.left, identifiers);
      break;
    case "TSParameterProperty":
      resolveIdentifiersAcc(node.parameter, identifiers);
      break;
  }
}
