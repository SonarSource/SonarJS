/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
// https://sonarsource.github.io/rspec/#/rspec/S6791/javascript

import { Rule /*, AST*/ } from 'eslint';
import * as estree from 'estree';
import { interceptReportForReact } from '../helpers';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  rule.meta!.hasSuggestions = true;
  rule.meta!.messages!['unsafeMethod'] = '{{method}} is unsafe for use in async rendering.';
  rule.meta!.messages!['safeMethod'] = 'Use {{newMethod}} instead';
  return interceptReportForReact(rule, (context, descriptor) => {
    const {
      node: { key },
      data,
    } = descriptor as unknown as {
      node: estree.Property | estree.PropertyDefinition | estree.MethodDefinition;
      data: { newMethod: string };
    };
    context.report({
      ...descriptor,
      loc: key.loc!,
      suggest: [
        {
          messageId: 'safeMethod',
          fix: fixer => fixer.replaceText(key, data.newMethod),
        },
      ],
    });
  });
}
