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
import { generateMeta, getFullyQualifiedName } from '../helpers/index.js';
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
 * `true` means the option is dangerous when set to `true`,
 * `false` means the option is dangerous when set to `false`.
 */
const DANGEROUS_BOOLEAN_OPTIONS: Record<string, boolean> = {
  ALLOW_UNKNOWN_PROTOCOLS: true,
  WHOLE_DOCUMENT: true,
  SAFE_FOR_XML: false,
  SANITIZE_DOM: false,
  RETURN_TRUSTED_TYPE: false,
};

const SANITIZE_FQNS = new Set([
  'dompurify.sanitize',
  'isomorphic-dompurify.sanitize',
]);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      unsafeConfig:
        'Review this DOMPurify configuration to ensure it does not weaken sanitization.',
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

        if (hasDangerousConfig(configArg)) {
          context.report({
            messageId: 'unsafeConfig',
            node: configArg,
          });
        }
      },
    };
  },
};

function hasDangerousConfig(config: estree.ObjectExpression): boolean {
  for (const prop of config.properties) {
    if (prop.type !== 'Property') {
      continue;
    }

    const key = getPropertyName(prop);
    if (!key) {
      continue;
    }

    if (key === 'ADD_TAGS' && hasDangerousArrayElements(prop.value, DANGEROUS_TAGS)) {
      return true;
    }

    if (key === 'ADD_ATTR' && hasDangerousAttributes(prop.value)) {
      return true;
    }

    if (key in DANGEROUS_BOOLEAN_OPTIONS && isBooleanLiteral(prop.value, DANGEROUS_BOOLEAN_OPTIONS[key])) {
      return true;
    }
  }

  return false;
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

function hasDangerousArrayElements(node: estree.Node, dangerousSet: Set<string>): boolean {
  if (node.type !== 'ArrayExpression') {
    return false;
  }
  return node.elements.some(
    el => el && el.type === 'Literal' && typeof el.value === 'string' && dangerousSet.has(el.value.toLowerCase()),
  );
}

function hasDangerousAttributes(node: estree.Node): boolean {
  if (node.type !== 'ArrayExpression') {
    return false;
  }
  return node.elements.some(
    el =>
      el &&
      el.type === 'Literal' &&
      typeof el.value === 'string' &&
      EVENT_HANDLER_PATTERN.test(el.value),
  );
}

function isBooleanLiteral(node: estree.Node, value: boolean): boolean {
  return node.type === 'Literal' && node.value === value;
}
