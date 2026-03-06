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
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import { isInsideVueSetupScript } from '../helpers/vue.js';
import * as meta from './generated-meta.js';

function getTopLevelCallExprs(context: Rule.RuleContext): TSESTree.CallExpression[] {
  return context.sourceCode.ast.body.flatMap(stmt => {
    if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'CallExpression') {
      return [stmt.expression as unknown as TSESTree.CallExpression];
    }
    if (stmt.type === 'VariableDeclaration') {
      return stmt.declarations
        .filter(decl => decl.init?.type === 'CallExpression')
        .map(decl => decl.init as unknown as TSESTree.CallExpression);
    }
    return [];
  });
}

function isReferencedByDefineEmits(name: string, context: Rule.RuleContext): boolean {
  return getTopLevelCallExprs(context).some(call => {
    if (call.callee.type !== 'Identifier' || call.callee.name !== 'defineEmits') {
      return false;
    }
    return (
      call.typeArguments?.params?.some(
        p =>
          p.type === 'TSTypeReference' &&
          p.typeName.type === 'Identifier' &&
          p.typeName.name === name,
      ) ?? false
    );
  });
}

function isDefineEmitsTypeArg(
  node: TSESTree.TSCallSignatureDeclaration,
  context: Rule.RuleContext,
): boolean {
  const { parent } = node;
  if (parent.type === 'TSTypeLiteral') {
    const grandParent = parent.parent;
    // Inline type literal directly as defineEmits type argument
    if (grandParent.type === 'TSTypeParameterInstantiation') {
      const greatGrandParent = grandParent.parent;
      if (greatGrandParent.type === 'CallExpression') {
        const { callee } = greatGrandParent;
        return callee.type === 'Identifier' && callee.name === 'defineEmits';
      }
      return false;
    }
    // Named type alias referenced by defineEmits
    if (grandParent.type === 'TSTypeAliasDeclaration') {
      return isReferencedByDefineEmits(grandParent.id.name, context);
    }
    return false;
  }
  // Named interface referenced by defineEmits
  if (parent.type === 'TSInterfaceBody') {
    return isReferencedByDefineEmits(parent.parent.id.name, context);
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
      const node = (reportDescriptor as unknown as { node: TSESTree.TSCallSignatureDeclaration })
        .node;
      if (!isInsideVueSetupScript(node as unknown as estree.Node, context)) {
        context.report({ ...reportDescriptor });
        return;
      }
      if (!isDefineEmitsTypeArg(node, context)) {
        context.report({ ...reportDescriptor });
      }
    },
  );
}
