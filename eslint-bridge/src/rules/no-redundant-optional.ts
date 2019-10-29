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
// https://jira.sonarsource.com/browse/RSPEC-4782

import { Rule } from "eslint";
import * as estree from "estree";
import { TSESTree } from "@typescript-eslint/experimental-utils";
import { toEncodedMessage } from "./utils";
import { isRequiredParserServices } from "../utils/isRequiredParserServices";

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: ["sonar-runtime"],
      },
    ],
  },

  create(context: Rule.RuleContext) {
    if (!isRequiredParserServices(context.parserServices)) {
      return {};
    }

    function checkProperty(node: estree.Node) {
      const tsNode = (node as TSESTree.Node) as
        | TSESTree.ClassProperty
        | TSESTree.TSPropertySignature;
      const optionalToken = context
        .getSourceCode()
        .getFirstToken(node, token => token.value === "?");
      if (!tsNode.optional || !optionalToken) {
        return;
      }

      const typeNode = getUndefinedTypeAnnotation(tsNode.typeAnnotation);
      if (typeNode) {
        const secondaryLocations = [typeNode];
        const message = toEncodedMessage(
          "Consider removing 'undefined' type or '?' specifier, one of them is redundant.",
          secondaryLocations,
        );
        context.report({
          message,
          loc: optionalToken.loc,
        });
      }
    }

    return {
      "ClassProperty, TSPropertySignature": (node: estree.Node) => checkProperty(node),
    };
  },
};

function getUndefinedTypeAnnotation(tsTypeAnnotation?: TSESTree.TSTypeAnnotation) {
  if (tsTypeAnnotation) {
    return getUndefinedTypeNode(tsTypeAnnotation.typeAnnotation);
  }
  return undefined;
}

function getUndefinedTypeNode(typeNode: TSESTree.TypeNode): TSESTree.TypeNode | undefined {
  if (typeNode.type === "TSUndefinedKeyword") {
    return typeNode;
  } else if (typeNode.type === "TSUnionType") {
    return typeNode.types.find(innerTypeNode => getUndefinedTypeNode(innerTypeNode));
  } else if (typeNode.type === "TSParenthesizedType") {
    return getUndefinedTypeNode(typeNode.typeAnnotation);
  }
  return undefined;
}
