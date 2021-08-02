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
// https://sonarsource.github.io/rspec/#/rspec/S5860

import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import * as regexpp from 'regexpp';
import { Backreference, CapturingGroup, RegExpLiteral } from 'regexpp/ast';
import {
  getParent,
  getParsedRegex,
  getValueOfExpression,
  isDotNotation,
  isMethodCall,
  isRegexLiteral,
  isRegExpConstructor,
  isRequiredParserServices,
  isString,
  RequiredParserServices,
  toEncodedMessage,
} from '../utils';
import { extractReferences, isStringReplaceCall } from '../utils/utils-string-replace';

export const rule: Rule.RuleModule = {
  meta: {
    schema: [
      {
        // internal parameter for rules having secondary locations
        enum: ['sonar-runtime'],
      },
    ],
  },
  create(context: Rule.RuleContext) {
    const services = context.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    const intellisense = new RegexIntelliSense(services, context);
    return {
      'Literal[regex]:exit': (literal: estree.Literal) => {
        /* /regex/ */
        intellisense.collectKnowledge(literal);
      },
      'NewExpression:exit': (newExpr: estree.NewExpression) => {
        /* new RegExp(regex) */
        intellisense.collectKnowledge(newExpr);
      },
      'CallExpression:exit': (callExpr: estree.CallExpression) => {
        /* RegExp(regex) */
        intellisense.collectKnowledge(callExpr);
        /* str.match(pattern) / pattern.exec(str) */
        intellisense.collectPatternMatcher(callExpr);
        /* str.replace(pattern, substr) */
        checkStringReplaceGroupReferences(callExpr, intellisense);
      },
      'MemberExpression:exit': (memberExpr: estree.MemberExpression) => {
        if (memberExpr.computed) {
          /* matcher[index] */
          checkIndexBasedGroupReference(memberExpr, intellisense);
        } else {
          /* matcher.groups.<name> / matcher.indices.groups.<name> */
          checkNonExistingGroupReference(memberExpr, intellisense);
        }
      },
      'Program:exit': () => {
        checkUnusedGroups(intellisense);
      },
    };
  },
};

function checkStringReplaceGroupReferences(
  callExpr: estree.CallExpression,
  intellisense: RegexIntelliSense,
) {
  if (isStringReplaceCall(callExpr, intellisense.services)) {
    const [pattern, substr] = callExpr.arguments;
    const regex = intellisense.findRegex(pattern);
    if (regex) {
      const references = extractReferences(substr);
      const indexes = new Set<number>();
      const names = new Set<string>();
      references.forEach(ref =>
        isNaN(Number(ref.value)) ? names.add(ref.value) : indexes.add(Number(ref.value)),
      );
      regex.groups.forEach(group => {
        group.used ||= names.has(group.name);
        group.used ||= indexes.has(group.index);
      });
    }
  }
}

function checkIndexBasedGroupReference(
  memberExpr: estree.MemberExpression,
  intellisense: RegexIntelliSense,
) {
  const { object: matcher, property } = memberExpr;
  const pattern = intellisense.resolve(matcher);
  if (pattern) {
    const maybeIndex = getValueOfExpression(intellisense.context, property, 'Literal');
    if (maybeIndex && typeof maybeIndex.value === 'number') {
      const index = maybeIndex.value;
      const group = pattern.groups.find(grp => grp.index === index);
      if (group) {
        group.used = true;
        // Temporary workaround
        //
        // Add secondary location on group nodes instead of the regex node (#2712, #2721)
        intellisense.context.report({
          message: toEncodedMessage(
            `Directly use '${group.name}' instead of its group number.`,
            [pattern.node],
            ['Regular expression'],
          ),
          node: property,
        });
      }
    }
  }
}

function checkNonExistingGroupReference(
  memberExpr: estree.MemberExpression,
  intellisense: RegexIntelliSense,
) {
  const { object: matcher, property } = memberExpr;
  const pattern = intellisense.resolve(matcher);
  if (pattern) {
    /* matcher.groups.<name> / matcher.indices.groups.<name>  */
    const name = extractGroupName(memberExpr, intellisense);
    if (name !== null) {
      const group = pattern.groups.find(grp => grp.name === name);
      if (group) {
        group.used = true;
      } else {
        // Temporary workaround
        //
        // Add secondary location on group nodes instead of the regex node (#2712, #2721)
        intellisense.context.report({
          message: toEncodedMessage(
            `There is no group named '${name}' in the regular expression.`,
            [pattern.node],
            ['Regular expression'],
          ),
          node: property,
        });
      }
    }
  }
}

function extractGroupName(
  memberExpr: estree.MemberExpression,
  intellisense: RegexIntelliSense,
): string | null {
  const { property, computed } = memberExpr;
  if (property.type === 'Identifier' && !computed) {
    const ancestors = intellisense.context.getAncestors();
    let parent = ancestors.pop();
    if (parent && isDotNotation(parent)) {
      let parentProperty = parent.property.name;
      switch (property.name) {
        case 'groups':
          /* matcher.groups.<name> */
          return parent.property.name;
        case 'indices':
          /* matcher.indices.groups.<name> */
          if (parentProperty === 'groups') {
            parent = ancestors.pop();
            if (parent && isDotNotation(parent)) {
              return parent.property.name;
            }
          }
      }
    }
  }
  return null;
}

function checkUnusedGroups(intellisense: RegexIntelliSense) {
  intellisense.getKnowledge().forEach(regex => {
    const unusedGroups = regex.groups.filter(group => !group.used);
    if (unusedGroups.length) {
      const names = unusedGroups.map(group => group.name).join(', ');
      // Temporary workaround
      //
      // Remove unused names from message and add secondary location for each unused group node (#2712, #2721)
      intellisense.context.report({
        message: toEncodedMessage(
          `Use the named groups of this regex or remove the names: ${names}.`,
          [],
          [],
        ),
        node: regex.node,
      });
    }
  });
}

interface RegexKnowledge {
  node: estree.Node;
  regexp: RegExpLiteral;
  groups: GroupKnowledge[];
}

interface GroupKnowledge {
  node: CapturingGroup;
  name: string;
  used: boolean;
  index: number;
}

function makeRegexKnowledge(node: estree.Node, regexp: RegExpLiteral): RegexKnowledge {
  const capturingGroups: CapturingGroup[] = [];
  const backreferences: Backreference[] = [];
  regexpp.visitRegExpAST(regexp, {
    onBackreferenceEnter: reference => reference.resolved.name && backreferences.push(reference),
    onCapturingGroupEnter: group => capturingGroups.push(group),
  });
  const groups: GroupKnowledge[] = [];
  capturingGroups.forEach(
    (group, index) =>
      group.name && groups.push(makeGroupKnowledge(group, backreferences, index + 1)),
  );
  return { node, regexp, groups };
}

function makeGroupKnowledge(
  node: CapturingGroup,
  backreferences: Backreference[],
  index: number,
): GroupKnowledge {
  const name = node.name!;
  const used = backreferences.some(backreference => backreference.resolved === node);
  return { node, name, used, index };
}

class RegexIntelliSense {
  private readonly knowledge: RegexKnowledge[] = [];
  private readonly bindings = new Map<Scope.Variable, RegexKnowledge>();

  constructor(readonly services: RequiredParserServices, readonly context: Rule.RuleContext) {}

  getKnowledge() {
    return this.knowledge;
  }

  collectKnowledge(node: estree.Node) {
    const regex = getParsedRegex(node, this.context);
    if (regex !== null) {
      this.knowledge.push(makeRegexKnowledge(node, regex));
    }
  }

  collectPatternMatcher(callExpr: estree.CallExpression) {
    const { callee, arguments: args } = callExpr;
    if (isMethodCall(callExpr) && args.length > 0) {
      const target = (callee as estree.MemberExpression).object;
      const parent = getParent(this.context);
      if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
        const matcher = parent.id;
        const method = (callee as estree.MemberExpression).property as estree.Identifier;
        if (isString(target, this.services) && ['match', 'matchAll'].includes(method.name)) {
          /* str.match(pattern) */
          const [pattern] = args;
          this.bind(pattern, matcher);
        } else if (method.name === 'exec' && isString(args[0], this.services)) {
          /* pattern.exec(str) */
          const pattern = target;
          this.bind(pattern, matcher);
        }
      }
    }
  }

  resolve(matcher: estree.Node): RegexKnowledge | null {
    const variable = this.findVariable(matcher);
    if (variable) {
      return this.bindings.get(variable) || null;
    } else {
      return null;
    }
  }

  findRegex(node: estree.Node): RegexKnowledge | undefined {
    if (isRegexLiteral(node) || isRegExpConstructor(node)) {
      return this.knowledge.find(regex => regex.node === node);
    }
    const variable = this.findVariable(node);
    if (variable) {
      for (const def of variable.defs) {
        if (def.type === 'Variable' && def.node.init) {
          const regex = this.findRegex(def.node.init);
          if (regex) {
            return regex;
          }
        }
      }
    }
    return undefined;
  }

  private bind(pattern: estree.Node, matcher: estree.Identifier) {
    const variable = this.findVariable(matcher);
    if (variable) {
      const regex = this.findRegex(pattern);
      if (regex) {
        this.bindings.set(variable, regex);
      }
    }
  }

  private findVariable(node: estree.Node) {
    if (node.type === 'Identifier') {
      const { name } = node;
      let scope: Scope.Scope | null = this.context.getScope();
      while (scope !== null) {
        const variable = scope.set.get(name);
        if (variable != null) {
          return variable;
        }
        scope = scope.upper;
      }
    }
    return null;
  }
}
