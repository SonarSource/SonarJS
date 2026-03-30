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
// https://sonarsource.github.io/rspec/#/rspec/S7784/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import type { TSESTree } from '@typescript-eslint/utils';
import { generateMeta } from '../helpers/generate-meta.js';
import { interceptReport } from '../helpers/decorators/interceptor.js';
import * as meta from './generated-meta.js';

/**
 * Decorates the unicorn/prefer-structured-clone rule to suppress reports when
 * JSON.parse(JSON.stringify(x)) appears inside a JSON.stringify() call.
 * In that context the intent is serialization normalization, not deep cloning.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReport(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, descriptor) => {
      if (!('node' in descriptor) || !isInsideJsonStringify(descriptor.node)) {
        context.report(descriptor);
      }
    },
  );
}

/**
 * Returns true when `node` is an argument (directly or nested in object/array/spread
 * expressions) of a JSON.stringify() call.
 */
function isInsideJsonStringify(node: estree.Node): boolean {
  let child = node as TSESTree.Node;
  let parent = child.parent;

  while (parent) {
    const estreeParent = parent as unknown as estree.Node;
    const estreeChild = child as unknown as estree.Node;
    if (!isPassthroughContainer(estreeParent, estreeChild)) {
      return isJsonStringifyCall(estreeParent);
    }
    child = parent;
    parent = parent.parent;
  }
  return false;
}

/** Transparent containers that can appear between the reported node and JSON.stringify(). */
function isPassthroughContainer(node: estree.Node, child: estree.Node): boolean {
  switch (node.type) {
    case 'ObjectExpression':
    case 'ArrayExpression':
    case 'SpreadElement':
      return true;
    case 'Property':
      // Only passthrough when child is the value side, not the key side.
      return (node as estree.Property).value === child;
    default:
      return false;
  }
}

/** Returns true when `node` is a JSON.stringify(...) call expression. */
function isJsonStringifyCall(node: estree.Node): boolean {
  if (node.type !== 'CallExpression') {
    return false;
  }
  const { callee } = node as estree.CallExpression;
  return (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    (callee.object as estree.Identifier).name === 'JSON' &&
    callee.property.type === 'Identifier' &&
    (callee.property as estree.Identifier).name === 'stringify'
  );
}
