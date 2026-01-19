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
import { rule } from '../index.js';
import { join } from 'node:path/posix';
import { NoTypeCheckingRuleTester } from '../../../../tests/tools/testers/rule-tester.js';
import { describe } from 'node:test';

describe('S6774 with React 18', () => {
  const dirname = join(import.meta.dirname, 'fixtures');
  process.chdir(dirname);
  const ruleTester = new NoTypeCheckingRuleTester();
  ruleTester.run('S6774 still reports forwardRef components in React 18 projects', rule, {
    valid: [],
    invalid: [
      {
        // forwardRef component - should still report in React 18 (propTypes not yet deprecated)
        code: `
          import React, { forwardRef } from 'react';
          const MyComponent = forwardRef((props, ref) => {
            return <div ref={ref}>{props.name}</div>;
          });
        `,
        filename: join(dirname, 'component.jsx'),
        errors: [{ messageId: 'missingPropType' }],
      },
      {
        // Regular component - should report
        code: `
          function MyComponent({ name }) {
            return <div>{name}</div>;
          }
        `,
        filename: join(dirname, 'component.jsx'),
        errors: [{ messageId: 'missingPropType' }],
      },
    ],
  });
});
