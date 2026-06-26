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
// https://sonarsource.github.io/rspec/#/rspec/S8927/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { gte } from 'semver';
import { generateMeta } from '../helpers/generate-meta.js';
import { getDependenciesSanitizePaths } from '../helpers/dependency-manifests/dependencies.js';
import { isTypeOnlyImport } from '../helpers/ast.js';
import { getProjectMinVersion } from '../helpers/validate-version.js';
import * as meta from './generated-meta.js';

const messages = {
  useNamedImports: 'Use named imports from "{{library}}" instead of a default import.',
  useMethodImports:
    'Import used {{library}} methods from method-level subpaths such as "{{example}}".',
};

type LibraryRecommendation =
  | {
      minimumVersion: string;
      kind: 'named';
    }
  | {
      minimumVersion: string;
      kind: 'method';
      example: string;
    };

const LIBRARIES = {
  lodash: {
    minimumVersion: '4.0.0',
    kind: 'method',
    example: 'lodash/map',
  },
  'lodash-es': {
    minimumVersion: '4.0.0',
    kind: 'named',
  },
  rxjs: {
    minimumVersion: '7.2.0',
    kind: 'named',
  },
  rambda: {
    minimumVersion: '0.8.8',
    kind: 'named',
  },
  validator: {
    minimumVersion: '12.1.0',
    kind: 'method',
    example: 'validator/es/lib/isEmail',
  },
} as const satisfies Record<string, LibraryRecommendation>;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    const dependencies = getDependenciesSanitizePaths(context);

    return {
      ImportDeclaration(node: estree.ImportDeclaration) {
        if (
          isTypeOnlyImport(node) ||
          !hasDefaultImport(node) ||
          hasNamespaceImport(node) ||
          typeof node.source.value !== 'string'
        ) {
          return;
        }

        const library = node.source.value;
        const recommendation = getRecommendation(library);
        if (!recommendation) {
          return;
        }

        const version = dependencies.get(library);
        if (!supportsRecommendation(version, recommendation.minimumVersion)) {
          return;
        }

        if (recommendation.kind === 'method') {
          context.report({
            node,
            messageId: 'useMethodImports',
            data: {
              library,
              example: recommendation.example,
            },
          });
        } else {
          context.report({
            node,
            messageId: 'useNamedImports',
            data: {
              library,
            },
          });
        }
      },
    };
  },
};

function getRecommendation(library: string): LibraryRecommendation | undefined {
  return LIBRARIES[library as keyof typeof LIBRARIES];
}

function hasDefaultImport(node: estree.ImportDeclaration): boolean {
  return node.specifiers.some(specifier => specifier.type === 'ImportDefaultSpecifier');
}

function hasNamespaceImport(node: estree.ImportDeclaration): boolean {
  return node.specifiers.some(specifier => specifier.type === 'ImportNamespaceSpecifier');
}

function supportsRecommendation(versionRange: string | undefined, minimumVersion: string): boolean {
  if (versionRange === undefined) {
    return false;
  }
  const normalizedVersionRange = versionRange.trim();
  if (isUnboundedVersionRange(normalizedVersionRange)) {
    return true;
  }
  const minimumSupportedVersion = getProjectMinVersion(normalizedVersionRange);
  return minimumSupportedVersion !== null && gte(minimumSupportedVersion, minimumVersion);
}

function isUnboundedVersionRange(versionRange: string): boolean {
  return (
    versionRange === '' ||
    versionRange === '*' ||
    ['latest', 'x'].includes(versionRange.toLowerCase())
  );
}
