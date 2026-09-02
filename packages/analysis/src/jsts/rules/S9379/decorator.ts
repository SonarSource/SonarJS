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
import { getElementType, getRole } from '../helpers/accessibility.js';
import * as meta from './generated-meta.js';

// ARIA roles that mark a hand-rolled (non-native-`<dialog>`) modal, per the WAI-ARIA spec.
const MODAL_ROLES = new Set(['dialog', 'alertdialog']);

// Mirrors the sonar-html S9379 message ("Remove this "autofocus" attribute, as it can reduce
// usability and accessibility for users."), spelling the attribute the JSX way.
const MESSAGE =
  'Remove this "autoFocus" attribute, as it can reduce usability and accessibility for users.';

/**
 * Decorates the jsx-a11y `no-autofocus` rule so that autofocusing a `dialog` element, an
 * element carrying a `popover` attribute, an element with an ARIA `dialog`/`alertdialog` role,
 * or any element inside one of those, is not reported: moving focus into a freshly opened
 * modal or popover is expected, and the modal/popover element itself is a valid autofocus
 * target when it should receive focus as soon as it opens. An `autoFocus`-named prop on a
 * custom component (e.g. a design-system `<Input autoFocus>`) is never reported either, since
 * it says nothing about real DOM focus behavior - enforced by always forcing upstream's own
 * `ignoreNonDOM` option on, rather than exposing it as a user-configurable field.
 */
export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return interceptReportForReact(
    {
      ...withIgnoreNonDOM(rule),
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

function withIgnoreNonDOM(rule: Rule.RuleModule): Rule.RuleModule {
  return {
    ...rule,
    create(context: Rule.RuleContext): Rule.RuleListener {
      const overriddenContext = Object.create(context, {
        options: {
          value: [{ ignoreNonDOM: true }],
          enumerable: true,
        },
      }) as Rule.RuleContext;
      return rule.create(overriddenContext);
    },
  };
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
 * Known limitation: the walk below follows the JSX AST's `.parent` chain, which reflects
 * lexical nesting, not runtime composition. When a JSX subtree is first assigned to a local
 * variable and only spliced into the modal later via `{variableName}` (a common React idiom
 * for conditional buttons/rows), the variable's own JSX node never has the modal as an
 * ancestor in the parsed AST, even though it renders inside it at runtime - so this walk
 * cannot see it and a false positive is reported. Resolving this in general would require
 * tracing the variable back to its assignment (data-flow analysis), which is out of scope for
 * this decorator.
 */
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
  // Native HTML tags are always written lowercase in JSX; a custom component (e.g. `Dialog`)
  // is never mistaken for the real `<dialog>` element.
  if (getElementType(context)(opening) === 'dialog') {
    return true;
  }
  if (getProp((opening as unknown as JSXOpeningElement).attributes, 'popover') !== undefined) {
    return true;
  }
  const role = getRole(opening);
  return role !== null && MODAL_ROLES.has(role);
}
