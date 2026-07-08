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

import type { Rule } from 'eslint';
import type estree from 'estree';
import { hasOwnCustomSuperclassPropsForwarding } from './custom-superclass-forwarding.js';
import { hasDecoratorPropUsage } from './decorator-indirect-prop-usage.js';
import { hasDestructuredParamPropUsage } from './destructured-param-prop-usage.js';
import { hasForwardRefCallbackPropUsage } from './forward-ref-indirect-prop-usage.js';
import { hasSupportedWholePropsUsage } from './whole-props-usage.js';

export function allMatch(
  componentNodes: estree.Node[],
  predicate: (componentNode: estree.Node) => boolean,
) {
  return componentNodes.length > 0 && componentNodes.every(predicate);
}

export function shouldSuppressFalsePositive(
  componentNodes: estree.Node[],
  context: Rule.RuleContext,
  propName: string | undefined,
): boolean {
  return (
    allMatch(componentNodes, componentNode =>
      hasDestructuredParamPropUsage(componentNode, context, propName),
    ) ||
    allMatch(componentNodes, componentNode =>
      hasOwnCustomSuperclassPropsForwarding(componentNode),
    ) ||
    allMatch(componentNodes, componentNode =>
      hasSupportedWholePropsUsage(componentNode, context),
    ) ||
    allMatch(componentNodes, componentNode =>
      hasForwardRefCallbackPropUsage(componentNode, context, propName),
    ) ||
    allMatch(componentNodes, componentNode =>
      hasDecoratorPropUsage(componentNode, context, propName),
    )
  );
}
