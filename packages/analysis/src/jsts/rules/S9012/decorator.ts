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
// https://sonarsource.github.io/rspec/#/rspec/S9012/javascript

import type { Rule } from 'eslint';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { withStrictImportResolution } from '../helpers/testing-library.js';
import * as meta from './generated-meta.js';

const SNAPSHOT_IN_ASYNC_UTILITY_MESSAGE_ID = 'noWaitForSnapshot';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...withStrictImportResolution(rule),
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      if (
        'messageId' in reportDescriptor &&
        reportDescriptor.messageId === SNAPSHOT_IN_ASYNC_UTILITY_MESSAGE_ID
      ) {
        const { messageId: _messageId, data, ...rest } = reportDescriptor;
        const name = typeof data?.name === 'string' ? data.name : 'async utility';
        context.report({
          ...rest,
          message: `Snapshots should not be generated inside \`${name}\`; retries can create unstable snapshot artifacts.`,
        });
        return;
      }
      context.report(reportDescriptor);
    },
  );
}
