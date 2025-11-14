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
// https://sonarsource.github.io/rspec/#/rspec/S2870/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta, getParent, isArray, isRequiredParserServices } from '../helpers/index.js';
import * as meta from './generated-meta.js';

const ArrayDeleteExpression =
  "UnaryExpression[operator='delete'] > MemberExpression[computed=true]";

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      removeDelete: 'Remove this use of "delete".',
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (isRequiredParserServices(services)) {
      return {
        [ArrayDeleteExpression]: (node: estree.Node) => {
          const member = node as estree.MemberExpression;
          const object = member.object;
          if (isArray(object, services)) {
            raiseIssue(context, node);
          }
        },
      };
    }
    return {};
  },
};

function raiseIssue(context: Rule.RuleContext, node: estree.Node): void {
  const deleteKeyword = context.sourceCode.getFirstToken(getParent(context, node)!);
  context.report({
    messageId: 'removeDelete',
    loc: deleteKeyword!.loc,
  });
}
