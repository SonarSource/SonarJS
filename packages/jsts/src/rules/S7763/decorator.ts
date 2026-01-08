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
import { generateMeta, interceptReport } from '../helpers/index.js';
import * as meta from './generated-meta.js';

/**
 * S7763 is the unicorn/prefer-export-from rule.
 * This decorator adds an exception for re-exporting default imports.
 *
 * When you import a default export and give it a meaningful name during re-export,
 * the two-step pattern may provide better IDE refactoring support.
 *
 * Example that should NOT be flagged after this fix:
 *   import { default as foo } from './foo';
 *   export { foo };
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

      const identifierName = getReportedIdentifierName(node);

      // Suppress the report for default import re-exports
      if (identifierName && isDefaultImport(context.sourceCode, identifierName)) {
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
 * Checks if the given identifier name comes from a default import.
 *
 * Matches patterns like:
 *   import foo from './foo';           // foo is the default import
 *   import { default as foo } from './foo';  // foo is aliased from default
 */
function isDefaultImport(sourceCode: SourceCode, identifierName: string): boolean {
  for (const node of sourceCode.ast.body) {
    if (node.type === 'ImportDeclaration' && hasDefaultImportFor(node, identifierName)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if an import declaration has a default import for the given identifier name.
 */
function hasDefaultImportFor(node: estree.ImportDeclaration, identifierName: string): boolean {
  for (const specifier of node.specifiers) {
    if (isMatchingDefaultImport(specifier, identifierName)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a specifier is a default import matching the identifier name.
 */
function isMatchingDefaultImport(
  specifier:
    | estree.ImportSpecifier
    | estree.ImportDefaultSpecifier
    | estree.ImportNamespaceSpecifier,
  identifierName: string,
): boolean {
  // Check for: import foo from './foo'
  if (specifier.type === 'ImportDefaultSpecifier') {
    return specifier.local.name === identifierName;
  }

  // Check for: import { default as foo } from './foo'
  if (specifier.type === 'ImportSpecifier' && specifier.local.name === identifierName) {
    const importedName =
      specifier.imported.type === 'Identifier'
        ? specifier.imported.name
        : String(specifier.imported.value);
    return importedName === 'default';
  }

  return false;
}
