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
// https://sonarsource.github.io/rspec/#/rspec/S9145/javascript

import type { Rule } from 'eslint';
import type { TSESTree } from '@typescript-eslint/utils';
import type estree from 'estree';
import { isFunctionCall, isIdentifier } from '../helpers/ast.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { getFullyQualifiedName } from '../helpers/module.js';
import { lacksCompositionApi } from '../helpers/vue.js';
import * as meta from './generated-meta.js';

const messages = {
  deprecatedClassComponent:
    'Replace this deprecated Vue class-based component pattern with the Composition API.',
};

const VUE_CLASS_COMPONENT_MODULE = 'vue-class-component';
const VUE_FQN = 'vue-class-component.Vue';
const DECORATOR_FQNS = new Set([
  'vue-class-component.Component',
  'vue-class-component.Options',
  // vue-class-component v7 (the Vue 2.7-compatible release) only exports `Component`, and as a
  // default export: `import Component from 'vue-class-component'`. getFullyQualifiedName()
  // resolves a default import to the bare module name, not a `.Component`-suffixed FQN. `Vue`
  // itself is never re-exported by vue-class-component in any version (v7 imports it from `vue`
  // directly, v8 exposes it as a named export), so this bare FQN only ever means the decorator.
  VUE_CLASS_COMPONENT_MODULE,
]);
const PROPERTY_DECORATOR_FQNS = new Set(
  [
    'Prop',
    'PropSync',
    'Model',
    'ModelSync',
    'Watch',
    'Provide',
    'Inject',
    'ProvideReactive',
    'InjectReactive',
    'Emit',
    'Ref',
    'VModel',
  ].map(name => `vue-property-decorator.${name}`),
);

type ClassNode = TSESTree.ClassDeclaration | TSESTree.ClassExpression;

export const rule: Rule.RuleModule = {
  meta: generateMeta(meta, { messages }),
  create(context: Rule.RuleContext) {
    if (lacksCompositionApi(context)) {
      return {};
    }

    function checkClass(node: estree.Node) {
      const classNode = node as unknown as ClassNode;
      if (
        extendsVueClassComponent(context, classNode) ||
        hasVueClassComponentDecorator(context, classNode) ||
        hasVuePropertyDecoratorUsage(context, classNode)
      ) {
        context.report({
          node: getReportNode(classNode),
          messageId: 'deprecatedClassComponent',
        });
      }
    }

    return {
      ClassDeclaration: checkClass,
      ClassExpression: checkClass,
    };
  },
};

/**
 * Whether the class extends the `Vue` base class imported from `vue-class-component`.
 * Resolved by import origin, not by the local (possibly aliased) identifier name.
 */
function extendsVueClassComponent(context: Rule.RuleContext, classNode: ClassNode): boolean {
  const { superClass } = classNode;
  return (
    superClass?.type === 'Identifier' &&
    getFullyQualifiedName(context, superClass as unknown as estree.Node) === VUE_FQN
  );
}

/**
 * Whether the class carries a `@Component` or `@Options` decorator imported from
 * `vue-class-component` (named or, for v7's `Component`, default import), whether used bare
 * (`@Component`) or called (`@Options({...})`). Resolved by import origin so lookalikes from
 * other libraries (e.g. `vue-facing-decorator`) or locally-defined decorators of the same name
 * are not flagged.
 */
function hasVueClassComponentDecorator(context: Rule.RuleContext, classNode: ClassNode): boolean {
  return (classNode.decorators ?? []).some(decorator =>
    isDecoratorFromModule(context, decorator, DECORATOR_FQNS),
  );
}

/**
 * Whether the class or one of its members carries a `vue-property-decorator` decorator
 * (`@Prop`, `@Watch`, `@Emit`, ...). `vue-property-decorator` is deprecated and archived just
 * like `vue-class-component` (which it depends on), so its decorators are an equally strong,
 * import-resolved signal of a class-based Vue component, even without an explicit `extends Vue`
 * or `@Component`/`@Options` on the class itself.
 */
function hasVuePropertyDecoratorUsage(context: Rule.RuleContext, classNode: ClassNode): boolean {
  const classDecorators = classNode.decorators ?? [];
  const memberDecorators = classNode.body.body.flatMap(
    member => (member as { decorators?: TSESTree.Decorator[] }).decorators ?? [],
  );
  return [...classDecorators, ...memberDecorators].some(decorator =>
    isDecoratorFromModule(context, decorator, PROPERTY_DECORATOR_FQNS),
  );
}

/**
 * Whether `decorator`'s expression, bare (`@Foo`) or called (`@Foo({...})`), resolves by import
 * origin to one of `fqns`.
 */
function isDecoratorFromModule(
  context: Rule.RuleContext,
  decorator: TSESTree.Decorator,
  fqns: ReadonlySet<string>,
): boolean {
  const expression = decorator.expression as unknown as estree.Node;
  const target = isFunctionCall(expression) ? expression.callee : expression;
  return isIdentifier(target) && fqns.has(getFullyQualifiedName(context, target) ?? '');
}

function getReportNode(classNode: ClassNode): estree.Node {
  return (classNode.id ?? classNode) as unknown as estree.Node;
}
