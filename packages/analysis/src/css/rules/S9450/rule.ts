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
// https://sonarsource.github.io/rspec/#/rspec/S9450/css
import stylelint from 'stylelint';
import type PostCSS from 'postcss';
import { createDecoratedRule, type DecoratedMessage } from '../helpers/decorated-result.js';

const SONAR_RULE = 'sonar/declaration-block-no-duplicate-custom-properties';
const UPSTREAM_RULE = 'declaration-block-no-duplicate-custom-properties';

export const messages = {
  duplicate: (property: string): string =>
    `Remove or correct this duplicate "${property}" declaration to avoid competing values in the same block.`,
};

const ruleImpl = createDecoratedRule(
  SONAR_RULE,
  UPSTREAM_RULE,
  (message: DecoratedMessage): string =>
    // The upstream rule reports only declarations, retaining their raw property names.
    messages.duplicate((message.node as PostCSS.Declaration).prop),
);

export const rule = stylelint.createPlugin(SONAR_RULE, ruleImpl as stylelint.Rule) as {
  ruleName: string;
  rule: stylelint.Rule;
};
