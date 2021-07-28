/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S6328

import { ParserServices } from '@typescript-eslint/parser';
import { Rule } from 'eslint';
import * as estree from 'estree';
import * as regexpp from 'regexpp';
import { RegExpLiteral } from 'regexpp/ast';
import { isRequiredParserServices, isString, isStringLiteral, extractRegex } from '../utils';

export const rule: Rule.RuleModule = {
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    return {
      CallExpression: (call: estree.CallExpression) => {
        if (isStringReplaceCall(call, services)) {
          const [pattern, substr] = call.arguments;
          const regex = extractRegex(pattern, context);
          if (regex !== null) {
            const groups = extractGroups(regex);
            const references = extractReferences(substr);
            const invalidReferences = references.filter(
              ref => !isReferencingExistingGroup(ref, groups),
            );
            if (invalidReferences.length > 0) {
              const message = `Referencing non-existing group${
                invalidReferences.length > 1 ? 's' : ''
              }: ${invalidReferences.map(ref => ref.raw).join(', ')}`;
              context.report({
                node: substr,
                message,
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

interface GroupReference {
  raw: string;
  value: string;
}

function isStringReplaceCall(call: estree.CallExpression, services: ParserServices) {
  return (
    call.callee.type === 'MemberExpression' &&
    call.callee.property.type === 'Identifier' &&
    !call.callee.computed &&
    ['replace', 'replaceAll'].includes(call.callee.property.name) &&
    call.arguments.length > 1 &&
    isString(call.callee.object, services)
  );
}

function extractGroups(regex: RegExpLiteral) {
  const groups = new CapturingGroups();
  regexpp.visitRegExpAST(regex, {
    onCapturingGroupEnter: group => groups.add(group.name),
  });
  return groups;
}

function extractReferences(node: estree.Node) {
  const references: GroupReference[] = [];
  if (isStringLiteral(node)) {
    const str = node.value as string;
    const reg = /\$(\d+)|\$\<([a-zA-Z][a-zA-Z0-9_]*)\>/g;
    let match: RegExpExecArray | null;
    while ((match = reg.exec(str)) !== null) {
      const [raw, index, name] = match;
      const value = index || name;
      references.push({ raw, value });
    }
  }
  return references;
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
