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
// https://sonarsource.github.io/rspec/#/rspec/S5856/javascript

import type { Rule } from 'eslint';
import {
  generateMeta,
  getTypeFromTreeNode,
  isIdentifier,
  isRequiredParserServices,
  isStringLiteral,
  isStringType,
} from '../helpers/index.js';
import estree from 'estree';
import { RegExpValidator } from '@eslint-community/regexpp';
import * as meta from './generated-meta.js';

const validator = new RegExpValidator();

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    function getFlags(node: estree.CallExpression): string | null {
      if (node.arguments.length < 2) {
        return '';
      }

      if (isStringLiteral(node.arguments[1])) {
        return node.arguments[1].value as string;
      }

      return null;
    }

    function validateRegExpPattern(pattern: string, uFlag: boolean): string | null {
      try {
        validator.validatePattern(pattern, undefined, undefined, uFlag);
        return null;
      } catch (err) {
        return err.message;
      }
    }

    function validateRegExpFlags(flags: string) {
      try {
        validator.validateFlags(flags);
        return null;
      } catch {
        return `Invalid flags supplied to RegExp constructor '${flags}'`;
      }
    }

    function isRegExpConstructor(call: estree.CallExpression) {
      const { callee } = call;
      return callee.type === 'Identifier' && callee.name === 'RegExp';
    }

    function isStringMatch(call: estree.CallExpression) {
      const services = context.sourceCode.parserServices;
      if (!isRequiredParserServices(services)) {
        return false;
      }
      const { callee } = call;
      return (
        callee.type === 'MemberExpression' &&
        isStringType(getTypeFromTreeNode(callee.object, services)) &&
        isIdentifier(callee.property, 'match')
      );
    }

    function getPattern(call: estree.CallExpression): string | null {
      if (isStringLiteral(call.arguments[0])) {
        return call.arguments[0].value as string;
      }
      return null;
    }

    return {
      'CallExpression, NewExpression'(node: estree.Node) {
        const call = node as estree.CallExpression;
        if (!isRegExpConstructor(call) && !isStringMatch(call)) {
          return;
        }
        const pattern = getPattern(call);
        if (!pattern) {
          return;
        }
        const flags = getFlags(call);

        const message =
          (flags && validateRegExpFlags(flags)) ||
          // If flags are unknown, report the regex only if its pattern is invalid both with and without the "u" flag
          (flags === null
            ? validateRegExpPattern(pattern, true) && validateRegExpPattern(pattern, false)
            : validateRegExpPattern(pattern, flags.includes('u')));

        if (message) {
          context.report({
            node,
            message,
          });
        }
      },
    };
  },
};
