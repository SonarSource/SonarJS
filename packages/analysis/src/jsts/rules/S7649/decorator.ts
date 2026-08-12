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
import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import type estree from 'estree';
import { isStringLiteral } from '../helpers/ast.js';
import { findFirstMatchingAncestor } from '../helpers/ancestor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import * as meta from './generated-meta.js';

const RESERVED_WORDS = new Set([
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
]);

function getEnclosingMemberName(node: estree.Node): string | undefined {
  const member = findFirstMatchingAncestor(
    node as TSESTree.Node,
    ancestor => ancestor.type === 'PropertyDefinition' || ancestor.type === 'MethodDefinition',
  );
  return member && 'key' in member && member.key.type === 'Identifier'
    ? member.key.name
    : undefined;
}

function getAliasName(node: estree.Node): string | undefined {
  if (isStringLiteral(node)) {
    return node.value;
  }
  if (node.type === 'TemplateElement') {
    return node.value.cooked ?? undefined;
  }
  return undefined;
}

function isReservedWordRename(node: estree.Node): boolean {
  if (isStringLiteral(node) && (node as TSESTree.Node).parent?.type === 'ArrayExpression') {
    // `inputs: ['propertyName: aliasName']` metadata form: both names share one literal
    const [propertyName, aliasName] = node.value.split(':').map(part => part.trim());
    return aliasName !== undefined && RESERVED_WORDS.has(aliasName) && aliasName !== propertyName;
  }
  const aliasName = getAliasName(node);
  if (aliasName === undefined || !RESERVED_WORDS.has(aliasName)) {
    return false;
  }
  return getEnclosingMemberName(node) !== aliasName;
}

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      if (!('node' in reportDescriptor) || !isReservedWordRename(reportDescriptor.node)) {
        context.report(reportDescriptor);
      }
    },
  );
}
