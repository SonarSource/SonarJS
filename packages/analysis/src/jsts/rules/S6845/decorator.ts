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
import type { Rule } from 'eslint';
import type { JSXAttribute, JSXOpeningElement } from 'estree-jsx';
import pkg from 'jsx-ast-utils-x';
import { interceptReportForReact } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { isHtmlElement } from '../helpers/isHtmlElement.js';
import * as meta from './generated-meta.js';

const { getLiteralPropValue } = pkg;

/**
 * Suppresses the upstream report only for an intrinsic editing host with a statically enabled
 * contenteditable attribute. Such a host is keyboard-focusable, so its tabIndex is not redundant.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      const opening = openingElementOf(reportDescriptor);
      if (opening !== undefined && isEditableHtmlHost(opening)) {
        return;
      }
      context.report(reportDescriptor);
    },
  );
}

function openingElementOf(
  reportDescriptor: Rule.ReportDescriptor,
): TSESTree.JSXOpeningElement | undefined {
  if (!('node' in reportDescriptor) || !reportDescriptor.node) {
    return undefined;
  }
  const node = reportDescriptor.node as TSESTree.Node;
  return node.type === 'JSXAttribute' ? (node.parent as TSESTree.JSXOpeningElement) : undefined;
}

function isEditableHtmlHost(opening: TSESTree.JSXOpeningElement): boolean {
  const element = {
    type: 'JSXElement' as const,
    openingElement: opening,
  } as TSESTree.JSXElement;
  if (!isHtmlElement(element)) {
    return false;
  }
  // `isHtmlElement` includes SVG for other accessibility rules, but contenteditable is HTML-only.
  if (opening.name.type !== 'JSXIdentifier' || opening.name.name === 'svg') {
    return false;
  }

  const attribute = directContentEditableAttribute(opening);
  if (!attribute) {
    return false;
  }
  const value = getLiteralPropValue(attribute);
  return (
    value === true ||
    (typeof value === 'string' && ['', 'true', 'plaintext-only'].includes(value.toLowerCase()))
  );
}

function directContentEditableAttribute(
  opening: TSESTree.JSXOpeningElement,
): JSXAttribute | undefined {
  const attributes = (opening as unknown as JSXOpeningElement).attributes;
  // A spread may override a direct attribute (or be overridden by it), so it cannot prove the
  // host's final contenteditable value.
  if (attributes.some(attribute => attribute.type === 'JSXSpreadAttribute')) {
    return undefined;
  }
  const contentEditableAttributes = attributes.filter(
    (attribute): attribute is JSXAttribute =>
      attribute.type === 'JSXAttribute' &&
      attribute.name.type === 'JSXIdentifier' &&
      attribute.name.name.toLowerCase() === 'contenteditable',
  );
  return contentEditableAttributes.length === 1 ? contentEditableAttributes[0] : undefined;
}
