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
// https://sonarsource.github.io/rspec/#/rspec/S5725/javascript

import type { Rule, Scope } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta } from '../helpers/generate-meta.js';
import { getTypeAsString } from '../helpers/type.js';
import { isIdentifier } from '../helpers/ast.js';
import { isRequiredParserServices } from '../helpers/parser-services.js';
import * as meta from './generated-meta.js';

// Matches a path segment with a semantic version (e.g. /3.7.1/, /v5.3.0/, /1.2/, /3.7.1-rc.1/)
// or a package@version alias (e.g. /jquery@3.7.1/, /bootstrap@5.3.0, /react@19.0.0-rc.1/).
// Prerelease identifiers (e.g. -rc.1, -beta.3) are included.
// The lookahead allows the version to be the last path segment (no trailing slash required).
const SEMVER_PATH_REGEX = /\/v?\d+\.\d+(?:\.\d+)?(?:-[a-zA-Z0-9][a-zA-Z0-9.-]*)?(?=[/?#]|$)/;
const ALIAS_PATH_REGEX = /\/[^/@]*@[\d.]+(?:-[a-zA-Z0-9][a-zA-Z0-9.-]*)?(?=[/?#]|$)/;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      missingBoth:
        'Add integrity and crossorigin="anonymous" attributes to this element to enforce integrity checks.',
      missingIntegrity: 'Add an integrity attribute to this element to enforce integrity checks.',
      missingCrossOrigin:
        'Add a crossorigin="anonymous" attribute to this element to enforce integrity checks.',
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }

    return {
      'VariableDeclarator[init.type="CallExpression"]': (node: estree.Node) => {
        const variableDeclarator = node as estree.VariableDeclarator;
        const callExpression = variableDeclarator.init as estree.CallExpression;
        const left = variableDeclarator.id;
        const { callee } = callExpression;
        if (left.type !== 'Identifier') {
          return;
        }
        if (callee.type !== 'MemberExpression') {
          return;
        }
        const typeName = getTypeAsString(left, services);
        if (
          !isIdentifier(callee.object, 'document') ||
          !isIdentifier(callee.property, 'createElement') ||
          typeName !== 'HTMLScriptElement'
        ) {
          return;
        }
        const scope = context.sourceCode.getScope(node);
        const assignedVariable = scope.variables.find(v => v.name === left.name);
        if (!assignedVariable) {
          return;
        }
        const messageId = shouldReport(assignedVariable);
        if (messageId) {
          context.report({ node: variableDeclarator, messageId });
        }
      },
    };
  },
};

function isIntegrityAssignment(memberExpression: TSESTree.Node): boolean {
  if (memberExpression.type !== 'MemberExpression') {
    return false;
  }
  return (
    memberExpression.property.type === 'Identifier' &&
    memberExpression.property.name === 'integrity'
  );
}

function isCrossOriginAssignment(memberExpression: TSESTree.Node): boolean {
  if (memberExpression.type !== 'MemberExpression') {
    return false;
  }
  if (
    memberExpression.property.type !== 'Identifier' ||
    memberExpression.property.name !== 'crossOrigin'
  ) {
    return false;
  }
  return memberExpression.parent?.type === 'AssignmentExpression';
}

function isCrossOriginAnonymousAssignment(memberExpression: TSESTree.Node): boolean {
  if (!isCrossOriginAssignment(memberExpression)) {
    return false;
  }
  const right = (memberExpression.parent as estree.AssignmentExpression).right;
  return right.type === 'Literal' && right.value === 'anonymous';
}

// Returns true when crossOrigin is assigned a non-literal value that cannot be statically
// resolved — we treat this conservatively as potentially "anonymous" to avoid false positives.
function isCrossOriginUnresolvedAssignment(memberExpression: TSESTree.Node): boolean {
  if (!isCrossOriginAssignment(memberExpression)) {
    return false;
  }
  const right = (memberExpression.parent as estree.AssignmentExpression).right;
  return right.type !== 'Literal';
}

function isSrcAssignment(memberExpression: TSESTree.Node): boolean {
  if (memberExpression.type !== 'MemberExpression') {
    return false;
  }
  if (memberExpression.property.type !== 'Identifier' || memberExpression.property.name !== 'src') {
    return false;
  }
  const assignmentExpression = memberExpression.parent;
  return assignmentExpression?.type === 'AssignmentExpression';
}

function isVersionedRemoteUrl(memberExpression: TSESTree.Node): boolean {
  if (!isSrcAssignment(memberExpression)) {
    return false;
  }
  const right = (memberExpression.parent as estree.AssignmentExpression).right;
  if (right.type !== 'Literal' || typeof right.value !== 'string') {
    return false;
  }
  const url = right.value;
  return (
    (url.startsWith('http') || url.startsWith('//')) &&
    (SEMVER_PATH_REGEX.test(url) || ALIAS_PATH_REGEX.test(url))
  );
}

type MessageId = 'missingBoth' | 'missingIntegrity' | 'missingCrossOrigin';

function shouldReport(assignedVariable: Scope.Variable): MessageId | null {
  let nbSrcAssignment = 0;
  let hasVersionedRemoteUrl = false;
  let hasIntegrityAssignment = false;
  let hasCrossOriginAnonymous = false;
  let hasCrossOriginUnresolved = false;
  for (const ref of assignedVariable.references) {
    const parentNode = (ref.identifier as TSESTree.Node).parent;
    if (!parentNode) {
      continue;
    }
    nbSrcAssignment += isSrcAssignment(parentNode) ? 1 : 0;
    hasVersionedRemoteUrl = hasVersionedRemoteUrl || isVersionedRemoteUrl(parentNode);
    hasIntegrityAssignment = hasIntegrityAssignment || isIntegrityAssignment(parentNode);
    // Overwrite on each crossOrigin assignment so the last assignment wins.
    // Using || would make an earlier "anonymous" mask a later "use-credentials".
    if (isCrossOriginAnonymousAssignment(parentNode)) {
      hasCrossOriginAnonymous = true;
      hasCrossOriginUnresolved = false;
    } else if (isCrossOriginUnresolvedAssignment(parentNode)) {
      hasCrossOriginAnonymous = false;
      hasCrossOriginUnresolved = true;
    } else if (isCrossOriginAssignment(parentNode)) {
      hasCrossOriginAnonymous = false;
      hasCrossOriginUnresolved = false;
    }
  }
  if (nbSrcAssignment !== 1 || !hasVersionedRemoteUrl) {
    return null;
  }
  const crossOriginOk = hasCrossOriginAnonymous || hasCrossOriginUnresolved;
  if (!hasIntegrityAssignment && !crossOriginOk) {
    return 'missingBoth';
  }
  if (!hasIntegrityAssignment) {
    return 'missingIntegrity';
  }
  if (!crossOriginOk) {
    return 'missingCrossOrigin';
  }
  return null;
}
