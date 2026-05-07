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
import { findComponentNode } from '../helpers/react.js';
import { hasOwnCustomSuperclassPropsForwarding } from './custom-superclass-forwarding.js';
import { hasDecoratorPropUsage } from './decorator-indirect-prop-usage.js';
import { hasForwardRefCallbackPropUsage } from './forward-ref-indirect-prop-usage.js';
import * as meta from './generated-meta.js';
import { hasSupportedWholePropsUsage } from './whole-props-usage.js';

/**
 * Decorates `react/no-unused-prop-types` with SonarJS-specific false-positive
 * remediations for indirect props usage patterns:
 * - supported whole-props handoff patterns
 * - forwarding to a custom non-React superclass
 * - `forwardRef` callbacks that close over the component props binding
 * - typed decorator callbacks that consume component props indirectly
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    { ...rule, meta: generateMeta(meta, rule.meta) },
    (context, descriptor) => {
      const { node, data } = descriptor as { node: estree.Node; data?: Record<string, string> };
      const componentNode = findComponentNode(node, context);
      const propName = data?.name;

      // FP remediation escape 1:
      // the component already consumes whole props through a supported pattern such as
      // helper-call forwarding, spread usage, or computed access.
      if (hasSupportedWholePropsUsage(componentNode, context.sourceCode.visitorKeys)) {
        return;
      }

      // FP remediation escape 2:
      // the component constructor forwards `props` to its own non-React superclass,
      // which this decorator treats as sufficient indirect usage.
      if (hasOwnCustomSuperclassPropsForwarding(componentNode, context)) {
        return;
      }

      // FP remediation escape 3:
      // the specific reported prop is consumed inside a `forwardRef` callback that
      // closes over the component's original props binding.
      if (hasForwardRefCallbackPropUsage(context.sourceCode, componentNode, propName)) {
        return;
      }

      // FP remediation escape 4:
      // the specific reported prop is consumed through a typed decorator callback,
      // either on a decorator factory call or on a class decorator annotation.
      if (hasDecoratorPropUsage(context.sourceCode, componentNode, propName)) {
        return;
      }

      context.report(descriptor);
    },
  );
}
