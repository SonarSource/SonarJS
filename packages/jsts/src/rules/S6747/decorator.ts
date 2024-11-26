/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
// https://sonarsource.github.io/rspec/#/rspec/S6747/javascript

import type { Rule } from 'eslint';
import { generateMeta, interceptReport } from '../helpers/index.js';
import { meta } from './meta.js';

/**
 * The core implementation of the rule includes a fix without a message.
 * That fix suggests using a standard property name that is available in
 * the report data. This decorator turns the reported fix into a suggestion
 * and adds to it a dynamic description rather than a fixed one.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta as Rule.RuleMetaData, {
        ...rule.meta!,
        hasSuggestions: true,
      }),
    },
    (context, descriptor) => {
      const { messageId, fix, data, ...rest } = descriptor as any;
      if (messageId !== 'unknownPropWithStandardName') {
        context.report(descriptor);
        return;
      }
      const suggest: Rule.SuggestionReportDescriptor[] = [
        {
          desc: `Replace with '${data.standardName}'`,
          fix,
        },
      ];
      context.report({ messageId, data, suggest, ...rest });
    },
  );
}
