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
import estree from 'estree';
import { generateMeta, interceptReport } from '../helpers/index.js';
import { meta } from './meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta as Rule.RuleMetaData, rule.meta),
    },
    (context: Rule.RuleContext, descriptor: Rule.ReportDescriptor) => {
      const { node } = descriptor as { node: estree.Node };
      const moduleKeyword = context.sourceCode.getFirstToken(
        node,
        token => token.value === 'module',
      );
      if (moduleKeyword?.loc) {
        context.report({ ...descriptor, loc: moduleKeyword.loc });
      } else {
        context.report(descriptor);
      }
    },
  );
}
