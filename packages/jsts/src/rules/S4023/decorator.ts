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
// https://sonarsource.github.io/rspec/#/rspec/S4023/javascript

import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, interceptReport, UTILITY_TYPES } from '../helpers/index.js';
import { meta } from './meta.js';

// core implementation of this rule raises issues on empty interface extending TypeScript utility types
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta as Rule.RuleMetaData, rule.meta),
    },
    (context, reportDescriptor) => {
      const id = (reportDescriptor as any).node as TSESTree.Identifier;
      const decl = id.parent as TSESTree.TSInterfaceDeclaration;
      if (decl.extends?.length === 1 && isUtilityType(decl.extends[0])) {
        return;
      }
      context.report(reportDescriptor);
    },
  );
}

function isUtilityType(node: TSESTree.TSInterfaceHeritage) {
  return node.expression.type === 'Identifier' && UTILITY_TYPES.has(node.expression.name);
}
