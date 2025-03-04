/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S4139/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import ts from 'typescript';
import {
  generateMeta,
  getTypeFromTreeNode,
  isArrayLikeType,
  isRequiredParserServices,
  isStringType,
} from '../helpers/index.js';
import * as meta from './meta.js';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, {
    messages: {
      useForOf: 'Use "for...of" to iterate over this "{{iterable}}".',
    },
  }),
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }
    return {
      ForInStatement: (node: estree.Node) => {
        const type = getTypeFromTreeNode((node as estree.ForInStatement).right, services);
        if (isIterable(type)) {
          const iterable = type.symbol ? type.symbol.name : 'String';
          context.report({
            messageId: 'useForOf',
            data: { iterable },
            loc: context.sourceCode.getFirstToken(node)!.loc,
          });
        }
      },
    };

    function isIterable(type: ts.Type) {
      return isCollection(type) || isStringType(type) || isArrayLikeType(type, services);
    }
  },
};

function isCollection(type: ts.Type) {
  return (
    type.symbol !== undefined &&
    [
      'Array',
      'Int8Array',
      'Uint8Array',
      'Uint8ClampedArray',
      'Int16Array',
      'Uint16Array',
      'Int32Array',
      'Uint32Array',
      'Float32Array',
      'Float64Array',
      'BigInt64Array',
      'BigUint64Array',
      'Set',
      'Map',
    ].includes(type.symbol.name)
  );
}
