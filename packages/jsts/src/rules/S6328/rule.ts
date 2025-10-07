/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S6328/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import * as regexpp from '@eslint-community/regexpp';
import type { RegExpLiteral } from '@eslint-community/regexpp';
import { generateMeta, isRequiredParserServices } from '../helpers/index.js';
import * as meta from './generated-meta.js';
import { extractReferences, type GroupReference } from '../helpers/regex/group.js';
import { getParsedRegex } from '../helpers/regex/extract.js';
import { isStringReplaceCall } from '../helpers/regex/ast.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      nonExistingGroup: 'Referencing non-existing group{{groups}}.',
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
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
  if (Number.isNaN(Number(reference.value))) {
    const name = reference.value;
    return groups.has(name);
  } else {
    const index = Number(reference.value);
    return index >= 1 && index <= groups.count();
  }
}
