/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
// https://jira.sonarsource.com/browse/RSPEC-5042

import { Rule } from 'eslint';
import * as estree from 'estree';
import {
  isIdentifier,
  isLiteral,
  getImportDeclarations,
  getRequireCalls,
  isCallToFQN,
  getValueOfExpression,
  getModuleNameOfIdentifier,
} from '../utils';

const ADM_ZIP = 'adm-zip';

export const rule: Rule.RuleModule = {
  meta: {
    messages: {
      safeExpanding: 'Make sure that expanding this archive file is safe here.',
    },
  },
  create(context: Rule.RuleContext) {
    function canBeProperty(prop: estree.Property | estree.SpreadElement, name: string) {
      return (
        prop.type === 'SpreadElement' ||
        isIdentifier(prop.key, name) ||
        (isLiteral(prop.key) && prop.key.value === name)
      );
    }

    function isCallToAdmZipExtractAll({ callee }: estree.CallExpression) {
      return callee.type === 'MemberExpression' && isIdentifier(callee.property, 'extractAllTo');
    }

    function isAdmZipLibraryInScope() {
      return isAdmZipLibraryImported() || isAdmZipLibraryRequired();
    }

    function isAdmZipLibraryImported() {
      return getImportDeclarations(context).some(i => i.source.value === ADM_ZIP);
    }

    function isAdmZipLibraryRequired() {
      return getRequireCalls(context).some(
        r => r.arguments[0].type === 'Literal' && r.arguments[0].value === ADM_ZIP,
      );
    }

    function isSensiteTarCall(call: estree.CallExpression) {
      if (isCallToFQN(context, call, 'tar', 'x')) {
        const firstArg = call.arguments.length > 0 ? call.arguments[0] : null;
        if (!firstArg) {
          return false;
        }
        const firstArgValue = getValueOfExpression(context, firstArg, 'ObjectExpression');
        return (
          !!firstArgValue && !firstArgValue.properties.some(prop => canBeProperty(prop, 'filter'))
        );
      }
      return false;
    }

    function isSensiteExtractZipCall(call: estree.CallExpression) {
      if (
        call.callee.type === 'Identifier' &&
        getModuleNameOfIdentifier(context, call.callee)?.value === 'extract-zip'
      ) {
        const secondArg = call.arguments.length > 1 ? call.arguments[1] : null;
        if (!secondArg) {
          return false;
        }
        const secondArgValue = getValueOfExpression(context, secondArg, 'ObjectExpression');
        return (
          !!secondArgValue &&
          !secondArgValue.properties.some(prop => canBeProperty(prop, 'onEntry'))
        );
      }
      return false;
    }

    return {
      CallExpression(node: estree.Node) {
        const call = node as estree.CallExpression;
        if (
          isSensiteTarCall(call) ||
          (isCallToAdmZipExtractAll(call) && isAdmZipLibraryInScope()) ||
          isCallToFQN(context, call, 'jszip', 'loadAsync') ||
          isCallToFQN(context, call, 'yauzl', 'open') ||
          isSensiteExtractZipCall(call)
        ) {
          context.report({
            messageId: 'safeExpanding',
            node: call.callee,
          });
        }
      },
    };
  },
};
