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
import type { TSESTree } from '@typescript-eslint/utils';
import { getCompoundSelector, getOutputMemberName } from './angular.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import * as meta from './generated-meta.js';

const COMPOUND_SELECTOR = /^([A-Za-z][A-Za-z0-9-]*)\[([A-Za-z][A-Za-z0-9-]*)\]$/;

/** `changed` -> `Changed`. */
function capitalize(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}

/** Suppress reports for selector-derived directive aliases; preserve all other upstream reports. */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      if (
        !('node' in reportDescriptor) ||
        !isSelectorDerivedAlias(reportDescriptor.node as TSESTree.Node)
      ) {
        context.report(reportDescriptor);
      }
    },
  );
}

/**
 * Match the alias to the selector and member name:
 *
 *   @Directive({ selector: 'foo[bar]' })
 *   class FooBarDirective {
 *     @Output('fooBar') event = ...;
 *     @Output('fooBarChanged') changed = ...;
 *     // Or: changed = output({ alias: 'fooBarChanged' });
 *   }
 *
 *   'fooBar' === 'foo' + capitalize('bar')
 *   'fooBarChanged' === 'fooBar' + capitalize('changed')
 *
 * Components, unsupported selectors, and mismatched aliases do not match.
 * This pattern does not prove a collision in a consuming template.
 */
function isSelectorDerivedAlias(node: TSESTree.Node) {
  if (node.type !== 'Literal' || typeof node.value !== 'string') {
    return false;
  }
  const memberName = getOutputMemberName(node);
  const selector = getCompoundSelector(node);
  const match = selector?.match(COMPOUND_SELECTOR);
  if (memberName === undefined || node.value === memberName || !match) {
    return false;
  }
  const selectorIdentity = `${match[1]}${capitalize(match[2])}`;
  return (
    node.value === selectorIdentity || node.value === `${selectorIdentity}${capitalize(memberName)}`
  );
}
