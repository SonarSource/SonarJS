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
// https://sonarsource.github.io/rspec/#/rspec/S6791/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import { generateMeta, interceptReportForReact } from '../helpers/index.js';
import { meta } from './meta.js';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(meta as Rule.RuleMetaData, {
        ...rule.meta!,
        messages: {
          ...rule.meta!.messages,
          unsafeMethod: '{{method}} is unsafe for use in async rendering.',
        },
      }),
    },
    (context, descriptor) => {
      const {
        node: { key },
      } = descriptor as unknown as {
        node: estree.Property | estree.PropertyDefinition | estree.MethodDefinition;
      };
      context.report({ ...descriptor, loc: key.loc! });
    },
  );
}
