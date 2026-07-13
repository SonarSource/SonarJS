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
import { rule } from './index.js';
import { decorate } from './decorator.js';
import { DefaultParserRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const ruleTester = new DefaultParserRuleTester();

describe('S8990', () => {
  it('decorates a rule without metadata', () => {
    const decoratedRule = decorate({ create: () => ({}) });

    assert.equal(
      decoratedRule.meta?.messages?.noPromiseInFireEvent,
      "Pass a DOM element to 'fireEvent', not this promise.",
    );
  });

  it('S8990 (decorated: testing-library/no-promise-in-fire-event)', () => {
    ruleTester.run('Promises should not be passed to "fireEvent"', rule, {
      valid: [
        {
          // synchronous getBy* query returns a DOM element, not a promise
          code: `
              import { fireEvent, screen } from '@testing-library/react';
              fireEvent.click(screen.getByRole('button'));
            `,
        },
        {
          // awaited findBy* query resolves to a DOM element before fireEvent runs
          code: `
              import { fireEvent, screen } from '@testing-library/react';
              fireEvent.click(await screen.findByRole('button'));
            `,
        },
        {
          // variable holds an already-awaited query result
          code: `
              import { fireEvent, screen } from '@testing-library/react';
              const button = await screen.findByRole('button');
              fireEvent.click(button);
            `,
        },
        {
          // a same-named local helper is not Testing Library's "fireEvent"
          code: `
              import { fireEvent } from './my-local-fire-event';
              fireEvent.click(somethingAsync());
            `,
        },
      ],
      invalid: [
        {
          // async findBy* query passed directly
          code: `
              import { fireEvent, screen } from '@testing-library/react';
              fireEvent.click(screen.findByRole('button'));
            `,
          // assert the message text to lock in the Sonar override (RuleTester forbids
          // pairing `message` with `messageId`; the other cases cover the messageId)
          errors: [{ message: "Pass a DOM element to 'fireEvent', not this promise." }],
        },
        {
          // async findAllBy* query passed directly
          code: `
              import { fireEvent, screen } from '@testing-library/react';
              fireEvent.click(screen.findAllByRole('button'));
            `,
          errors: [{ messageId: 'noPromiseInFireEvent' }],
        },
        {
          // variable that still holds the unawaited async query
          code: `
              import { fireEvent, screen } from '@testing-library/react';
              const button = screen.findByRole('button');
              fireEvent.click(button);
            `,
          errors: [{ messageId: 'noPromiseInFireEvent' }],
        },
        {
          // a promise built with new Promise(...)
          code: `
              import { fireEvent } from '@testing-library/react';
              fireEvent.click(new Promise(resolve => resolve(el)));
            `,
          errors: [{ messageId: 'noPromiseInFireEvent' }],
        },
        {
          // aliased import must still be resolved by import, not by the local binding name
          code: `
              import { fireEvent as tlFireEvent, screen } from '@testing-library/react';
              tlFireEvent.click(screen.findByRole('button'));
            `,
          errors: [{ messageId: 'noPromiseInFireEvent' }],
        },
      ],
    });
  });
});
