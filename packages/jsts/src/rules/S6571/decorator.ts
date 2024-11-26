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
// https://sonarsource.github.io/rspec/#/rspec/S6571/javascript

import type { Rule } from 'eslint';
import { generateMeta, interceptReport } from '../helpers/index.js';
import { TSESTree } from '@typescript-eslint/utils';
import { meta } from './meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta as Rule.RuleMetaData, rule.meta),
    },
    reportExempting,
  );
}

function reportExempting(context: Rule.RuleContext, descriptor: Rule.ReportDescriptor) {
  if ('node' in descriptor) {
    const { node, ...rest } = descriptor;
    if (exemptionCondition(node as TSESTree.Node, descriptor)) {
      return;
    }
    context.report({ node, ...rest });
  }
}

// We ignore issues where typeName is 'any' but not raised for the 'any' keyword as they are due to unresolved types.
// The same exception applies for the 'unknown' type.
function exemptionCondition(node: TSESTree.Node, descriptor: Rule.ReportDescriptor) {
  const data = descriptor.data;
  return (
    (data?.['typeName'] === 'any' && node.type !== 'TSAnyKeyword') ||
    (data?.['typeName'] === 'unknown' && node.type !== 'TSUnknownKeyword')
  );
}
