/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S6767/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { interceptReportForReact } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { findComponentNodes } from '../helpers/react.js';
import { hasOwnCustomSuperclassPropsForwarding } from './custom-superclass-forwarding.js';
import { hasDecoratorPropUsage } from './decorator-indirect-prop-usage.js';
import { hasForwardRefCallbackPropUsage } from './forward-ref-indirect-prop-usage.js';
import * as meta from './generated-meta.js';
import { hasOnlyNonPropsReportedTypeUsage } from './reported-type-non-props-usage.js';
import { hasSupportedWholePropsUsage } from './whole-props-usage.js';

const reportedDescriptorsBySourceCode = new WeakMap<Rule.RuleContext['sourceCode'], Set<string>>();
type ComponentNodeSuppressor = (componentNode: estree.Node) => boolean;

function allMatch(
  componentNodes: estree.Node[],
  predicate: (componentNode: estree.Node) => boolean,
): boolean {
  return componentNodes.length > 0 && componentNodes.every(predicate);
}

function shouldSuppressForAllComponentOwners(
  componentNodes: estree.Node[],
  context: Rule.RuleContext,
  propName: string | undefined,
): boolean {
  const suppressors: ComponentNodeSuppressor[] = [
    componentNode => hasSupportedWholePropsUsage(componentNode, context),
    componentNode => hasOwnCustomSuperclassPropsForwarding(componentNode),
    componentNode => hasForwardRefCallbackPropUsage(componentNode, context, propName),
    componentNode => hasDecoratorPropUsage(componentNode, context, propName),
  ];

  return suppressors.some(suppressor => allMatch(componentNodes, suppressor));
}

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    { ...rule, meta: generateMeta(meta, rule.meta) },
    (context, descriptor) => {
      const { node } = descriptor as { node: estree.Node };
      const { data } = descriptor as { data?: Record<string, string> };
      const propName = data?.name;

      if (hasOnlyNonPropsReportedTypeUsage(node, context)) {
        return;
      }

      const componentNodes = findComponentNodes(node, context);
      if (shouldSuppressForAllComponentOwners(componentNodes, context, propName)) {
        return;
      }

      const reportedDescriptors = getReportedDescriptors(context.sourceCode);
      const reportKey = getReportKey(node, propName);
      if (reportedDescriptors.has(reportKey)) {
        return;
      }
      reportedDescriptors.add(reportKey);
      context.report(descriptor);
    },
  );
}

function getReportedDescriptors(sourceCode: Rule.RuleContext['sourceCode']): Set<string> {
  let reportedDescriptors = reportedDescriptorsBySourceCode.get(sourceCode);
  if (!reportedDescriptors) {
    reportedDescriptors = new Set<string>();
    reportedDescriptorsBySourceCode.set(sourceCode, reportedDescriptors);
  }
  return reportedDescriptors;
}

function getReportKey(node: estree.Node, propName: string | undefined): string {
  const [start = -1, end = -1] = node.range ?? [];
  return `${start}:${end}:${propName ?? ''}`;
}
