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
// https://sonarsource.github.io/rspec/#/rspec/S9150/javascript

import type { Rule } from 'eslint';
import type estree from 'estree';
import { intersects, validRange } from 'semver';
import {
  getValueOfExpression,
  getVariableFromName,
  isIdentifier,
  isStringLiteral,
} from '../helpers/ast.js';
import { getVueVersion } from '../helpers/dependency-manifests/dependencies.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { type IssueLocation, report, toSecondaryLocation } from '../helpers/location.js';
import * as meta from './generated-meta.js';

const messages = {
  replaceMixin: 'Replace this mixin with a Vue composable.',
  mixinDefinedHere: 'Mixin defined here. Extract it into a composable.',
};

const VUE_WITH_COMPOSITION_API_RANGE = '>=2.7.0';
const MIXINS_PROPERTY_NAME = 'mixins';

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta),
  create(context: Rule.RuleContext) {
    if (lacksCompositionApi(context)) {
      return {};
    }

    return {
      ObjectExpression(node: estree.ObjectExpression) {
        const mixinsProperty = findMixinsProperty(node);
        if (!mixinsProperty) {
          return;
        }
        const mixinsArray = resolveMixinsArray(context, mixinsProperty.value);
        if (!mixinsArray) {
          return;
        }
        const secondaries = getMixinIdentifiers(mixinsArray)
          .map(identifier => resolveMixinSecondaryLocation(context, identifier))
          .filter((location): location is IssueLocation => location !== undefined);
        report(context, { message: messages.replaceMixin, node: mixinsProperty }, secondaries);
      },
    };
  },
};

/**
 * Looks for a `mixins` key directly declared on the object literal. Properties merged in through
 * a spread element are intentionally not followed: the spread source, if it is itself an object
 * literal declaring `mixins`, is visited and reported on its own as an `ObjectExpression`.
 */
function findMixinsProperty(node: estree.ObjectExpression): estree.Property | undefined {
  return node.properties.find(
    (property): property is estree.Property =>
      property.type === 'Property' &&
      (isIdentifier(property.key, MIXINS_PROPERTY_NAME) ||
        (isStringLiteral(property.key) && property.key.value === MIXINS_PROPERTY_NAME)),
  );
}

/**
 * Vue's `mixins` option is always an array. Requiring the property's value to be one (or to
 * resolve to one through a local variable) filters out unrelated, non-Vue uses of a `mixins` key
 * that couldn't be a real mixins list, e.g. `{ mixins: "hey" }`.
 */
function resolveMixinsArray(
  context: Rule.RuleContext,
  value: estree.Node,
): estree.ArrayExpression | undefined {
  return value.type === 'ArrayExpression'
    ? value
    : getValueOfExpression(context, value, 'ArrayExpression');
}

/**
 * Best-effort extraction of the mixin identifiers out of the `mixins` array, so their source can
 * be pointed at as a secondary location. Only plain identifiers are considered; spreads, call
 * expressions and other dynamic shapes are skipped, and simply yield no secondary location for
 * that element (the primary issue is unaffected).
 */
function getMixinIdentifiers(mixinsArray: estree.ArrayExpression): estree.Identifier[] {
  return mixinsArray.elements.filter(
    (element): element is estree.Identifier => element?.type === 'Identifier',
  );
}

/**
 * Resolves a mixin identifier to where it comes from, so it can be highlighted as a secondary
 * location:
 * - imported from another module: the import specifier, naming the module (we cannot point into
 *   the other file, secondary locations are scoped to the current file).
 * - declared as a local object literal (optionally wrapped in a single-argument call such as
 *   `defineComponent({...})`): the object literal itself.
 * - anything else (ambiguous/unresolvable references): no secondary location.
 */
function resolveMixinSecondaryLocation(
  context: Rule.RuleContext,
  identifier: estree.Identifier,
): IssueLocation | undefined {
  const variable = getVariableFromName(context, identifier.name, identifier);
  const definition = variable?.defs[0];
  if (!definition) {
    return undefined;
  }

  if (definition.type === 'ImportBinding') {
    const source = definition.parent.source?.value;
    if (typeof source !== 'string') {
      return undefined;
    }
    return toSecondaryLocation(
      definition.node as unknown as estree.Node,
      `Mixin imported from '${source}'.`,
    );
  }

  if (definition.type === 'Variable') {
    const declarator = definition.node as estree.VariableDeclarator;
    const objectExpression = unwrapToObjectExpression(declarator.init);
    return toSecondaryLocation(objectExpression ?? declarator, messages.mixinDefinedHere);
  }

  return undefined;
}

/**
 * Unwraps a variable initializer down to the object literal it holds, following at most one
 * single-argument call (e.g. `defineComponent({...})`).
 */
function unwrapToObjectExpression(
  node: estree.Expression | null | undefined,
): estree.ObjectExpression | undefined {
  if (!node) {
    return undefined;
  }
  if (node.type === 'ObjectExpression') {
    return node;
  }
  if (
    node.type === 'CallExpression' &&
    node.arguments.length === 1 &&
    node.arguments[0].type === 'ObjectExpression'
  ) {
    return node.arguments[0];
  }
  return undefined;
}

/**
 * Returns true when the project's Vue dependency range cannot possibly resolve to a version
 * that has the Composition API.
 *
 * Mixins remain the only cross-component logic-reuse mechanism in Vue versions that predate the
 * Composition API, so the "use a composable instead" premise only holds once it is available.
 * Vue backported the Composition API and `<script setup>` into 2.7, not just 3.0, so that is the
 * real cutoff, not the Vue 3 major version. Ranges that could resolve to a version on either side
 * of that cutoff (e.g. ">=2.6.0", "^2.7.0 || ^3.0.0") are treated as "the Composition API is
 * possible", so the rule keeps reporting. Unknown/unparseable ranges (catalog:, workspace:, git:,
 * missing dependency, ...) also keep reporting.
 */
function lacksCompositionApi(context: Rule.RuleContext): boolean {
  const vueVersionRange = getVueVersion(context);
  if (!vueVersionRange || !validRange(vueVersionRange)) {
    return false;
  }
  return !intersects(vueVersionRange, VUE_WITH_COMPOSITION_API_RANGE);
}
