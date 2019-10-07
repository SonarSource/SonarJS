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

import { Rule } from "eslint";
import * as estree from "estree";
import { AST_NODE_TYPES, TSESTree } from "@typescript-eslint/experimental-utils";

const MESSAGE =
  "Consider using '?' syntax to declare this property instead of 'undefined' in its type.";
const MESSSAGE_REDUNDANT_UNDEFINED = "Consider removing redundant 'undefined' type";

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext): Rule.RuleListener {
    return {
      ClassProperty: (node: estree.Node) => {
        return checkProperty(node as any, context);
      },
      TSPropertySignature: (node: estree.Node) => {
        return checkProperty(node as any, context);
      },
    };
  },
};

function checkProperty(
  node: TSESTree.ClassProperty | TSESTree.TSPropertySignature,
  context: Rule.RuleContext,
): void {
  const type = node.typeAnnotation;

  if (type === undefined) {
    return;
  }

  const explicitUndefined = isExplicitUndefined(type);
  const alreadyOptional = node.optional;

  if (explicitUndefined && !alreadyOptional) {
    context.report({
      message: MESSAGE,
      loc: node.loc,
    });
  }

  if (explicitUndefined && alreadyOptional) {
    context.report({
      message: MESSSAGE_REDUNDANT_UNDEFINED,
      loc: node.loc,
    });
  }
}

function isExplicitUndefined(type: TSESTree.TSTypeAnnotation) {
  if (type.typeAnnotation.type === AST_NODE_TYPES.TSUnionType) {
    return type.typeAnnotation.types.some(node => node.type === AST_NODE_TYPES.TSUndefinedKeyword);
  }
}
