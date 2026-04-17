/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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

import type { Rule } from 'eslint';
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

function collectPatternNames(pattern: estree.Pattern, names: Set<string>): void {
  if (pattern.type === 'Identifier') {
    names.add(pattern.name);
  } else if (pattern.type === 'ArrayPattern') {
    for (const element of pattern.elements) {
      if (element) collectPatternNames(element, names);
    }
  } else if (pattern.type === 'ObjectPattern') {
    for (const prop of pattern.properties) {
      if (prop.type === 'Property') {
        collectPatternNames(prop.value as estree.Pattern, names);
      } else {
        collectPatternNames((prop as estree.RestElement).argument, names);
      }
    }
  } else if (pattern.type === 'AssignmentPattern') {
    collectPatternNames(pattern.left, names);
  } else if (pattern.type === 'RestElement') {
    collectPatternNames(pattern.argument, names);
  }
}

function getForLoopVarNames(forLoop: estree.Node): Set<string> {
  const names = new Set<string>();
  let varDecl: estree.VariableDeclaration | undefined;
  if (forLoop.type === 'ForStatement') {
    const init = (forLoop as estree.ForStatement).init;
    if (
      init?.type === 'VariableDeclaration' &&
      (init as estree.VariableDeclaration).kind === 'var'
    ) {
      varDecl = init as estree.VariableDeclaration;
    }
  } else if (forLoop.type === 'ForInStatement' || forLoop.type === 'ForOfStatement') {
    const left = (forLoop as estree.ForInStatement | estree.ForOfStatement).left;
    if (
      left.type === 'VariableDeclaration' &&
      (left as estree.VariableDeclaration).kind === 'var'
    ) {
      varDecl = left as estree.VariableDeclaration;
    }
  }
  if (varDecl) {
    for (const declarator of varDecl.declarations) {
      collectPatternNames(declarator.id, names);
    }
  }
  return names;
}

function isInsideDisjointLoop(
  ref: estree.Identifier,
  forLoopRange: [number, number],
  declaringLoopVarNames: Set<string>,
): boolean {
  let node: estree.Node | undefined = (ref as unknown as { parent?: estree.Node }).parent;
  while (node) {
    if (node.type === 'Program') {
      return false;
    }
    if (isForLoopNode(node) && node.range) {
      const [s, e] = node.range;
      if (e < forLoopRange[0] || s > forLoopRange[1]) {
        const refLoopVarNames = getForLoopVarNames(node);
        if (
          refLoopVarNames.size > 0 &&
          [...refLoopVarNames].some(n => declaringLoopVarNames.has(n))
        ) {
          return true;
        }
      }
    }
    node = (node as unknown as { parent?: estree.Node }).parent;
  }
  return false;
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

          const varDeclParent = (varDeclaration as unknown as { parent?: estree.Node }).parent;
          if (isForLoopNode(varDeclParent) && varDeclParent!.range) {
            const forLoopRange = varDeclParent!.range as [number, number];
            const declaringLoopVarNames = new Set(
              context.sourceCode.getDeclaredVariables(node).map(v => v.name),
            );
            if (
              referencesOutside.every(ref =>
                isInsideDisjointLoop(ref, forLoopRange, declaringLoopVarNames),
              )
            ) {
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
