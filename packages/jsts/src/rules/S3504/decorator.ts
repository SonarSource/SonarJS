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
import type { Rule } from 'eslint';
import { generateMeta, interceptReport } from '../helpers/index.js';
import estree from 'estree';
import { meta } from './meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta as Rule.RuleMetaData, rule.meta),
    },
    (context, reportDescriptor) => {
      if ('node' in reportDescriptor) {
        const { node, ...rest } = reportDescriptor;
        const {
          declarations: [firstDecl, ..._],
        } = node as estree.VariableDeclaration;

        const varToken = context.sourceCode.getTokenBefore(firstDecl.id);
        const identifierEnd = firstDecl.id.loc!.end;
        if (varToken == null) {
          // impossible
          return;
        }
        context.report({
          loc: {
            start: varToken.loc.start,
            end: identifierEnd,
          },
          ...rest,
        });
      }
    },
  );
}
