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
// https://sonarsource.github.io/rspec/#/rspec/S6759/javascript

import type { Rule } from 'eslint';
import type { Function, Node, ReturnStatement } from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import {
  generateMeta,
  getTypeFromTreeNode,
  getUniqueWriteUsageOrNode,
  isRequiredParserServices,
  last,
  RequiredParserServices,
} from '../helpers/index.js';
import { isPropertyReadonlyInType } from 'ts-api-utils';
import * as meta from './generated-meta.js';

/**
 * Stacks return statements per function.
 */
interface FunctionInfo {
  returns: ReturnStatement[];
}

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    hasSuggestions: true,
    messages: {
      readOnlyProps: 'Mark the props of the component as read-only.',
      readOnlyPropsFix: 'Mark the props as read-only',
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    const functionInfo: FunctionInfo[] = [];
    return {
      ':function'() {
        functionInfo.push({ returns: [] });
      },
      ':function:exit'(node: Function) {
        /* Functional component */
        const info = functionInfo.pop();
        if (!info || !isFunctionalComponent(node, info)) {
          return;
        }

        /* Provides props */
        const [props] = node.params;
        if (!props) {
          return;
        }

        /* Includes type annotation */
        const { typeAnnotation } = props as TSESTree.Parameter & {
          typeAnnotation?: TSESTree.TSTypeAnnotation;
        };
        if (!typeAnnotation) {
          return;
        }

        /* Read-only props */
        if (!isReadOnly(props, services)) {
          context.report({
            node: props,
            messageId: 'readOnlyProps',
            suggest: [
              {
                messageId: 'readOnlyPropsFix',
                fix(fixer) {
                  const tpe = typeAnnotation.typeAnnotation as unknown as Node;
                  const oldText = context.sourceCode.getText(tpe);
                  const newText = `Readonly<${oldText}>`;
                  return fixer.replaceText(tpe, newText);
                },
              },
            ],
          });
        }
      },
      ReturnStatement(node: ReturnStatement) {
        const current = last(functionInfo);
        if (current) {
          current.returns.push(node);
        }
      },
    };

    /**
     * A function is considered to be a React functional component if it
     * is a named function declaration with a starting uppercase letter,
     * it takes at most one parameter, and it returns some JSX value.
     */
    function isFunctionalComponent(node: Function, info: FunctionInfo) {
      /* Named function declaration */
      if (node.type !== 'FunctionDeclaration' || node.id === null) {
        return false;
      }

      /* Starts with uppercase */
      const name = node.id.name;
      if (!(name && /^[A-Z]/.test(name))) {
        return false;
      }

      /* At most one parameter (for props) */
      const paramCount = node.params.length;
      if (paramCount > 1) {
        return false;
      }

      /* Returns JSX value */
      const { returns } = info;
      for (const ret of returns) {
        if (!ret.argument) {
          continue;
        }

        const value = getUniqueWriteUsageOrNode(context, ret.argument);
        if (value.type.startsWith('JSX')) {
          return true;
        }
      }

      return false;
    }
  },
};

/**
 * A props type is considered to be read-only if the type annotation
 * is decorated with TypeScript utility type `Readonly` or if all its
 * resolved properties are read-only (regardless of how the type was constructed).
 */
function isReadOnly(props: Node, services: RequiredParserServices) {
  const type = getTypeFromTreeNode(props, services);
  const checker = services.program.getTypeChecker();

  /* Readonly utility type */
  if (type.aliasSymbol?.escapedName === 'Readonly') {
    return true;
  }

  /* Check all properties of the resolved type */
  const properties = type.getProperties();
  if (properties.length === 0) {
    /* No properties - consider read-only to avoid noise */
    return true;
  }

  /* All properties must be read-only */
  return properties.every(property =>
    isPropertyReadonlyInType(type, property.getEscapedName(), checker),
  );
}
