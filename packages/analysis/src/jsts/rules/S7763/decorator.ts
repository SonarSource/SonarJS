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
// https://sonarsource.github.io/rspec/#/rspec/S7763/javascript

import type { Rule, SourceCode } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import * as meta from './generated-meta.js';

/**
 * S7763 is the unicorn/prefer-export-from rule.
 * This decorator suppresses false positives for locally defined exports:
 *   - `export function foo() {}`, `export class Foo {}` (always locally defined, not re-exports)
 *   - `export const alias = defaultImport` (default import alias — intentional naming, keep as-is)
 *   - `export const alias = localVar` (local variable — not a re-export candidate)
 *   - `export { locallyDefinedFn }` (identifier not found in any import specifier)
 *   - re-exporting default imports (e.g. `import foo from './foo'; export { foo }`)
 *
 * Named and namespace import aliases (e.g. `import {x}...; export const y = x` or
 * `import * as ns...; export const N = ns`) are still reported as genuine re-export candidates.
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

      // For ExportNamedDeclaration with a declaration, handle selectively:
      // - FunctionDeclaration and ClassDeclaration are always locally defined — suppress.
      // - VariableDeclaration: suppress only if no declarator's init is a named/namespace import.
      //   e.g. `import {x} from '...'; export const y = x` CAN be rewritten as
      //   `export { x as y } from '...'` — this is a genuine re-export candidate.
      if (node.type === 'ExportNamedDeclaration' && node.declaration != null) {
        if (isNamedImportAlias(context.sourceCode, node.declaration)) {
          context.report(reportDescriptor);
        }
        return;
      }

      const identifierName = getReportedIdentifierName(node);

      // Fail-open for unknown report node shapes: report rather than silently drop,
      // to avoid losing detection if the upstream rule changes its reported nodes.
      if (!identifierName) {
        context.report(reportDescriptor);
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
 * Returns true if the export declaration is a VariableDeclaration where at least one
 * declarator's init is a named or namespace import (genuine re-export candidate).
 * Returns false for FunctionDeclaration, ClassDeclaration, or VariableDeclarations
 * whose init values are not named/namespace imports (local variables or default imports).
 */
function isNamedImportAlias(sourceCode: SourceCode, decl: estree.Declaration): boolean {
  if (decl.type !== 'VariableDeclaration') {
    return false;
  }
  return decl.declarations.some(
    d => d.init?.type === 'Identifier' && getImportKind(sourceCode, d.init.name) === 'named',
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
