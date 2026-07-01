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
// https://sonarsource.github.io/rspec/#/rspec/S2933/javascript

import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta } from '../helpers/generate-meta.js';
import { groupReports } from '../helpers/decorators/grouper.js';
import * as meta from './generated-meta.js';

type ClassNode = TSESTree.ClassDeclaration | TSESTree.ClassExpression;

/**
 * Decorates typescript-eslint/prefer-readonly to raise one issue per class instead
 * of one issue per member. The upstream rule reports all offending members while
 * leaving a class, so the decorator groups only that well-defined reporting window,
 * anchoring the issue on the class name (or the class itself when anonymous).
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return {
    ...groupReports<ClassNode>(rule, {
      listenerSelector: 'ClassDeclaration, ClassExpression:exit',
      getPrimaryLocation: node => node.id ?? node,
      message: 'Mark these members as `readonly`.',
      fallbackSecondaryMessage: 'Member should be marked as `readonly`.',
    }),
    meta: generateMeta(meta, rule.meta),
  };
}
