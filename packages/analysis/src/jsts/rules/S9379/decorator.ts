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
import { dom } from 'aria-query';
import { interceptReportForReact } from '../helpers/decorators/interceptor.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getElementType, getRole } from '../helpers/accessibility.js';
import * as meta from './generated-meta.js';

// ARIA roles for hand-rolled (non-`<dialog>`) modals.
const MODAL_ROLES = new Set(['dialog', 'alertdialog']);

// Mirrors sonar-html's S9379 message, spelled the JSX way.
const MESSAGE =
  'Remove this "autoFocus" attribute, as it can reduce usability and accessibility for users.';

/**
 * Decorates jsx-a11y's `no-autofocus` so autofocusing a `dialog`, a `popover` element, an
 * ARIA `dialog`/`alertdialog` role, or anything inside one, is not reported - moving focus
 * into a freshly opened modal/popover is expected. Non-DOM elements (e.g. `<Input autoFocus>`)
 * are exempt too, since `autoFocus` there isn't the DOM attribute.
 *
 * Known limitation: conditionally-mounted autofocus (e.g. `{isEditing && <input autoFocus/>}`)
 * is still reported, even though it's functionally the same "freshly revealed UI" case as
 * dialog/popover - see JS-2333.
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

/**
 * Known limitations:
 * - Can't tell a pass-through wrapper (e.g. `<Input.Search autoFocus>` on a native `<input>`)
 *   from an unrelated `autoFocus` prop - both look identical from the JSX tag alone.
 * - The ancestor walk follows the AST's `.parent` chain, so a JSX subtree assigned to a
 *   variable and spliced in later via `{button}` isn't seen as a descendant, even though it
 *   renders inside the modal at runtime.
 */
function isExemptFromReport(
  context: Rule.RuleContext,
  opening: TSESTree.JSXOpeningElement,
): boolean {
  // An `autoFocus`-named prop on a non-DOM element is not the DOM boolean attribute.
  if (!dom.has(getElementType(context)(opening))) {
    return true;
  }
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
  // Native tags are lowercase in JSX, so a custom `Dialog` component isn't mistaken for it.
  if (getElementType(context)(opening) === 'dialog') {
    return true;
  }
  if (getProp((opening as unknown as JSXOpeningElement).attributes, 'popover') !== undefined) {
    return true;
  }
  const role = getRole(opening);
  return role !== null && MODAL_ROLES.has(role);
}
