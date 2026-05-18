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
// https://sonarsource.github.io/rspec/#/rspec/S6767/javascript

import type { TSESTree } from '@typescript-eslint/utils';
import type { Rule } from 'eslint';
import type estree from 'estree';
// eslint-disable-next-line import/no-internal-modules
import ReactComponents from 'eslint-plugin-react/lib/util/Components.js';
import { generateMeta } from '../helpers/generate-meta.js';
import { findComponentNodes } from '../helpers/react.js';
import { hasOwnCustomSuperclassPropsForwarding } from './custom-superclass-forwarding.js';
import { hasDecoratorPropUsage } from './decorator-indirect-prop-usage.js';
import { hasForwardRefCallbackPropUsage } from './forward-ref-indirect-prop-usage.js';
import * as meta from './generated-meta.js';
import { isUsedAsReactComponentNonPropsType } from './react-non-props-usage.js';
import { hasSupportedWholePropsUsage } from './whole-props-usage.js';

type RuleConfiguration = {
  ignore: string[];
  skipShapeProps: boolean;
};
type UsedPropType = {
  allNames?: string[];
  name: string;
};
type ReportedPropNode = TSESTree.Node & {
  key?: estree.Node;
  typeAnnotation?: TSESTree.TSTypeAnnotation;
};
type ReportedProp = {
  children?: ReportedProps;
  fullName?: string;
  name: string;
  node?: ReportedPropNode;
  type?: string;
};
type ReportedProps = Record<string, ReportedProp | true> | true;
type ReactComponent = {
  declaredPropTypes?: ReportedProps;
  ignoreUnusedPropTypesValidation?: boolean;
  node: estree.Node;
  usedPropTypes?: UsedPropType[];
};
type ReactComponentsRegistry = {
  list(): Record<string, ReactComponent>;
};

const Components = ReactComponents as unknown as {
  detect(
    rule: (context: Rule.RuleContext, components: ReactComponentsRegistry) => Rule.RuleListener,
  ): (context: Rule.RuleContext) => Rule.RuleListener;
};

function allMatch(
  componentNodes: estree.Node[],
  predicate: (componentNode: estree.Node) => boolean,
): boolean {
  return componentNodes.length > 0 && componentNodes.every(predicate);
}

function mustBeValidated(component: ReactComponent): boolean {
  return !component.ignoreUnusedPropTypesValidation;
}

function getConfiguration(context: Rule.RuleContext): RuleConfiguration {
  return {
    ignore: [],
    skipShapeProps: true,
    ...(context.options[0] as Partial<RuleConfiguration> | undefined),
  };
}

function isIgnored(name: string, configuration: RuleConfiguration): boolean {
  return configuration.ignore.includes(name);
}

function isPropUsed(component: ReactComponent, prop: ReportedProp): boolean {
  const usedPropTypes = component.usedPropTypes ?? [];
  return usedPropTypes.some(
    usedProp =>
      prop.type === 'shape' ||
      prop.type === 'exact' ||
      prop.name === '__ANY_KEY__' ||
      usedProp.name === prop.name,
  );
}

function shouldSuppressUnusedPropType(
  componentNode: estree.Node,
  node: estree.Node,
  context: Rule.RuleContext,
  propName: string,
): boolean {
  if (isUsedAsReactComponentNonPropsType(node, componentNode, context)) {
    return true;
  }

  const componentNodes = findComponentNodes(node, context);

  if (allMatch(componentNodes, other => hasSupportedWholePropsUsage(other, context))) {
    return true;
  }

  if (allMatch(componentNodes, other => hasOwnCustomSuperclassPropsForwarding(other))) {
    return true;
  }

  if (
    allMatch(componentNodes, other =>
      hasForwardRefCallbackPropUsage(other, context, propName),
    )
  ) {
    return true;
  }

  return allMatch(componentNodes, other => hasDecoratorPropUsage(other, context, propName));
}

function reportUnusedPropType(
  context: Rule.RuleContext,
  component: ReactComponent,
  props: ReportedProps,
  configuration: RuleConfiguration,
): void {
  if (props === true) {
    return;
  }

  Object.values(props ?? {}).forEach(prop => {
    if (prop === true) {
      return;
    }

    if ((prop.type === 'shape' || prop.type === 'exact') && configuration.skipShapeProps) {
      return;
    }

    if (
      prop.node?.typeAnnotation?.typeAnnotation.type === 'TSNeverKeyword' ||
      !prop.node ||
      isPropUsed(component, prop)
    ) {
      if (prop.children) {
        reportUnusedPropType(context, component, prop.children, configuration);
      }
      return;
    }

    const propName = prop.fullName ?? prop.name;
    if (isIgnored(propName, configuration)) {
      if (prop.children) {
        reportUnusedPropType(context, component, prop.children, configuration);
      }
      return;
    }

    const reportNode = (prop.node.key ?? prop.node) as unknown as estree.Node;
    if (!shouldSuppressUnusedPropType(component.node, reportNode, context, propName)) {
      context.report({
        messageId: 'unusedPropType',
        node: reportNode,
        data: { name: propName },
      });
    }

    if (prop.children) {
      reportUnusedPropType(context, component, prop.children, configuration);
    }
  });
}

export function decorate(rule: Rule.RuleModule): Rule.RuleModule {
  return {
    meta: generateMeta(meta, rule.meta),
    create: Components.detect((context, components) => {
      const configuration = getConfiguration(context);

      return {
        'Program:exit'() {
          Object.values(components.list())
            .filter(component => mustBeValidated(component))
            .forEach(component => {
              reportUnusedPropType(
                context,
                component,
                component.declaredPropTypes ?? true,
                configuration,
              );
            });
        },
      };
    }),
  };
}
