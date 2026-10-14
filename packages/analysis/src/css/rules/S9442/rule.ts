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
// https://sonarsource.github.io/rspec/#/rspec/S9442/css
import stylelint from 'stylelint';
import { createDecoratedRule, type DecoratedMessage } from '../helpers/decorated-result.js';

const SONAR_RULE = 'sonar/named-grid-areas-no-invalid';
const UPSTREAM_RULE = 'named-grid-areas-no-invalid';
const EMPTY_STRING = 'Expected cell token within string';
const CELL_COUNT = 'Expected same number of cell tokens in each string';
const RECTANGLE = /^Expected single filled-in rectangle for "(.+)"$/;

export const messages = {
  emptyString: 'Add at least one cell token to this string.',
  cellCount: 'Make this row have the same number of cells as the first row.',
  rectangle: (name: string): string => `Make the "${name}" area a single filled-in rectangle.`,
};

function rewriteMessage(message: DecoratedMessage): string | undefined {
  const detail = message.text.replace(` (${UPSTREAM_RULE})`, '');
  if (detail === EMPTY_STRING) {
    return messages.emptyString;
  }
  if (detail === CELL_COUNT) {
    return messages.cellCount;
  }

  const name = RECTANGLE.exec(detail)?.[1];
  if (name !== undefined) {
    // CSS treats a run of periods as one unnamed cell, not as a named area.
    return /^\.+$/.test(name) ? undefined : messages.rectangle(name);
  }
  return detail;
}

const ruleImpl = createDecoratedRule(SONAR_RULE, UPSTREAM_RULE, rewriteMessage);

export const rule = stylelint.createPlugin(SONAR_RULE, ruleImpl as stylelint.Rule) as {
  ruleName: string;
  rule: stylelint.Rule;
};
