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
// https://sonarsource.github.io/rspec/#/rspec/S6598/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { generateMeta, interceptReport, isInsideVueSetupScript } from '../helpers/index.js';
import * as meta from './generated-meta.js';

function isReferencedByDefineEmits(name: string | undefined, context: Rule.RuleContext): boolean {
  if (!name) return false;
  for (const statement of context.sourceCode.ast.body) {
    let callExpr: estree.CallExpression | undefined;
    if (
      statement.type === 'ExpressionStatement' &&
      statement.expression.type === 'CallExpression'
    ) {
      callExpr = statement.expression;
    } else if (statement.type === 'VariableDeclaration') {
      for (const decl of statement.declarations) {
        if (decl.init?.type === 'CallExpression') {
          callExpr = decl.init;
        }
      }
    }
    if (callExpr?.callee.type === 'Identifier' && callExpr.callee.name === 'defineEmits') {
      const typeArgs = (callExpr as any).typeArguments ?? (callExpr as any).typeParameters;
      if (
        typeArgs?.params?.some(
          (p: any) => p.type === 'TSTypeReference' && p.typeName?.name === name,
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

function isDefineEmitsTypeArg(node: estree.Node, context: Rule.RuleContext): boolean {
  const parent = (node as any).parent;
  if (parent?.type === 'TSTypeLiteral') {
    const grandParent = parent.parent;
    // Inline type literal directly as defineEmits type argument
    if (grandParent?.type === 'TSTypeParameterInstantiation') {
      const greatGrandParent = grandParent.parent;
      return (
        greatGrandParent?.type === 'CallExpression' &&
        (greatGrandParent as any).callee?.name === 'defineEmits'
      );
    }
    // Named type alias referenced by defineEmits
    if (grandParent?.type === 'TSTypeAliasDeclaration') {
      return isReferencedByDefineEmits(grandParent.id?.name, context);
    }
  }
  // Named interface referenced by defineEmits
  if (parent?.type === 'TSInterfaceBody' && parent.parent?.type === 'TSInterfaceDeclaration') {
    return isReferencedByDefineEmits(parent.parent.id?.name, context);
  }
  return false;
}

// Rewording one of the issue messages reported by the core implementation.
// Suppresses false positives for defineEmits type arguments in Vue <script setup>.
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, {
        ...rule.meta!,
        messages: {
          ...rule.meta!.messages,
          /* Map to a more friendly message */
          functionTypeOverCallableType:
            '{{ literalOrInterface }} has only a call signature, you should use a function type instead.',
        },
      }),
    },
    (context, reportDescriptor) => {
      const node = (reportDescriptor as any).node as estree.Node;
      if (!isInsideVueSetupScript(node, context)) {
        context.report({ ...reportDescriptor });
        return;
      }
      if (!isDefineEmitsTypeArg(node, context)) {
        context.report({ ...reportDescriptor });
      }
    },
  );
}
