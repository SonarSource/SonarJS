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
import type { TSESTree } from '@typescript-eslint/utils';
import { ancestorsChain } from './ancestor.js';
import { last } from './collection.js';

const TEMPLATE_LITERAL_TYPES = new Set(['TemplateLiteral']);

/**
 * S4624 only reports nested template literals that start on the enclosing
 * template's first line or end on its last line.
 */
export function sharesBoundaryLineWithEnclosingTemplate(node: TSESTree.Node) {
  if (!node.loc) {
    return false;
  }

  const enclosingTemplate = findEnclosingTemplateLiteral(node);
  return (
    !!enclosingTemplate?.loc &&
    (node.loc.start.line === enclosingTemplate.loc.start.line ||
      node.loc.end.line === enclosingTemplate.loc.end.line)
  );
}

function findEnclosingTemplateLiteral(node: TSESTree.Node) {
  const ancestors = ancestorsChain(node, TEMPLATE_LITERAL_TYPES);
  const candidate = last(ancestors);
  return candidate?.type === 'TemplateLiteral' ? candidate : undefined;
}
