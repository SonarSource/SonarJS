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
// https://sonarsource.github.io/rspec/#/rspec/S2392/javascript

import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { last } from '../helpers/collection.js';
import { report, toSecondaryLocation } from '../helpers/location.js';
import * as meta from './generated-meta.js';

function isForLoopNode(node: { type?: string } | null | undefined): boolean {
  return (
    node?.type === 'ForStatement' ||
    node?.type === 'ForInStatement' ||
    node?.type === 'ForOfStatement'
  );
}

function getOtherLoopRanges(
  variable: Scope.Variable,
  varDeclaration: estree.VariableDeclaration,
): [number, number][] {
  const ranges: [number, number][] = [];
  for (const def of variable.defs) {
    if (varDeclaration.declarations.includes(def.node as estree.VariableDeclarator)) {
      continue;
    }
    const loopNode = (def.node as unknown as { parent?: { parent?: estree.Node } }).parent?.parent;
    const loopRange = loopNode?.range;
    if (isForLoopNode(loopNode) && loopRange) {
      ranges.push(loopRange);
    }
  }
  return ranges;
}

function isCoveredByOtherLoops(
  referencesOutside: estree.Identifier[],
  otherLoopRanges: [number, number][],
): boolean {
  if (otherLoopRanges.length === 0) {
    return false;
  }
  return referencesOutside.every(ref => {
    const range = ref.range;
    return range !== undefined && otherLoopRanges.some(([s, e]) => range[0] >= s && range[1] <= e);
  });
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
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

        const scopeRange = last(scopeRanges);

        function isOutsideOfScope(reference: estree.Identifier) {
          const idRange = reference.range!;
          return idRange[0] < scopeRange[0] || idRange[1] > scopeRange[1];
        }

        for (const variable of context.sourceCode.getDeclaredVariables(node)) {
          const referencesOutside = variable.references
            .map(ref => ref.identifier)
            .filter(isOutsideOfScope);
          if (referencesOutside.length === 0) {
            continue;
          }

          const varDeclParent = (varDeclaration as unknown as { parent?: { type?: string } })
            .parent;
          if (isForLoopNode(varDeclParent)) {
            const otherLoopRanges = getOtherLoopRanges(variable, varDeclaration);
            if (isCoveredByOtherLoops(referencesOutside, otherLoopRanges)) {
              continue;
            }
          }

          const definition = variable.defs.find(def =>
            varDeclaration.declarations.includes(def.node as estree.VariableDeclarator),
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
            for (const defId of variable.defs.map(def => def.name)) {
              reported.push(defId);
            }
          }
        }
      },
    };
  },
};
