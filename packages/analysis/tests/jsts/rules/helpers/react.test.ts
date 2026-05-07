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
import { DefaultParserRuleTester, RuleTester } from '../../tools/testers/rule-tester.js';
import { isRequiredParserServices } from '../../../../src/jsts/rules/helpers/parser-services.js';
import {
  getComponentPropsType,
  isReactComponentSuperclass,
} from '../../../../src/jsts/rules/helpers/react.js';

const rule: Rule.RuleModule = {
  meta: {
    messages: {
      notReactSuperclass: 'Superclass is not a React component base class',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      ClassDeclaration(node) {
        if (node.superClass && !isReactComponentSuperclass(context, node.superClass)) {
          context.report({
            node: node.superClass,
            messageId: 'notReactSuperclass',
          });
        }
      },
    };
  },
};

const ruleTester = new DefaultParserRuleTester();
const typeCheckingRuleTester = new RuleTester();

ruleTester.run('isReactComponentSuperclass', rule, {
  valid: [
    {
      code: `
import { Component as BaseComponent } from 'react';

class Button extends BaseComponent {}
`,
    },
    {
      code: `
import * as UI from 'react';

class Button extends UI.Component {}
`,
    },
    {
      code: `
class Button extends React.Component {}
`,
    },
  ],
  invalid: [
    {
      code: `
class CustomBase {}

class Button extends CustomBase {}
`,
      errors: 1,
    },
  ],
});

const propsTypeRule: Rule.RuleModule = {
  meta: {
    messages: {
      unresolvedComponentPropsType:
        'Component props type could not be resolved or did not match the component name',
    },
  },
  create(context: Rule.RuleContext) {
    const services = context.sourceCode.parserServices;
    if (!isRequiredParserServices(services)) {
      return {};
    }

    const checker = services.program.getTypeChecker();
    type ComponentDeclarationNode =
      | Parameters<NonNullable<Rule.RuleListener['FunctionDeclaration']>>[0]
      | Parameters<NonNullable<Rule.RuleListener['ClassDeclaration']>>[0];

    const validateComponentPropsType = (node: ComponentDeclarationNode) => {
      if (!node.id) {
        return;
      }

      const propsType = getComponentPropsType(node, services);
      if (checker.typeToString(propsType ?? checker.getNeverType()) !== `${node.id.name}Props`) {
        context.report({
          node,
          messageId: 'unresolvedComponentPropsType',
        });
      }
    };

    return {
      FunctionDeclaration: validateComponentPropsType,
      ClassDeclaration: validateComponentPropsType,
    };
  },
};

typeCheckingRuleTester.run('getComponentPropsType', propsTypeRule, {
  valid: [
    {
      code: `
declare const React: any;
interface ButtonProps {
  label: string;
}
function Button(props: ButtonProps) {
  return <div>{props.label}</div>;
}
`,
    },
    {
      code: `
declare const React: any;
interface ButtonProps {
  label: string;
}
class Button extends React.Component<ButtonProps> {
  render() {
    return <div>{this.props.label}</div>;
  }
}
`,
    },
    {
      code: `
declare const React: any;
interface ButtonProps {
  label: string;
}
class Button extends React.Component {
  props: ButtonProps;

  render() {
    return <div>{this.props.label}</div>;
  }
}
`,
    },
  ],
  invalid: [
    {
      code: `
declare const React: any;
class Button extends React.Component {
  render() {
    return <div />;
  }
}
`,
      errors: 1,
    },
  ],
});
