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
import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import type { JSXOpeningElement } from 'estree-jsx';
import pkg from 'jsx-ast-utils-x';
const { getProp } = pkg;
import { interceptReportForReact } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getElementType } from '../helpers/accessibility.js';
import * as meta from './generated-meta.js';

// Matches a component name that identifies it as a modal/overlay wrapper (native `dialog`
// and `popover` are handled separately, since JSX lowercase tags are never custom components).
// No leading anchor: a capitalized keyword occurring anywhere in a PascalCase identifier is a
// real word boundary by convention, so this matches both `ModalWrapper` and `CustomModal`. The
// trailing negative lookahead rejects a lowercase continuation right after the keyword, so
// `DialogContent`/`ConfirmDialog` match but `Dialogue`/`Modality` do not.
const MODAL_COMPONENT_NAME_PATTERN = /(Modal|Dialog|Popup|Drawer|Sheet|Popover)(?![a-z])/;

// Mirrors the sonar-html S9379 message ("Remove this "autofocus" attribute, as it can reduce
// usability and accessibility for users."), spelling the attribute the JSX way.
const MESSAGE =
  'Remove this "autoFocus" attribute, as it can reduce usability and accessibility for users.';

/**
 * Decorates the jsx-a11y `no-autofocus` rule so that autofocusing a `dialog` element, an
 * element carrying a `popover` attribute, a component whose name identifies it as a modal
 * wrapper (`Modal`, `Dialog`, `Popup`, `Drawer`, `Sheet`, `Popover`, e.g. `DialogContent`),
 * or any element inside one of those, is not reported: moving focus into a freshly opened
 * modal or popover is expected, and the modal/popover element itself is a valid autofocus
 * target when it should receive focus as soon as it opens.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    {
      ...rule,
      meta: generateMeta(meta, rule.meta),
    },
    (context, reportDescriptor) => {
      const opening = openingElementOf(reportDescriptor);
      if (opening !== undefined && isExemptFromReport(context, opening)) {
        return;
      }
      context.report({ ...reportDescriptor, message: MESSAGE });
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
  if (node.type === 'JSXAttribute') {
    return node.parent as TSESTree.JSXOpeningElement;
  }
  if (node.type === 'JSXOpeningElement') {
    return node;
  }
  return undefined;
}

function isExemptFromReport(
  context: Rule.RuleContext,
  opening: TSESTree.JSXOpeningElement,
): boolean {
  if (isModalOpeningElement(context, opening)) {
    return true;
  }
  let node: TSESTree.Node | undefined = opening.parent?.parent;
  while (node) {
    if (node.type === 'JSXElement' && isModalOpeningElement(context, node.openingElement)) {
      return true;
    }
    node = node.parent;
  }
  return false;
}

function isModalOpeningElement(
  context: Rule.RuleContext,
  opening: TSESTree.JSXOpeningElement,
): boolean {
  const tag = getElementType(context)(opening);
  if (tag.toLowerCase() === 'dialog') {
    return true;
  }
  if (getProp((opening as unknown as JSXOpeningElement).attributes, 'popover') !== undefined) {
    return true;
  }
  return MODAL_COMPONENT_NAME_PATTERN.test(tag);
}
