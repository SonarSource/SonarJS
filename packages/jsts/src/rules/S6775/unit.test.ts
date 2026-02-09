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
          name: 'FP fix: PropTypes spread from separate constant',
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
          name: 'FP fix: HelpTrigger pattern from Jira ticket',
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
          name: 'baseline: direct propTypes/defaultProps without spread',
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
        {
          name: 'baseline: external assignment without spread',
          code: `
import React from 'react';
import PropTypes from 'prop-types';

class ExternalComponent extends React.Component {
  render() {
    return <span>{this.props.name}</span>;
  }
}

ExternalComponent.propTypes = {
  name: PropTypes.string,
};

ExternalComponent.defaultProps = {
  name: 'default',
};
          `,
        },
        {
          name: 'baseline: class component without static propTypes in class body',
          code: `
import React from 'react';
import PropTypes from 'prop-types';

class NoStaticPropTypes extends React.Component {
  static defaultProps = {
    name: 'default',
  };

  render() {
    return <span>{this.props.name}</span>;
  }
}

NoStaticPropTypes.propTypes = {
  name: PropTypes.string,
};
          `,
        },
        {
          name: 'baseline: function component (no class body)',
          code: `
import React from 'react';
import PropTypes from 'prop-types';

function FunctionComponent(props) {
  return <span>{props.name}</span>;
}

FunctionComponent.propTypes = {
  name: PropTypes.string,
};

FunctionComponent.defaultProps = {
  name: 'default',
};
          `,
        },
        {
          name: 'FP fix: external assignment with spread - should not report',
          code: `
import React from 'react';
import PropTypes from 'prop-types';

const SharedProps = {
  shared: PropTypes.string,
};

class ComponentWithExternalAssignment extends React.Component {
  render() {
    return <span>{this.props.shared}</span>;
  }
}

ComponentWithExternalAssignment.propTypes = {
  ...SharedProps,
  bar: PropTypes.string,
};

ComponentWithExternalAssignment.defaultProps = {
  shared: 'valid',
  bar: 'valid',
};
          `,
        },
        {
          name: 'FP fix: external defaultProps with static propTypes in class',
          code: `
import React from 'react';
import PropTypes from 'prop-types';

const SharedPropTypes = {
  shared: PropTypes.string,
};

class MixedPatternComponent extends React.Component {
  static propTypes = {
    ...SharedPropTypes,
    local: PropTypes.string,
  };

  render() {
    return <span>{this.props.shared} {this.props.local}</span>;
  }
}

MixedPatternComponent.defaultProps = {
  shared: 'default-shared',
  local: 'default-local',
};
          `,
        },
        {
          name: 'FP fix: named export class with spread propTypes',
          code: `
import React from 'react';
import PropTypes from 'prop-types';

const ExportedPropTypes = {
  exported: PropTypes.string,
};

export class NamedExportComponent extends React.Component {
  static propTypes = {
    ...ExportedPropTypes,
  };

  static defaultProps = {
    exported: 'default-value',
  };

  render() {
    return <span>{this.props.exported}</span>;
  }
}
          `,
        },
        {
          name: 'FP fix: default export class with spread propTypes',
          code: `
import React from 'react';
import PropTypes from 'prop-types';

const DefaultExportPropTypes = {
  prop: PropTypes.string,
};

export default class DefaultExportComponent extends React.Component {
  static propTypes = {
    ...DefaultExportPropTypes,
  };

  static defaultProps = {
    prop: 'default-value',
  };

  render() {
    return <span>{this.props.prop}</span>;
  }
}
          `,
        },
        {
          name: 'FP fix: function declaration returning class with constant defaultProps',
          code: `
import React from 'react';
import PropTypes from 'prop-types';

const FactoryPropTypes = {
  factory: PropTypes.string,
};

const FactoryDefaultProps = {
  factory: 'default-factory',
};

function createComponent() {
  return class FactoryComponent extends React.Component {
    static propTypes = {
      ...FactoryPropTypes,
    };

    static defaultProps = FactoryDefaultProps;

    render() {
      return <div>{this.props.factory}</div>;
    }
  };
}
          `,
        },
      ],
      invalid: [
        {
          name: 'TP: defaultProp without corresponding propType',
          code: `
import React from 'react';
import PropTypes from 'prop-types';

class MissingPropType extends React.Component {
  static propTypes = {
    foo: PropTypes.string,
  };

  static defaultProps = {
    foo: 'default',
    bar: 'missing',
  };

  render() {
    return <span>{this.props.foo}</span>;
  }
}
          `,
          errors: 1,
        },
        {
          name: 'TP: required prop should not have default',
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
        {
          name: 'TP: multi-component - should still report when prop not in same component',
          code: `
import React from 'react';
import PropTypes from 'prop-types';

// ComponentA has 'foo' in its spread propTypes
const SharedPropTypesA = {
  foo: PropTypes.string,
};

class ComponentA extends React.Component {
  static propTypes = {
    ...SharedPropTypesA,
  };
  static defaultProps = {
    foo: 'default',
  };
  render() { return <div />; }
}

// ComponentB does NOT have 'foo' defined - should raise issue
class ComponentB extends React.Component {
  static propTypes = {
    bar: PropTypes.string,
  };
  static defaultProps = {
    foo: 'should-raise-issue',
  };
  render() { return <div />; }
}
          `,
          errors: 1,
        },
      ],
    });
  });
});
