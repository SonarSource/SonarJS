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
// https://sonarsource.github.io/rspec/#/rspec/S2392/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import { SONAR_RUNTIME } from '../../linter/parameters';
import { generateMeta } from '../helpers/generate-meta';
import rspecMeta from '../S101/meta.json';
import { report, toSecondaryLocation } from '../helpers';

export const rule: Rule.RuleModule = {
  meta: generateMeta(rspecMeta as Rule.RuleMetaData, {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: [SONAR_RUNTIME],
      },
    ],
  }),
  create(context: Rule.RuleContext) {
    let scopeRanges: [number, number][] = [];
    let reported: estree.Identifier[] = [];

    function enterScope(node: estree.Node) {
      scopeRanges.push(node.range!);
    }

    function exitScope() {
      scopeRanges.pop();
    }

    return {
      Program(node) {
        scopeRanges = [node.range!];
        reported = [];
      },

      BlockStatement: enterScope,
      'BlockStatement:exit': exitScope,
      ForStatement: enterScope,
      'ForStatement:exit': exitScope,
      ForInStatement: enterScope,
      'ForInStatement:exit': exitScope,
      ForOfStatement: enterScope,
      'ForOfStatement:exit': exitScope,
      SwitchStatement: enterScope,
      'SwitchStatement:exit': exitScope,

      VariableDeclaration: (node: estree.Node) => {
        const varDeclaration = node as estree.VariableDeclaration;

        if (varDeclaration.kind !== 'var') {
          return;
        }

        const scopeRange = scopeRanges[scopeRanges.length - 1];

        function isOutsideOfScope(reference: estree.Identifier) {
          const idRange = reference.range!;
          return idRange[0] < scopeRange[0] || idRange[1] > scopeRange[1];
        }

        context.sourceCode.getDeclaredVariables(node).forEach(variable => {
          const referencesOutside = variable.references
            .map(ref => ref.identifier)
            .filter(isOutsideOfScope);
          if (referencesOutside.length === 0) {
            return;
          }
          const definition = variable.defs.find(def =>
            varDeclaration.declarations.includes(def.node),
          );
          if (definition && !reported.includes(definition.name)) {
            report(
              context,
              {
                node: definition.name,
                message:
                  `Consider moving declaration of '${variable.name}' ` +
                  `as it is referenced outside current binding context.`,
              },
              referencesOutside.map(node => toSecondaryLocation(node, 'Outside reference.')),
            );
            variable.defs.map(def => def.name).forEach(defId => reported.push(defId));
          }
        });
      },
    };
  },
};
