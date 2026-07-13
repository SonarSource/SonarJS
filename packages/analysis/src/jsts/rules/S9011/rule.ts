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
// https://sonarsource.github.io/rspec/#/rspec/S9011/javascript

import type { Rule } from 'eslint';
import { rules as reactRules } from '../external/react.js';
import { rules as vueRules } from '../external/vue.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport, interceptReportForReact } from '../helpers/decorators/interceptor.js';
import { mergeRules } from '../helpers/decorators/merger.js';
import * as meta from './generated-meta.js';

const reactBaseRule = reactRules['button-has-type'];
const vueBaseRule = vueRules['html-button-has-type'];

const MISSING_TYPE_MESSAGE = 'Add an explicit "type" attribute to this button.';

/**
 * messageId -> Sonar-standard message for the cases we keep.
 *
 * Both plugins also report a "forbidden value" case tied to their opinionated
 * button/submit/reset allow-toggles, and React additionally reports a "complex type"
 * case for dynamic type expressions. None of those are handled here on purpose: we
 * don't expose the toggles, and dynamic type expressions can't be judged statically,
 * so both are dropped to avoid false positives.
 */
const MISSING_TYPE_MESSAGE_IDS = new Set([
  'missingType', // react
  'missingTypeAttribute', // vue
  'emptyTypeAttribute', // vue: type="" or :type with no expression - as good as missing
]);
const INVALID_TYPE_MESSAGE_IDS = new Set([
  'invalidValue', // react
  'invalidTypeAttribute', // vue
]);

function onReport(context: Rule.RuleContext, reportDescriptor: Rule.ReportDescriptor) {
  if (!('messageId' in reportDescriptor)) {
    context.report(reportDescriptor);
    return;
  }
  const { messageId, data, ...rest } = reportDescriptor;
  if (MISSING_TYPE_MESSAGE_IDS.has(messageId)) {
    context.report({ ...rest, message: MISSING_TYPE_MESSAGE });
  } else if (INVALID_TYPE_MESSAGE_IDS.has(messageId)) {
    const { value } = data as { value?: string };
    context.report({
      ...rest,
      message: `Replace this invalid "type" value "${value}" with one of "button", "submit", or "reset".`,
    });
  }
}

const reactRule = interceptReportForReact(reactBaseRule, onReport);
const vueRule = interceptReport(vueBaseRule, onReport);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      ...reactBaseRule.meta?.messages,
      ...vueBaseRule.meta?.messages,
    },
  }),
  create(context: Rule.RuleContext) {
    return mergeRules(reactRule.create(context), vueRule.create(context));
  },
};
