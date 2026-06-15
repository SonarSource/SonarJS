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
// https://sonarsource.github.io/rspec/#/rspec/S3798/javascript
import type { Rule, Scope, SourceCode } from 'eslint';
import type estree from 'estree';
import { generateMeta } from '../helpers/generate-meta.js';
import { childrenOf } from '../helpers/ancestor.js';
import type { ModuleType } from '../helpers/dependency-manifests/resolvers/types.js';
import * as meta from './generated-meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      defineLocally:
        'Define this declaration in a local scope or bind explicitly the property to the global object.',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      Program(node: estree.Program) {
        if (isModuleFile(context, node)) {
          return;
        }

        const globalScope = context.sourceCode.scopeManager.globalScope;
        const topLevelScope = findTopLevelScope(context);
        if (!globalScope || !topLevelScope) {
          return;
        }

        const predefinedGlobals = getPredefinedGlobals(context, globalScope);
        for (const variable of topLevelScope.variables) {
          processVariable(context, variable, predefinedGlobals);
        }
      },
    };
  },
};

function processVariable(
  context: Rule.RuleContext,
  variable: Scope.Variable,
  predefinedGlobals: Set<string>,
) {
  if (predefinedGlobals.has(variable.name)) {
    // Avoid reporting on redefinitions of known globals such as isNaN or alert.
    return;
  }
  for (const def of variable.defs) {
    const defNode = def.node;
    if (def.type === 'FunctionName' || (def.type === 'Variable' && def.parent?.kind === 'var')) {
      context.report({
        node: defNode,
        messageId: 'defineLocally',
      });
      return;
    }
  }
}

function isModuleFile(context: Rule.RuleContext, node: estree.Program) {
  const detectedModuleType = getDetectedModuleType(context);
  return (
    detectedModuleType === 'module' ||
    detectedModuleType === 'commonjs' ||
    usesModuleSyntax(node, context.sourceCode)
  );
}

function findTopLevelScope(context: Rule.RuleContext) {
  return (
    context.sourceCode.scopeManager.scopes.find(scope => scope.type === 'module') ??
    context.sourceCode.scopeManager.globalScope
  );
}

function getPredefinedGlobals(context: Rule.RuleContext, globalScope: Scope.Scope): Set<string> {
  const settings = context.settings as {
    predefinedGlobals?: string[];
  };
  return new Set([
    ...(settings.predefinedGlobals ?? []),
    ...globalScope.variables.filter(variable => variable.defs.length === 0).map(({ name }) => name),
  ]);
}

function getDetectedModuleType(context: Rule.RuleContext): ModuleType | undefined {
  return (context.settings as { detectedModuleType?: ModuleType }).detectedModuleType;
}

function usesModuleSyntax(node: estree.Program, sourceCode: SourceCode): boolean {
  return node.body.some(
    statement => isModuleDeclaration(statement) || hasTopLevelAwait(statement, sourceCode),
  );
}

function isModuleDeclaration(statement: estree.Program['body'][number]) {
  return (
    statement.type === 'ImportDeclaration' ||
    statement.type === 'ExportAllDeclaration' ||
    statement.type === 'ExportDefaultDeclaration' ||
    statement.type === 'ExportNamedDeclaration'
  );
}

function hasTopLevelAwait(node: estree.Node, sourceCode: SourceCode): boolean {
  if (
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression'
  ) {
    return false;
  }
  if (node.type === 'AwaitExpression') {
    return true;
  }
  if (node.type === 'ForOfStatement' && node.await) {
    return true;
  }
  return childrenOf(node, sourceCode.visitorKeys).some(child =>
    hasTopLevelAwait(child, sourceCode),
  );
}
