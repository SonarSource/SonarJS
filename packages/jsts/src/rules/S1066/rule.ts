/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S1066

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta, report, toSecondaryLocation } from '../helpers/index.js';
import * as meta from './generated-meta.js';

const message = 'Merge this if statement with the nested one.';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      mergeNestedIfStatement: message,
    },
  }),
  create(context) {
    return {
      IfStatement(node: estree.IfStatement) {
        let { consequent } = node;
        if (consequent.type === 'BlockStatement' && consequent.body.length === 1) {
          consequent = consequent.body[0];
        }
        if (isIfStatementWithoutElse(node) && isIfStatementWithoutElse(consequent)) {
          const ifKeyword = context.sourceCode.getFirstToken(consequent);
          const enclosingIfKeyword = context.sourceCode.getFirstToken(node);
          if (ifKeyword && enclosingIfKeyword) {
            report(
              context,
              {
                messageId: 'mergeNestedIfStatement',
                message,
                loc: enclosingIfKeyword.loc,
              },
              [toSecondaryLocation(ifKeyword, 'Nested "if" statement.')],
            );
          }
        }
      },
    };
  },
};

function isIfStatementWithoutElse(node: estree.Node): node is estree.IfStatement {
  return node.type === 'IfStatement' && !node.alternate;
}
