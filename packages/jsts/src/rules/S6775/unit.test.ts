/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { NoTypeCheckingRuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

const ruleTester = new NoTypeCheckingRuleTester();

describe('S6775', () => {
  it('S6775', () => {
    ruleTester.run('default-props-match-prop-types', rule, {
      valid: [
        {
          // FP scenario: PropTypes spread from separate constant
          // The analyzer cannot "unpack" the spread operator (...) to see that
          // 'foo' is defined in SharedPropTypes. This should NOT raise an issue.
          code: `
import React from 'react';
import PropTypes from 'prop-types';

const SharedPropTypes = {
  foo: PropTypes.string,
};

class MyComponent extends React.Component {
  static propTypes = {
    ...SharedPropTypes,
    bar: PropTypes.string,
  };

  static defaultProps = {
    foo: 'default-foo',
    bar: 'default-bar',
  };

  render() {
    return <span>{this.props.foo}</span>;
  }
}
          `,
        },
        {
          // FP scenario: PropTypes and defaultProps both defined as separate constants
          // Pattern from HelpTrigger.jsx in the redash project (Peachy FPs)
          code: `
import React from 'react';
import PropTypes from 'prop-types';

const HelpTriggerPropTypes = {
  type: PropTypes.string,
  href: PropTypes.string,
  title: PropTypes.node,
  className: PropTypes.string,
  showTooltip: PropTypes.bool,
};

const HelpTriggerDefaultProps = {
  type: null,
  href: null,
  title: null,
  className: null,
  showTooltip: true,
};

export function helpTriggerWithTypes(types) {
  return class HelpTrigger extends React.Component {
    static propTypes = {
      ...HelpTriggerPropTypes,
      type: PropTypes.oneOf(Object.keys(types)),
    };

    static defaultProps = HelpTriggerDefaultProps;

    render() {
      return <div>{this.props.title}</div>;
    }
  };
}
          `,
        },
        {
          // Direct propTypes/defaultProps without spread (baseline compliant case)
          code: `
import React from 'react';
import PropTypes from 'prop-types';

class DirectComponent extends React.Component {
  static propTypes = {
    name: PropTypes.string,
  };

  static defaultProps = {
    name: 'default',
  };

  render() {
    return <span>{this.props.name}</span>;
  }
}
          `,
        },
      ],
      invalid: [
        {
          // True positive: defaultProp without corresponding propType
          code: `
import React from 'react';
import PropTypes from 'prop-types';

class MissingPropType extends React.Component {
  static propTypes = {
    foo: PropTypes.string,
  };

  static defaultProps = {
    foo: 'default',
    bar: 'missing', // bar is not in propTypes
  };

  render() {
    return <span>{this.props.foo}</span>;
  }
}
          `,
          errors: 1,
        },
        {
          // True positive: required prop should not have default
          code: `
import React from 'react';
import PropTypes from 'prop-types';

class RequiredWithDefault extends React.Component {
  static propTypes = {
    required: PropTypes.string.isRequired,
  };

  static defaultProps = {
    required: 'default',
  };

  render() {
    return <span>{this.props.required}</span>;
  }
}
          `,
          errors: 1,
        },
      ],
    });
  });
});
