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
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { fields } from './config.js';
import { rule } from './index.js';

describe('S6478', () => {
  it('should expose allowAsProps as a Sonar configuration field', () => {
    assert.ok(Array.isArray(fields));
    assert.ok(
      fields.some(
        field =>
          Array.isArray(field) &&
          field.some(
            option =>
              option.field === 'allowAsProps' &&
              option.default === false &&
              typeof option.description === 'string',
          ),
      ),
    );
  });

  it('should keep prop-based inline components noncompliant by default', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('S6478', rule, {
      valid: [
        {
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
          code: `
            function Parent() {
              const intl = useIntl();
              return (
                <p>
                  {intl.formatMessage(
                    { id: 'test' },
                    { b: chunks => <b>{chunks}</b> }
                  )}
                </p>
              );
            }
          `,
        },
      ],
      invalid: [
        {
          code: `
            function Parent() {
              return (
                <ReactMarkdown
                  components={{
                    a: ({ href, children }) => <a href={href}>{children}</a>,
                  }}
                />
              );
            }
          `,
          errors: 1,
        },
        {
          code: `
            function Parent() {
              return (
                <Select
                  formatOptionLabel={user => (
                    <div>
                      <span>{user.name}</span>
                    </div>
                  )}
                />
              );
            }
          `,
          errors: 1,
        },
        {
          code: `
            function Parent() {
              return (
                <Stack.Screen
                  options={{
                    headerLeft: () => <BackButton />,
                  }}
                />
              );
            }
          `,
          errors: 1,
        },
        {
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
      ],
    });
  });

  it('should suppress prop-based inline components when allowAsProps is enabled', () => {
    const ruleTester = new DefaultParserRuleTester();

    ruleTester.run('S6478', rule, {
      valid: [
        {
          options: [{ allowAsProps: true }],
          code: `
            function Parent() {
              return (
                <ReactMarkdown
                  components={{
                    a: ({ href, children }) => <a href={href}>{children}</a>,
                    code: ({ children }) => <code>{children}</code>,
                  }}
                />
              );
            }
          `,
        },
        {
          options: [{ allowAsProps: true }],
          code: `
            function Parent() {
              return (
                <Select
                  formatOptionLabel={user => (
                    <div>
                      <span>{user.name}</span>
                    </div>
                  )}
                />
              );
            }
          `,
        },
        {
          options: [{ allowAsProps: true }],
          code: `
            function Parent() {
              return (
                <Stack.Screen
                  options={{
                    headerLeft: () => <BackButton />,
                    headerRight: () => <SettingsIcon />,
                  }}
                />
              );
            }
          `,
        },
        {
          options: [{ allowAsProps: true }],
          code: `
            function Parent() {
              return (
                <DatePicker
                  overrides={{
                    PrevButton: ({ children, ...rest }) => (
                      <button {...rest}>{children}</button>
                    ),
                  }}
                />
              );
            }
          `,
        },
        {
          options: [{ allowAsProps: true }],
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
        },
      ],
      invalid: [
        {
          options: [{ allowAsProps: true }],
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
      ],
    });
  });
});
