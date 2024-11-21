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
// https://sonarsource.github.io/rspec/#/rspec/S6551/javascript

import { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import { generateMeta, interceptReport, isGenericType } from '../helpers/index.js';
import { meta } from './meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta as Rule.RuleMetaData, rule.meta),
    },
    (context, reportDescriptor) => {
      if ('node' in reportDescriptor) {
        const services = context.sourceCode.parserServices;
        if (isGenericType(reportDescriptor.node as TSESTree.Node, services)) {
          // we skip
        } else {
          context.report(reportDescriptor);
        }
      }
    },
  );
}
