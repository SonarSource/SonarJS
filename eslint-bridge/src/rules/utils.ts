/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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
import { Rule } from "eslint";
import * as estree from "estree";

export function getModuleFromIdentifier(expression: estree.Identifier, context: Rule.RuleContext) {
  const { name } = expression;
  const importDeclaration = getImportDeclarations(context).find(importDecl =>
    checkNamespaceSpecifier(importDecl, name),
  );
  if (importDeclaration) {
    return importDeclaration.source;
  }

  const variable = context.getScope().variables.find(value => value.name === name);
  if (variable) {
    const writeReferences = variable.references.filter(reference => reference.isWrite());
    if (writeReferences.length === 1 && writeReferences[0].writeExpr) {
      return getModuleName(writeReferences[0].writeExpr!);
    }
  }
  return undefined;
}

export function getModuleFromImportedIdentifier(
  identifier: estree.Identifier,
  context: Rule.RuleContext,
) {
  const importedDeclaration = getImportDeclarations(context).find(importDeclaration =>
    importDeclaration.specifiers.some(
      spec => spec.type === "ImportSpecifier" && spec.imported.name === identifier.name,
    ),
  );
  if (importedDeclaration) {
    return importedDeclaration.source;
  }
  return undefined;
}

function getImportDeclarations(context: Rule.RuleContext) {
  const program = context.getAncestors().find(node => node.type === "Program") as estree.Program;
  if (program.sourceType === "module") {
    return program.body.filter(
      node => node.type === "ImportDeclaration",
    ) as estree.ImportDeclaration[];
  }
  return [];
}

function checkNamespaceSpecifier(importDeclaration: estree.ImportDeclaration, name: string) {
  return importDeclaration.specifiers.some(
    ({ type, local }) => type === "ImportNamespaceSpecifier" && local.name === name,
  );
}

function getModuleName(node: estree.Node) {
  if (
    node.type === "CallExpression" &&
    node.callee.type === "Identifier" &&
    node.callee.name === "require" &&
    node.arguments.length === 1
  ) {
    const moduleName = node.arguments[0];
    if (moduleName.type === "Literal") {
      return moduleName;
    }
  }
}
