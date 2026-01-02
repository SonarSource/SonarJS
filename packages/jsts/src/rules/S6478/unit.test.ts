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
import { RuleTester } from '../../../tests/tools/testers/rule-tester.js';
import { rule } from './index.js';
import { describe, it } from 'node:test';

describe('S6478', () => {
  it('should exclude react-intl formatting values from reports', () => {
    const ruleTester = new RuleTester();
    ruleTester.run('S6478', rule, {
      valid: [
        {
          // FormattedMessage with values - should not be flagged
          code: `
            function Parent() {
              return (
                <FormattedMessage
                  values={{
                    b: chunks => <b>{chunks}</b>,
                  }}
                />
              );
            }
          `,
        },
        {
          // intl.formatMessage with values - should not be flagged
          code: `
            function Parent() {
              const intl = useIntl();
              return intl.formatMessage(
                { id: 'test' },
                {
                  b: chunks => <b>{chunks}</b>,
                }
              );
            }
          `,
        },
        {
          // FormattedMessage with function expression - should not be flagged
          code: `
            function Parent() {
              return (
                <FormattedMessage
                  values={{
                    b: function(chunks) { return <b>{chunks}</b>; },
                  }}
                />
              );
            }
          `,
        },
      ],
      invalid: [
        {
          // Nested function component - should be flagged
          code: `
            function Parent() {
              function Child() {
                return <div />;
              }
              return <Child />;
            }
          `,
          errors: 1,
        },
        {
          // Non-react-intl component with values - should be flagged
          code: `
            function Parent() {
              return (
                <OtherComponent
                  values={{
                    Item: () => <div />,
                  }}
                />
              );
            }
          `,
          errors: 1,
        },
        {
          // Object not in JSX or formatMessage context - should be flagged
          code: `
            function Parent() {
              const obj = {
                Render: () => <div />,
              };
              return <Something render={obj.Render} />;
            }
          `,
          errors: 1,
        },
      ],
    });
  });
});
