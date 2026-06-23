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
import { rule } from '../index.js';
import { join } from 'node:path/posix';
import { NoTypeCheckingRuleTester } from '../../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe } from 'node:test';

describe('S6774 with unknown React version', () => {
  const dirname = join(import.meta.dirname, 'fixtures');
  process.chdir(dirname);
  const ruleTester = new NoTypeCheckingRuleTester();
  ruleTester.run(
    'S6774 reports missing propTypes when the React version cannot be determined',
    rule,
    {
      valid: [
        {
          code: `
          import PropTypes from 'prop-types';
          function MyComponent({ name }) {
            return <div>{name}</div>;
          }
          MyComponent.propTypes = { name: PropTypes.string.isRequired };
        `,
          filename: join(dirname, 'component.jsx'),
        },
      ],
      invalid: [
        {
          code: `
          function MyComponent({ name }) {
            return <div>{name}</div>;
          }
        `,
          filename: join(dirname, 'component.jsx'),
          errors: [{ messageId: 'missingPropType' }],
        },
      ],
    },
  );
});
