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

import type { AST } from '@eslint-community/regexpp';
import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import type estree from 'estree';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getParsedRegex } from '../helpers/regex/extract.js';
import * as meta from './generated-meta.js';

const METHOD_MESSAGE_ID = 'method';

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, descriptor) => {
      if (!isMethodReportDescriptor(descriptor)) {
        context.report(descriptor);
        return;
      }

      if (shouldKeepReport(descriptor.node, context)) {
        context.report(descriptor);
      }
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

function shouldKeepReport(node: TSESTree.Identifier, context: Rule.RuleContext) {
  const callExpression = getEnclosingReplaceCall(node);
  if (!callExpression) {
    return true;
  }

  const [pattern] = callExpression.arguments;
  if (!pattern || pattern.type === 'SpreadElement') {
    // If the pattern is unavailable or opaque, we cannot prove plain-string equivalence.
    return false;
  }

  // Safe: replace(...) arguments are estree expressions accepted by the regex extraction helper.
  const regex = getParsedRegex(pattern as unknown as estree.Node, context);
  if (!regex || !hasReducibleFlags(regex.flags)) {
    return false;
  }

  const literal = getEquivalentLiteral(regex.pattern);
  return literal !== null && literal.length > 0;
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
      return element.alternatives.length === 1 ? reduceAlternative(element.alternatives[0]) : null;
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
