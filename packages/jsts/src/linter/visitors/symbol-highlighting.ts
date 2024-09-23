/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import { AST } from 'vue-eslint-parser';
import { convertLocation, extractTokensAndComments, Location } from './metrics/helpers/index.js';

/**
 * A symbol highlight
 *
 * @param declaration the location where the symbol is declared
 * @param references the locations where the symbol is referenced
 */
export interface SymbolHighlight {
  declaration: Location;
  references: Location[];
}

/**
 * A rule for computing the symbol highlighting of the source code
 *
 * We use an ESLint rule as we need to access declared variables which
 * are only available only through the rule context.
 */
export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    let variables: Set<Scope.Variable>;

    /*
       Remove TypeAnnotation part from location of identifier for purpose of symbol highlighting.
       This was motivated by following code

         var XMLHttpRequest: {
           new(): XMLHttpRequest; // this is reference to var, not interface
         };
         interface XMLHttpRequest  {}

       where XMLHttpRequest is both type and variable name. Issue type annotation inside the variable declaration
       is reference to the variable (this is likely a bug in parser), which causes overlap between declaration and
       reference, which makes SQ API fail with RuntimeException. As a workaround we remove TypeAnnotation part of
       identifier node from its location, so no overlap is possible (arguably this is also better UX for symbol
       highlighting).
     */
    function identifierLocation(node: TSESTree.Node) {
      const source = context.sourceCode;
      const loc = {
        start: node.loc.start,
        end:
          node.type === 'Identifier' && node.typeAnnotation
            ? source.getLocFromIndex(node.typeAnnotation.range[0])
            : node.loc.end,
      };
      return convertLocation(loc);
    }

    return {
      Program() {
        // clear "variables" for each file
        variables = new Set();
      },
      '*': (node: estree.Node) => {
        context.getDeclaredVariables(node).forEach(v => variables.add(v));
      },
      'Program:exit': (node: estree.Node) => {
        const result: SymbolHighlight[] = [];
        variables.forEach(v => {
          // if variable is initialized during declaration it is part of references as well
          // so we merge declarations and references to remove duplicates and take the earliest in the file as the declaration
          const allRef = [
            ...new Set([...v.defs.map(d => d.name), ...v.references.map(r => r.identifier)]),
          ]
            .filter(i => !!i.loc)
            .sort((a, b) => a.loc!.start.line - b.loc!.start.line);
          if (allRef.length === 0) {
            // defensive check, this should never happen
            return;
          }
          const highlightedSymbol: SymbolHighlight = {
            declaration: identifierLocation(allRef[0] as TSESTree.Node),
            references: allRef.slice(1).map(r => identifierLocation(r as TSESTree.Node)),
          };
          result.push(highlightedSymbol);
        });

        const openCurlyBracesStack: AST.Token[] = [];
        const openHtmlTagsStack: AST.Token[] = [];
        extractTokensAndComments(context.sourceCode).tokens.forEach(token => {
          switch (token.type) {
            case 'Punctuator':
              if (token.value === '{') {
                openCurlyBracesStack.push(token);
              } else if (token.value === '}') {
                const highlightedSymbol: SymbolHighlight = {
                  declaration: convertLocation(openCurlyBracesStack.pop()!.loc),
                  references: [convertLocation(token.loc)],
                };
                result.push(highlightedSymbol);
              }
              break;
            case 'HTMLTagOpen':
              openHtmlTagsStack.push(token);
              break;
            case 'HTMLSelfClosingTagClose':
              openHtmlTagsStack.pop();
              break;
            case 'HTMLEndTagOpen': {
              const openHtmlTag = openHtmlTagsStack.pop();
              if (openHtmlTag) {
                const highlightedSymbol: SymbolHighlight = {
                  declaration: convertLocation(openHtmlTag.loc),
                  references: [convertLocation(token.loc)],
                };
                result.push(highlightedSymbol);
              }
              break;
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
