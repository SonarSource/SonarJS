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
// https://sonarsource.github.io/rspec/#/rspec/S7781/javascript

import { type AST, visitRegExpAST } from '@eslint-community/regexpp';
import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import type estree from 'estree';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getParsedRegex } from '../helpers/regex/extract.js';
import * as meta from './generated-meta.js';

const METHOD_MESSAGE_ID = 'method';
const METHOD_AND_PATTERN_MESSAGE_ID = 'methodAndPattern';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, {
        ...rule.meta,
        messages: {
          ...rule.meta?.messages,
          [METHOD_AND_PATTERN_MESSAGE_ID]:
            'Use `replaceAll()` with a string literal instead of this global regex.',
        },
      }),
    },
    (context, descriptor) => {
      if (!isMethodReportDescriptor(descriptor)) {
        context.report(descriptor);
        return;
      }

      const call = getEnclosingReplaceCall(descriptor.node);
      if (!call) {
        context.report(descriptor);
        return;
      }

      const [pattern] = call.arguments;
      const literal = getReplacementLiteral(pattern, context);
      if (literal === null) {
        return;
      }

      // Convert only inline regex literals. Regex in variables are kept,
      // since they may be used elsewhere and it is not generally safe to
      // transform them into string literals.
      if (pattern.type !== 'Literal' || !('regex' in pattern)) {
        context.report(descriptor);
        return;
      }

      context.report({
        ...descriptor,
        messageId: METHOD_AND_PATTERN_MESSAGE_ID,
        fix: fixer => [
          fixer.insertTextAfter(descriptor.node, 'All'),
          fixer.replaceText(pattern, toStringLiteral(literal)),
        ],
      });
    },
  );
}

function isMethodReportDescriptor(
  descriptor: Rule.ReportDescriptor,
): descriptor is Rule.ReportDescriptor & {
  messageId: typeof METHOD_MESSAGE_ID;
  node: TSESTree.Identifier;
} {
  return (
    'messageId' in descriptor &&
    descriptor.messageId === METHOD_MESSAGE_ID &&
    'node' in descriptor &&
    descriptor.node.type === 'Identifier'
  );
}

function getReplacementLiteral(
  pattern: TSESTree.CallExpressionArgument | undefined,
  context: Rule.RuleContext,
): string | null {
  if (!pattern || pattern.type === 'SpreadElement') {
    return null;
  }

  const regex = getParsedRegex(pattern as unknown as estree.Node, context);
  if (!regex || !hasReducibleFlags(regex.flags)) {
    return null;
  }

  if (regex.flags.unicode || regex.flags.unicodeSets) {
    let hasLoneSurrogate = false;
    visitRegExpAST(regex.pattern, {
      onCharacterEnter({ value }) {
        const MIN_SURROGATE_CODE_POINT = 0xd800;
        const MAX_SURROGATE_CODE_POINT = 0xdfff;
        hasLoneSurrogate ||= value >= MIN_SURROGATE_CODE_POINT && value <= MAX_SURROGATE_CODE_POINT;
      },
    });
    // String searches can match half of a surrogate pair, unlike Unicode regexes.
    if (hasLoneSurrogate) {
      return null;
    }
  }

  const literal = getEquivalentLiteral(regex.pattern);
  return literal !== null && literal.length > 0 ? literal : null;
}

function toStringLiteral(literal: string): string {
  // Use JSON.stringify to do most of the escaping
  return (
    JSON.stringify(literal)
      // Escape Unicode line and paragraph separators, which JSON.stringify leaves literal.
      .replaceAll('\u2028', String.raw`\u2028`)
      .replaceAll('\u2029', String.raw`\u2029`)
  );
}

/**
 * Finds the surrounding call for:
 *
 *   callExpression := memberExpression "(" ... ")"
 *   memberExpression := receiver "." replace
 *
 * This matches `input.replace(...)` and rejects computed access or non-invoked members.
 */
function getEnclosingReplaceCall(node: TSESTree.Identifier): TSESTree.CallExpression | undefined {
  if (node.name !== 'replace') {
    return undefined;
  }

  const memberExpression = node.parent;
  const callExpression = memberExpression?.parent;

  if (
    memberExpression?.type !== 'MemberExpression' ||
    memberExpression.computed ||
    memberExpression.property !== node ||
    callExpression?.type !== 'CallExpression' ||
    callExpression.callee !== memberExpression
  ) {
    return undefined;
  }

  return callExpression;
}

/**
 * Keeps only flags that preserve plain literal matching when rewriting:
 *
 *   allowedFlags := "g"
 *
 * `replaceAll("literal", replacement)` can only replace the same text as the regex when the
 * pattern is global and no other flag changes how characters are matched. Flags like `i`, `m`,
 * `s`, or `y` can make the regex match a different set of substrings than the literal string.
 */
function hasReducibleFlags(flags: AST.Flags) {
  return (
    flags.global &&
    !flags.dotAll &&
    !flags.hasIndices &&
    !flags.ignoreCase &&
    !flags.multiline &&
    !flags.sticky
  );
}

/**
 * Returns the plain string matched by the regex when every step is a fixed character:
 *
 *   pattern     := alternative
 *   alternative := element+
 *   element     := character
 *                | singleCharacterClass
 *                | nonCapturingGroup
 *                | fixedQuantifier
 *   singleCharacterClass := "[" character "]"
 *   nonCapturingGroup    := "(?:" alternative ")"
 *   fixedQuantifier      := element "{n}" | element with min = max = n
 *
 * Example: `/(?:f)[o]{1}[o]/` -> `"foo"`
 *
 * Otherwise it returns null.
 */
function getEquivalentLiteral(pattern: AST.Pattern): string | null {
  if (pattern.alternatives.length !== 1) {
    return null;
  }

  return reduceAlternative(pattern.alternatives[0]);
}

function reduceAlternative(alternative: AST.Alternative): string | null {
  let literal = '';

  for (const element of alternative.elements) {
    const fragment = reduceElement(element);
    if (fragment === null) {
      return null;
    }
    literal += fragment;
  }

  return literal;
}

function reduceElement(element: AST.Element): string | null {
  switch (element.type) {
    case 'Character':
      return String.fromCodePoint(element.value);
    case 'CharacterClass':
      return reduceCharacterClass(element);
    case 'CapturingGroup':
      return null;
    case 'Group':
      // Scoped flags (e.g.,`(?i:FOO)`) can change matching even when every character is fixed.
      return element.modifiers === null && element.alternatives.length === 1
        ? reduceAlternative(element.alternatives[0])
        : null;
    case 'Quantifier':
      return reduceQuantifier(element);
    default:
      return null;
  }
}

function reduceQuantifier(quantifier: AST.Quantifier): string | null {
  if (quantifier.min !== quantifier.max) {
    return null;
  }

  const fragment = reduceElement(quantifier.element);
  return fragment === null ? null : fragment.repeat(quantifier.min);
}

function reduceCharacterClass(characterClass: AST.CharacterClass): string | null {
  if (characterClass.negate || characterClass.elements.length !== 1) {
    return null;
  }

  const [element] = characterClass.elements;
  return element.type === 'Character' ? String.fromCodePoint(element.value) : null;
}
