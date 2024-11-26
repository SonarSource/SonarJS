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
// https://sonarsource.github.io/rspec/#/rspec/S2486/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, getVariableFromScope } from '../helpers/index.js';
import { meta } from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    messages: {
      handleException: "Handle this exception or don't catch it at all.",
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      'CatchClause[param.type="Identifier"]'(node: estree.CatchClause) {
        const param = node.param as estree.Identifier;
        const scope = context.sourceCode.getScope(node);
        const variable = getVariableFromScope(scope, param.name);
        if (variable?.references.length === 0) {
          context.report({
            messageId: 'handleException',
            node,
          });
        }
      },
    };
  },
};
