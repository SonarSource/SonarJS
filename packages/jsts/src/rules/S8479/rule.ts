/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
// https://sonarsource.github.io/rspec/#/rspec/S8479/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { getFullyQualifiedName } from '../helpers/module.js';
import * as meta from './generated-meta.js';

const DANGEROUS_TAGS = new Set([
  'script',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'textarea',
  'select',
  'meta',
  'link',
  'style',
  'base',
  'svg',
  'math',
]);

const EVENT_HANDLER_PATTERN = /^on[a-z]/i;

/**
 * Boolean options that are dangerous when set to the specified value.
 * `dangerousValue` is the value that weakens sanitization,
 * `reason` explains why it is dangerous.
 */
const DANGEROUS_BOOLEAN_OPTIONS: Record<string, { dangerousValue: boolean; reason: string }> = {
  ALLOW_UNKNOWN_PROTOCOLS: {
    dangerousValue: true,
    reason: 'prevent injection through dangerous URI schemes like javascript:',
  },
  WHOLE_DOCUMENT: {
    dangerousValue: true,
    reason: 'avoid processing the full document including dangerous head elements',
  },
  SAFE_FOR_XML: {
    dangerousValue: false,
    reason: 'enable XML-specific sanitization',
  },
  SANITIZE_DOM: {
    dangerousValue: false,
    reason: 'enable protection against DOM clobbering attacks',
  },
  RETURN_TRUSTED_TYPE: {
    dangerousValue: false,
    reason: 'leverage Trusted Types for additional XSS protection',
  },
};

const SANITIZE_FQNS = new Set([
  'dompurify.sanitize',
  'isomorphic-dompurify.sanitize',
]);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      dangerousTags:
        "Remove {{tags}} from 'ADD_TAGS' to prevent introducing dangerous HTML elements.",
      dangerousAttrs:
        "Remove {{attrs}} from 'ADD_ATTR' to prevent introducing event handler attributes.",
      unsafeBoolOption:
        "Set '{{option}}' to '{{safe}}' to {{reason}}.",
    },
  }),

  create(context: Rule.RuleContext) {
    return {
      CallExpression(node: estree.CallExpression) {
        const fqn = getFullyQualifiedName(context, node);
        if (!fqn || !SANITIZE_FQNS.has(fqn)) {
          return;
        }

        const configArg = node.arguments[1];
        if (!configArg || configArg.type !== 'ObjectExpression') {
          return;
        }

        reportDangerousConfig(context, configArg);
      },
    };
  },
};

function reportDangerousConfig(
  context: Rule.RuleContext,
  config: estree.ObjectExpression,
): void {
  for (const prop of config.properties) {
    if (prop.type !== 'Property') {
      continue;
    }

    const key = getPropertyName(prop);
    if (!key) {
      continue;
    }

    if (key === 'ADD_TAGS') {
      const dangerous = getDangerousArrayElements(prop.value, DANGEROUS_TAGS);
      if (dangerous.length > 0) {
        context.report({
          messageId: 'dangerousTags',
          node: prop,
          data: { tags: formatList(dangerous) },
        });
      }
    } else if (key === 'ADD_ATTR') {
      const dangerous = getDangerousAttributes(prop.value);
      if (dangerous.length > 0) {
        context.report({
          messageId: 'dangerousAttrs',
          node: prop,
          data: { attrs: formatList(dangerous) },
        });
      }
    } else if (key in DANGEROUS_BOOLEAN_OPTIONS) {
      const { dangerousValue, reason } = DANGEROUS_BOOLEAN_OPTIONS[key];
      if (isBooleanLiteral(prop.value, dangerousValue)) {
        context.report({
          messageId: 'unsafeBoolOption',
          node: prop,
          data: { option: key, safe: String(!dangerousValue), reason },
        });
      }
    }
  }
}

function getPropertyName(prop: estree.Property): string | undefined {
  if (prop.key.type === 'Identifier') {
    return prop.key.name;
  }
  if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') {
    return prop.key.value;
  }
  return undefined;
}

function getDangerousArrayElements(node: estree.Node, dangerousSet: Set<string>): string[] {
  if (node.type !== 'ArrayExpression') {
    return [];
  }
  return node.elements
    .filter(
      (el): el is estree.Literal =>
        el !== null &&
        el.type === 'Literal' &&
        typeof el.value === 'string' &&
        dangerousSet.has((el.value as string).toLowerCase()),
    )
    .map(el => el.value as string);
}

function getDangerousAttributes(node: estree.Node): string[] {
  if (node.type !== 'ArrayExpression') {
    return [];
  }
  return node.elements
    .filter(
      (el): el is estree.Literal =>
        el !== null &&
        el.type === 'Literal' &&
        typeof el.value === 'string' &&
        EVENT_HANDLER_PATTERN.test(el.value as string),
    )
    .map(el => el.value as string);
}

function formatList(items: string[]): string {
  const quoted = items.map(item => `'${item}'`);
  if (quoted.length === 1) {
    return quoted[0];
  }
  return `${quoted.slice(0, -1).join(', ')} and ${quoted[quoted.length - 1]}`;
}

function isBooleanLiteral(node: estree.Node, value: boolean): boolean {
  return node.type === 'Literal' && node.value === value;
}
