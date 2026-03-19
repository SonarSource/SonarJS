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
// https://sonarsource.github.io/rspec/#/rspec/S7763/javascript

import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import * as meta from './generated-meta.js';

/**
 * S7763 is the unicorn/prefer-export-from rule.
 * This decorator suppresses false positives for locally defined exports:
 *   - `export const alias = importedThing` (ExportNamedDeclaration with declaration)
 *   - `export { locallyDefinedFn }` (identifier not found in any import specifier)
 *   - re-exporting default imports (e.g. `import foo from './foo'; export { foo }`)
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      const node = 'node' in reportDescriptor ? reportDescriptor.node : undefined;
      if (!node) {
        context.report(reportDescriptor);
        return;
      }

      // Suppress ExportNamedDeclaration with a declaration (e.g. `export const alias = importedThing`).
      // The exported binding is a locally defined variable, not a re-export.
      if (node.type === 'ExportNamedDeclaration' && node.declaration !== null) {
        return;
      }

      const identifierName = getReportedIdentifierName(node);

      // Defensive: if the identifier cannot be extracted, suppress to avoid FPs.
      if (!identifierName) {
        return;
      }

      const importKind = getImportKind(context.sourceCode, identifierName);
      if (!importKind || importKind === 'default') {
        return;
      }

      context.report(reportDescriptor);
    },
  );
}

/**
 * Extracts the identifier name from the reported node.
 * The unicorn rule may report on different node types.
 */
function getReportedIdentifierName(node: estree.Node): string | undefined {
  switch (node.type) {
    case 'ExportSpecifier':
      // ExportSpecifier.local can be Identifier or Literal
      return node.local.type === 'Identifier' ? node.local.name : String(node.local.value);
    case 'Identifier':
      return node.name;
    case 'ExportDefaultDeclaration':
      return node.declaration.type === 'Identifier' ? node.declaration.name : undefined;
    default:
      return undefined;
  }
}

/**
 * Returns the import kind for an identifier name, or null if not imported.
 *
 * Returns 'default' for:
 *   import foo from './foo';                    // ImportDefaultSpecifier
 *   import { default as foo } from './foo';     // ImportSpecifier with imported name 'default'
 * Returns 'named' for any other import specifier.
 * Returns null if the identifier is not found in any import declaration.
 */
function getImportKind(sourceCode: SourceCode, identifierName: string): 'default' | 'named' | null {
  for (const node of sourceCode.ast.body) {
    if (node.type !== 'ImportDeclaration') {
      continue;
    }
    for (const specifier of node.specifiers) {
      if (specifier.local.name !== identifierName) {
        continue;
      }
      if (
        specifier.type === 'ImportDefaultSpecifier' ||
        (specifier.type === 'ImportSpecifier' &&
          (specifier.imported.type === 'Identifier'
            ? specifier.imported.name
            : String(specifier.imported.value)) === 'default')
      ) {
        return 'default';
      }
      return 'named';
    }
  }
  return null;
}
