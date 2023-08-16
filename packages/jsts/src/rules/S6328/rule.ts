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
// https://sonarsource.github.io/rspec/#/rspec/S6328/javascript

import { Rule } from 'eslint';
import * as estree from 'estree';
import * as regexpp from '@eslint-community/regexpp';
import { RegExpLiteral } from '@eslint-community/regexpp/ast';
import { isRequiredParserServices } from '../helpers';
import {
  GroupReference,
  extractReferences,
  getParsedRegex,
  isStringReplaceCall,
} from '../helpers/regex';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      nonExistingGroup: 'Referencing non-existing group{{groups}}.',
    },
  },
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    return {
      CallExpression: (call: estree.CallExpression) => {
        if (isStringReplaceCall(call, services)) {
          const [pattern, substr] = call.arguments;
          const regex = getParsedRegex(pattern, context);
          if (regex !== null) {
            const groups = extractGroups(regex);
            const references = extractReferences(substr);
            const invalidReferences = references.filter(
              ref => !isReferencingExistingGroup(ref, groups),
            );
            if (invalidReferences.length > 0) {
              const groups = `${invalidReferences.length > 1 ? 's' : ''}: ${invalidReferences
                .map(ref => ref.raw)
                .join(', ')}`;
              context.report({
                node: substr,
                messageId: 'nonExistingGroup',
                data: {
                  groups,
                },
              });
            }
          }
        }
      },
    };
  },
};

class CapturingGroups {
  private readonly names = new Set<string>();
  private groups = 0;

  public add(name: string | null): void {
    if (name !== null) {
      this.names.add(name);
    }
    this.groups++;
  }

  public has(name: string): boolean {
    return this.names.has(name);
  }

  public count(): number {
    return this.groups;
  }
}

function extractGroups(regex: RegExpLiteral) {
  const groups = new CapturingGroups();
  regexpp.visitRegExpAST(regex, {
    onCapturingGroupEnter: group => groups.add(group.name),
  });
  return groups;
}

function isReferencingExistingGroup(reference: GroupReference, groups: CapturingGroups) {
  if (!isNaN(Number(reference.value))) {
    const index = Number(reference.value);
    return index >= 1 && index <= groups.count();
  } else {
    const name = reference.value;
    return groups.has(name);
  }
}
