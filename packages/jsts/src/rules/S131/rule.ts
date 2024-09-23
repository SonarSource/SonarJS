/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S131/javascript

import * as estree from 'estree';
import { Rule, SourceCode } from 'eslint';
import { tsEslintRules } from '../typescript-eslint/index.js';
import {
  generateMeta,
  interceptReport,
  isRequiredParserServices,
  isUnion,
  mergeRules,
} from '../helpers/index.js';
import { meta } from './meta.js';

/**
 * This rule raises issues on switch statements without a default branch if, and only if,
 * the discriminant of the switch statement is not of union type. This exception is due to
 * `switch-exhaustiveness-check` decorated below which checks the exhaustiveness of switch
 * statements on TypeScript unions and enums. Therefore, we avoid here raising multiple issues if the
 * discriminant of the switch statement denotes a union or enum, provided that type information is available.
 */
const switchWithoutDefaultRule: Rule.RuleModule = {
  meta: {
    messages: {
      switchDefault: `Add a "default" clause to this "switch" statement.`,
      addDefault: 'Add a "default" branch.',
    },
  },
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    const hasTypeInformation = isRequiredParserServices(services);
    return {
      SwitchStatement(node: estree.SwitchStatement) {
        const { discriminant, cases } = node;
        if (hasTypeInformation && isUnion(discriminant, services)) {
          return;
        }
        const defaultClause = cases.find(c => c.test === null);
        if (!defaultClause) {
          const switchKeyword = getSwitchKeyword(node, context);
          context.report({
            messageId: 'switchDefault',
            loc: switchKeyword.loc,
            suggest: [
              {
                messageId: 'addDefault',
                fix(fixer: Rule.RuleFixer): Rule.Fix | null {
                  return fixSwitch(fixer, node, context.sourceCode);
                },
              },
            ],
          });
        }
      },
    };
  },
};

/**
 * The rule `switch-exhaustiveness-check` is a TypeScript ESLint rule that uses type information.
 * Therefore, we need to sanitize the rule in case TypeScript's type checker is missing when the
 * rule is executed to prevent runtime errors. Furthermore, we need to decorate the rule so that
 * it raises issues at the same location, that is, the `switch` keyword.
 */
const switchExhaustivenessRule = tsEslintRules['switch-exhaustiveness-check'];
const decoratedSwitchExhaustivenessRule: Rule.RuleModule = interceptReport(
  switchExhaustivenessRule,
  function (context: Rule.RuleContext, descriptor: Rule.ReportDescriptor) {
    const switchNode = (descriptor as any).node.parent as estree.Node;
    const switchKeyword = getSwitchKeyword(switchNode, context);
    context.report({ ...descriptor, loc: switchKeyword.loc });
  },
);

function getSwitchKeyword(node: estree.Node, context: Rule.RuleContext) {
  return context.sourceCode.getFirstToken(
    node,
    token => token.type === 'Keyword' && token.value === 'switch',
  )!;
}

function fixSwitch(
  fixer: Rule.RuleFixer,
  node: estree.SwitchStatement,
  sourceCode: SourceCode,
): Rule.Fix | null {
  /** Either suggest a default branch after the last case while preserving contextual indentation */

  const lastCase = node.cases.length > 0 ? node.cases[node.cases.length - 1] : null;

  const caseIndent = lastCase
    ? ' '.repeat(lastCase.loc?.start.column!)
    : ' '.repeat(node.loc?.start.column!);
  const code = "default: { throw new Error('Not implemented yet'); }";
  const fixString = `${caseIndent}${code}`;

  if (lastCase) {
    return fixer.insertTextAfter(lastCase, `\n${fixString}`);
  }

  /* Or suggest a default branch with the same indentation level as the switch starting line */

  const openingBrace = sourceCode.getTokenAfter(
    node.discriminant,
    token => token.type === 'Punctuator' && token.value === '{',
  )!;

  const closingBrace = sourceCode.getTokenAfter(
    node.discriminant,
    token => token.type === 'Punctuator' && token.value === '}',
  )!;

  return fixer.replaceTextRange(
    [openingBrace.range[0], closingBrace.range[1]],
    ['{', fixString, `${caseIndent}}`].join('\n'),
  );
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    hasSuggestions: true,
    messages: {
      ...switchWithoutDefaultRule.meta?.messages,
      ...decoratedSwitchExhaustivenessRule.meta?.messages,
    },
    schema: switchExhaustivenessRule.schema,
  }),
  create(context: Rule.RuleContext) {
    return mergeRules(
      switchWithoutDefaultRule.create(context),
      decoratedSwitchExhaustivenessRule.create(context),
    );
  },
};
