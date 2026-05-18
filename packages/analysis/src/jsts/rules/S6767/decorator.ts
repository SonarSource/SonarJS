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
import { hasForwardRefCallbackPropUsage } from './forward-ref-indirect-prop-usage.js';
import * as meta from './generated-meta.js';
import { hasSupportedWholePropsUsage } from './whole-props-usage.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    { ...rule, meta: generateMeta(meta, rule.meta) },
    (context, descriptor) => {
      const { node } = descriptor as { node: estree.Node };
      const componentNode = findComponentNode(node, context);
      if (
        componentNode &&
        (hasSupportedWholePropsUsage(componentNode, context) ||
          hasOwnCustomSuperclassPropsForwarding(componentNode))
      ) {
        return;
      }
      // Suppress FP only when the specific reported prop is referenced inside a forwardRef callback.
      const { data } = descriptor as { data?: Record<string, string> };
      const propName = data?.name;
      if (
        propName &&
        componentNode &&
        hasForwardRefCallbackPropUsage(componentNode, context, propName)
      ) {
        return;
      }
      context.report(descriptor);
    },
  );
}
