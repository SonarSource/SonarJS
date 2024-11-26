/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S135/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, report, toSecondaryLocation } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, undefined, true),
  create(context: Rule.RuleContext) {
    let jumpTargets: JumpTarget[] = [];

    function enterScope() {
      jumpTargets.push(new JumpTarget());
    }

    function leaveScope() {
      jumpTargets.pop();
    }

    function increateNumberOfJumpsInScopes(jump: estree.Node, label?: string) {
      for (const jumpTarget of [...jumpTargets].reverse()) {
        jumpTarget.jumps.push(jump);
        if (label === jumpTarget.label) {
          break;
        }
      }
    }

    function leaveScopeAndCheckNumberOfJumps(node: estree.Node) {
      const jumps = jumpTargets.pop()?.jumps;
      if (jumps && jumps.length > 1) {
        const sourceCode = context.sourceCode;
        const firstToken = sourceCode.getFirstToken(node);
        report(
          context,
          {
            loc: firstToken!.loc,
            message:
              'Reduce the total number of "break" and "continue" statements in this loop to use one at most.',
          },
          jumps.map(jmp =>
            toSecondaryLocation(
              jmp,
              jmp.type === 'BreakStatement' ? '"break" statement.' : '"continue" statement.',
            ),
          ),
        );
      }
    }

    return {
      Program: () => {
        jumpTargets = [];
      },
      BreakStatement: (node: estree.Node) => {
        const breakStatement = node as estree.BreakStatement;
        increateNumberOfJumpsInScopes(breakStatement, breakStatement.label?.name);
      },
      ContinueStatement: (node: estree.Node) => {
        const continueStatement = node as estree.ContinueStatement;
        increateNumberOfJumpsInScopes(continueStatement, continueStatement.label?.name);
      },
      SwitchStatement: enterScope,
      'SwitchStatement:exit': leaveScope,
      ForStatement: enterScope,
      'ForStatement:exit': leaveScopeAndCheckNumberOfJumps,
      ForInStatement: enterScope,
      'ForInStatement:exit': leaveScopeAndCheckNumberOfJumps,
      ForOfStatement: enterScope,
      'ForOfStatement:exit': leaveScopeAndCheckNumberOfJumps,
      WhileStatement: enterScope,
      'WhileStatement:exit': leaveScopeAndCheckNumberOfJumps,
      DoWhileStatement: enterScope,
      'DoWhileStatement:exit': leaveScopeAndCheckNumberOfJumps,
      LabeledStatement: (node: estree.Node) => {
        const labeledStatement = node as estree.LabeledStatement;
        jumpTargets.push(new JumpTarget(labeledStatement.label.name));
      },
      'LabeledStatement:exit': leaveScope,
    };
  },
};

class JumpTarget {
  label?: string;
  jumps: estree.Node[] = [];

  constructor(label?: string) {
    this.label = label;
  }
}
