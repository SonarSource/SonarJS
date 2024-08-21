/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S1172/javascript

import { Rule, Scope } from 'eslint';
import * as estree from 'estree';
import { TSESTree } from '@typescript-eslint/utils';
import { generateMeta } from '../helpers';
import { meta } from './meta';

type FunctionLike =
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, {
    hasSuggestions: true,
    messages: {
      removeOrRenameParameter:
        'Remove the unused function parameter "{{param}}" or rename it to "_{{param}}" to make intention explicit.',
      suggestRemoveParameter: 'Remove "{{param}}" (beware of call sites)',
      suggestRenameParameter: 'Rename "{{param}}" to "_{{param}}"',
    },
  }),
  create(context: Rule.RuleContext) {
    return {
      'FunctionDeclaration, FunctionExpression'(node: estree.Node) {
        reportUnusedArgument(
          node,
          (node as estree.FunctionDeclaration | estree.FunctionExpression).id,
          context,
        );
      },
      ArrowFunctionExpression: (node: estree.Node) => {
        reportUnusedArgument(node, undefined, context);
      },
    };
  },
};

function reportUnusedArgument(
  node: estree.Node,
  functionId: estree.Identifier | undefined | null,
  context: Rule.RuleContext,
) {
  const parent = (node as TSESTree.Node).parent;
  if (parent && parent.type === 'Property' && parent.kind === 'set') {
    return;
  }

  if (
    context.sourceCode
      .getScope(node)
      .variables.some(
        v => v.name === 'arguments' && v.identifiers.length === 0 && v.references.length > 0,
      )
  ) {
    return;
  }

  let parametersVariable = context.sourceCode.getDeclaredVariables(node);

  if (functionId) {
    parametersVariable = parametersVariable.filter(v => v.name !== functionId.name);
  }

  for (const param of parametersVariable) {
    if (
      isUnusedVariable(param) &&
      !isIgnoredParameter(param) &&
      !isParameterProperty(param) &&
      !isThisParameter(param)
    ) {
      context.report({
        messageId: 'removeOrRenameParameter',
        node: param.identifiers[0],
        data: {
          param: param.name,
        },
        suggest: getSuggestions(param, context),
      });
    }
  }
}

function getSuggestions(paramVariable: Scope.Variable, context: Rule.RuleContext) {
  const paramIdentifier = paramVariable.identifiers[0];
  const suggestions: Rule.SuggestionReportDescriptor[] = [
    {
      messageId: 'suggestRenameParameter',
      data: {
        param: paramVariable.name,
      },
      fix: fixer => fixer.insertTextBefore(paramIdentifier, '_'),
    },
  ];
  const func = paramVariable.defs[0].node as FunctionLike;
  if ((paramIdentifier as TSESTree.Node).parent === func) {
    suggestions.push(getParameterRemovalSuggestion(func, paramVariable, paramIdentifier, context));
  }
  return suggestions;
}

function getParameterRemovalSuggestion(
  func: FunctionLike,
  paramVariable: Scope.Variable,
  paramIdentifier: estree.Identifier,
  context: Rule.RuleContext,
): Rule.SuggestionReportDescriptor {
  return {
    messageId: 'suggestRemoveParameter',
    data: {
      param: paramVariable.name,
    },
    fix: fixer => {
      const paramIndex = func.params.indexOf(paramIdentifier as TSESTree.Parameter);
      const param = func.params[paramIndex] as estree.Node;
      if (func.params.length === 1) {
        const openingParenthesis = context.sourceCode.getTokenBefore(param);
        const closingParenthesis = context.sourceCode.getTokenAfter(
          param,
          token => token.value === ')',
        );
        let [start, end] = param.range!;
        if (openingParenthesis && openingParenthesis.value === '(') {
          start = openingParenthesis.range[0];
          end = closingParenthesis!.range[1];
        }
        return fixer.replaceTextRange([start, end], '()');
      } else if (func.params.length - 1 === paramIndex) {
        const commaAfter = context.sourceCode.getTokenAfter(param, token => token.value === ',');
        const commaBefore = context.sourceCode.getTokenBefore(param, token => token.value === ',')!;
        let start = commaBefore.range[1];
        let end = param.range![1];
        if (commaAfter) {
          end = commaAfter.range[1];
        } else {
          start = commaBefore.range[0];
        }
        return fixer.removeRange([start, end]);
      } else {
        const [start] = func.params[paramIndex].range;
        const [end] = func.params[paramIndex + 1].range;
        return fixer.removeRange([start, end]);
      }
    },
  };
}

function isUnusedVariable(variable: Scope.Variable) {
  const refs = variable.references;
  //Parameter with default value has one reference, but should still be considered as unused.
  return refs.length === 0 || (refs.length === 1 && refs[0].init);
}

function isIgnoredParameter(variable: Scope.Variable) {
  return variable.name.startsWith('_');
}

export function isParameterProperty(variable: Scope.Variable) {
  return variable.defs.some(def => {
    const parent = (def.name as TSESTree.Node).parent;

    return (
      parent?.type === 'TSParameterProperty' ||
      (parent?.type === 'AssignmentPattern' && parent.parent?.type === 'TSParameterProperty')
    );
  });
}

function isThisParameter(variable: Scope.Variable) {
  return variable.name === 'this';
}
