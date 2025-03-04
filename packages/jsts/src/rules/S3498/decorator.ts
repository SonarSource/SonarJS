/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S3498/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, interceptReport } from '../helpers/index.js';
import * as meta from './meta.js';

// core implementation of this rule raises issues on aura lightning components
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    reportExempting(isAuraLightningComponent),
  );
}

function reportExempting(
  exemptionCondition: (property: TSESTree.Property) => boolean,
): (context: Rule.RuleContext, reportDescriptor: Rule.ReportDescriptor) => void {
  return (context, reportDescriptor) => {
    if ('node' in reportDescriptor) {
      const property = reportDescriptor['node'] as TSESTree.Property;
      if (!exemptionCondition(property)) {
        context.report({ ...reportDescriptor, node: property.key as estree.Node });
      }
    }
  };
}

function isAuraLightningComponent(property: TSESTree.Property) {
  const { parent, value } = property;
  return (
    parent!.parent!.type === 'ExpressionStatement' &&
    parent!.parent!.parent!.type === 'Program' &&
    value.type === 'FunctionExpression'
  );
}
