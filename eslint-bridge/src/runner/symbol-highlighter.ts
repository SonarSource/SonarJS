/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import { Rule, Scope, AST } from "eslint";
import * as estree from "estree";
import { Location } from "./location";

export const symbolHighlightingRuleId = "internal-symbol-highlighting";

/**
 * Using rule as we need to access declared variables which are available only with RuleContext
 */
export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    let variables: Set<Scope.Variable>;
    return {
      Program() {
        // clear "variables" for each file
        variables = new Set();
      },
      "*": (node: estree.Node) => {
        context.getDeclaredVariables(node).forEach(v => variables.add(v));
      },
      "Program:exit": (node: estree.Node) => {
        const result: HighlightedSymbol[] = [];
        variables.forEach(v => {
          // if variable is initialized during declaration it is part of references as well
          // so we merge declarations and references to remove duplicates and take the earliest in the file as the declaration
          const allRef = [...new Set([...v.identifiers, ...v.references.map(r => r.identifier)])]
            .filter(i => !!i.loc)
            .sort((a, b) => a.loc!.start.line - b.loc!.start.line);
          const declaration = allRef[0];
          const highlightedSymbol: HighlightedSymbol = {
            declaration: location(declaration.loc!),
            references: allRef.slice(1).map(r => location(r.loc!)),
          };
          result.push(highlightedSymbol);
        });

        const openCurlyBracesStack: AST.Token[] = [];
        context.getSourceCode().ast.tokens.forEach(token => {
          if (token.type === "Punctuator") {
            if (token.value === "{") {
              openCurlyBracesStack.push(token);
            }
            if (token.value === "}") {
              const highlightedSymbol: HighlightedSymbol = {
                declaration: location(openCurlyBracesStack.pop()!.loc),
                references: [location(token.loc)],
              };
              result.push(highlightedSymbol);
            }
          }
        });

        // as issues are the only communication channel of a rule
        // we pass data as serialized json as an issue message
        context.report({ node, message: JSON.stringify(result) });
      },
    };
  },
};

export interface HighlightedSymbol {
  declaration: Location;
  references: Location[];
}

function location(loc: estree.SourceLocation) {
  return {
    startLine: loc.start.line,
    startCol: loc.start.column,
    endLine: loc.end.line,
    endCol: loc.end.column,
  };
}
