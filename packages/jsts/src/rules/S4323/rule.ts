/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
// https://sonarsource.github.io/rspec/#/rspec/S4323/javascript

import type { Rule } from 'eslint';
import estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta, report, toSecondaryLocation } from '../helpers/index.js';
import { meta } from './meta.js';

const TYPE_THRESHOLD = 2;
const USAGE_THRESHOLD = 2;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta as Rule.RuleMetaData, undefined, true),
  create(context: Rule.RuleContext) {
    let usage: Map<string, TSESTree.Node[]>;
    return {
      Program: () => (usage = new Map<string, TSESTree.Node[]>()),
      'Program:exit': () =>
        usage.forEach(nodes => {
          if (nodes.length > USAGE_THRESHOLD) {
            const [node, ...rest] = nodes;
            const kind = node.type === 'TSUnionType' ? 'union' : 'intersection';
            const message = `Replace this ${kind} type with a type alias.`;
            report(
              context,
              { message, loc: node.loc },
              rest.map(node => toSecondaryLocation(node, 'Following occurrence.')),
            );
          }
        }),
      'TSUnionType, TSIntersectionType': (node: estree.Node) => {
        const ancestors = context.sourceCode.getAncestors(node);
        const declaration = ancestors.find(
          ancestor => (ancestor as TSESTree.Node).type === 'TSTypeAliasDeclaration',
        );
        if (declaration) {
          return;
        }

        const composite = node as unknown as TSESTree.TSUnionType | TSESTree.TSIntersectionType;
        if (composite.types.length <= TYPE_THRESHOLD) {
          return;
        }

        if (isNullableType(composite)) {
          return;
        }

        const text = composite.types
          .map(typeNode => context.sourceCode.getText(typeNode as unknown as estree.Node))
          .sort((a, b) => a.localeCompare(b))
          .join('|');
        let occurrences = usage.get(text);
        if (!occurrences) {
          occurrences = [composite];
          usage.set(text, occurrences);
        } else {
          occurrences.push(composite);
        }
      },
    };

    function isNullableType(node: TSESTree.TSUnionType | TSESTree.TSIntersectionType) {
      return (
        node.type === 'TSUnionType' &&
        node.types.filter(
          type => type.type !== 'TSNullKeyword' && type.type !== 'TSUndefinedKeyword',
        ).length === 1
      );
    }
  },
};
