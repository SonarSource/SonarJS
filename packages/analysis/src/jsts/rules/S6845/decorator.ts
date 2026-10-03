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
import { interceptReportForReact } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { isHtmlElement } from '../helpers/isHtmlElement.js';
import * as meta from './generated-meta.js';

const VALUE_ATTRIBUTES = ['aria-valuemin', 'aria-valuemax', 'aria-valuenow'];
const DECIMAL_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

/**
 * Suppresses the upstream report only for an intrinsic separator with a complete, static value
 * range. Those attributes identify the separator as a focusable resize widget.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      const opening = openingElementOf(reportDescriptor);
      if (opening !== undefined && isFocusableSeparator(opening)) {
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

function isFocusableSeparator(opening: TSESTree.JSXOpeningElement): boolean {
  const element = {
    type: 'JSXElement' as const,
    openingElement: opening,
  } as TSESTree.JSXElement;
  if (!isHtmlElement(element)) {
    return false;
  }

  const attributes = (opening as unknown as JSXOpeningElement).attributes;
  if (attributes.some(attribute => attribute.type === 'JSXSpreadAttribute')) {
    return false;
  }

  const role = directLiteralAttribute(attributes, 'role');
  if (role !== 'separator') {
    return false;
  }

  const [minimum, maximum, current] = VALUE_ATTRIBUTES.map(name =>
    numericAttributeValue(attributes, name),
  );
  return (
    minimum !== undefined &&
    maximum !== undefined &&
    current !== undefined &&
    minimum <= current &&
    current <= maximum
  );
}

function directLiteralAttribute(
  attributes: JSXOpeningElement['attributes'],
  name: string,
): unknown {
  const matching = attributes.filter(
    (attribute): attribute is JSXAttribute =>
      attribute.type === 'JSXAttribute' &&
      attribute.name.type === 'JSXIdentifier' &&
      attribute.name.name.toLowerCase() === name,
  );
  if (matching.length !== 1) {
    return undefined;
  }
  const value = matching[0].value;
  const expression = value?.type === 'JSXExpressionContainer' ? value.expression : value;
  if (expression?.type === 'Literal') {
    return expression.value;
  }
  if (
    expression?.type === 'UnaryExpression' &&
    (expression.operator === '+' || expression.operator === '-') &&
    expression.argument.type === 'Literal' &&
    typeof expression.argument.value === 'number'
  ) {
    return expression.operator === '-' ? -expression.argument.value : expression.argument.value;
  }
  return undefined;
}

function numericAttributeValue(
  attributes: JSXOpeningElement['attributes'],
  name: string,
): number | undefined {
  const value = directLiteralAttribute(attributes, name);
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'string' && !DECIMAL_NUMBER.test(value))
  ) {
    return undefined;
  }
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}
