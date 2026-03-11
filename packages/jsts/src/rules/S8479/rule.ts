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
 */
const DANGEROUS_BOOLEAN_OPTIONS: Record<string, boolean> = {
  ALLOW_UNKNOWN_PROTOCOLS: true,
  WHOLE_DOCUMENT: true,
  SAFE_FOR_XML: false,
  SANITIZE_DOM: false,
  RETURN_TRUSTED_TYPE: false,
};

const MAX_ACTIONS_IN_MESSAGE = 2;

const SANITIZE_FQNS = new Set([
  'dompurify.sanitize',
  'isomorphic-dompurify.sanitize',
]);

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      unsafeConfig: 'unsafeConfig',
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

        const actions = collectActions(configArg);
        if (actions.length > 0) {
          context.report({
            message: buildMessage(actions),
            node: configArg,
          });
        }
      },
    };
  },
};

function collectActions(config: estree.ObjectExpression): string[] {
  const actions: string[] = [];

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
        actions.push(`remove ${formatList(dangerous)} from 'ADD_TAGS'`);
      }
    } else if (key === 'ADD_ATTR') {
      const dangerous = getDangerousAttributes(prop.value);
      if (dangerous.length > 0) {
        actions.push(`remove ${formatList(dangerous)} from 'ADD_ATTR'`);
      }
    } else if (key in DANGEROUS_BOOLEAN_OPTIONS) {
      const dangerousValue = DANGEROUS_BOOLEAN_OPTIONS[key];
      if (isBooleanLiteral(prop.value, dangerousValue)) {
        actions.push(`set '${key}' to '${!dangerousValue}'`);
      }
    }
  }

  return actions;
}

function buildMessage(actions: string[]): string {
  const shown = actions.slice(0, MAX_ACTIONS_IN_MESSAGE);
  const remaining = actions.length - shown.length;

  let message = `To prevent DOM-based attacks, ${joinActions(shown)}.`;
  if (remaining > 0) {
    message += ` Plus ${remaining} more ${remaining === 1 ? 'issue' : 'issues'}. Read 'How to fix it' for all details.`;
  }
  return message;
}

function joinActions(actions: string[]): string {
  if (actions.length === 1) {
    return actions[0];
  }
  return `${actions.slice(0, -1).join(', ')}, and ${actions[actions.length - 1]}`;
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
