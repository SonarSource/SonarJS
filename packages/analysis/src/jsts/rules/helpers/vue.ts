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
import type estree from 'estree';
import { lt, minVersion, validRange } from 'semver';
import type { AST } from 'vue-eslint-parser';
import { getVueVersion } from './dependency-manifests/dependencies.js';
import { getVariableFromName } from './ast.js';
import { getFullyQualifiedName } from './module.js';

type VChildElement = AST.VElement | AST.VText | AST.VExpressionContainer | AST.VStyleElement;

export type VueReactiveBindingKind = 'ref' | 'reactive';

const VUE_COMPOSITION_API_MIN_VERSION = '2.7.0';

const VUE_REF_FQN = 'vue.ref';
const VUE_REACTIVE_FQN = 'vue.reactive';

function isVueSetupScript(element: VChildElement): boolean {
  return (
    element.type === 'VElement' &&
    element.name === 'script' &&
    element.startTag.attributes.some(attr => attr.key.name === 'setup')
  );
}

export function isInsideVueSetupScript(node: estree.Node, ctx: Rule.RuleContext): boolean {
  const doc: AST.VDocumentFragment = ctx.sourceCode.parserServices?.getDocumentFragment?.();
  const setupScript = doc?.children.find(isVueSetupScript);
  return (
    !!setupScript &&
    !!node.range &&
    setupScript.range[0] <= node.range[0] &&
    setupScript.range[1] >= node.range[1]
  );
}

/**
 * Returns true when the project's Vue dependency range's floor (its minimum resolvable version)
 * is below the version that introduced the Composition API.
 *
 * Vue backported the Composition API and `<script setup>` into 2.7, not just 3.0, so that is the
 * real cutoff, not the Vue 3 major version. This looks at the range's floor rather than whether
 * the range could merely overlap 2.7+: a caret range's ceiling always reaches just under the next
 * major (e.g. "^2.6.11" allows up to, but excluding, 3.0.0), so any caret-pinned Vue 2 range would
 * technically overlap 2.7+ regardless of how old its floor is. In practice, such projects stay on
 * their pinned floor until someone deliberately bumps it, so the floor is what should gate the
 * rule. Ranges whose floor is already 2.7+ (e.g. "^2.7.0", "^2.7.0 || ^3.0.0", "^3.0.0") keep
 * reporting. Unknown/unparseable ranges (catalog:, workspace:, git:, missing dependency, ...) also
 * keep reporting.
 */
export function lacksCompositionApi(context: Rule.RuleContext): boolean {
  const vueVersionRange = getVueVersion(context);
  if (!vueVersionRange || !validRange(vueVersionRange)) {
    return false;
  }
  const floor = minVersion(vueVersionRange);
  return floor === null || lt(floor, VUE_COMPOSITION_API_MIN_VERSION);
}

/**
 * Resolves `identifier` to the variable it references and, if that variable is initialized by a
 * call to `ref()` or `reactive()` imported from 'vue', returns which one. Used to recognize
 * mutations of tracked reactive state without requiring the enclosing code to be independently
 * proven to be a Vue component: an import-resolved `ref`/`reactive` binding is itself a strong
 * enough Vue signal.
 */
export function getVueReactiveBindingKind(
  context: Rule.RuleContext,
  identifier: estree.Identifier,
): VueReactiveBindingKind | undefined {
  const variable = getVariableFromName(context, identifier.name, identifier);
  const definition = variable?.defs[0];
  if (definition?.type !== 'Variable') {
    return undefined;
  }
  const init = (definition.node as estree.VariableDeclarator).init;
  if (init?.type !== 'CallExpression') {
    return undefined;
  }
  const fqn = getFullyQualifiedName(context, init);
  if (fqn === VUE_REF_FQN) {
    return 'ref';
  }
  if (fqn === VUE_REACTIVE_FQN) {
    return 'reactive';
  }
  return undefined;
}
