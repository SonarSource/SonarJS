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
import { describe, it } from 'node:test';
import { rule } from './index.js';
import { rules } from '../external/a11y.js';
import { NoTypeCheckingRuleTester } from '../../../../tests/jsts/tools/testers/rule-tester.js';

const upstreamRule = rules['no-noninteractive-tabindex'];

const programmaticFocusTargets = [
  `function DialogTitle({ closed }) {
    const titleRef = useRef(null);
    useEffect(() => {
      if (!closed) titleRef.current?.focus();
    }, [closed]);
    return <div role="dialog" aria-modal="true" aria-labelledby="title" hidden={closed}>
      <h2 id="title" ref={titleRef} tabIndex={closed ? null : -1}>Dialog title</h2>
      <button>Close</button>
    </div>;
  }`,
  `function DialogText({ closed }) {
    const textRef = useRef(null);
    useEffect(() => {
      if (!closed) textRef.current?.focus();
    }, [closed]);
    return <div role="dialog" aria-modal="true" aria-label="Information" hidden={closed}>
      <p ref={textRef} tabIndex={closed ? null : -1}>Dialog information</p>
      <button>Close</button>
    </div>;
  }`,
  `function ErrorSummary({ noErrors }) {
    const summaryRef = useRef(null);
    useEffect(() => {
      if (!noErrors) summaryRef.current?.focus();
    }, [noErrors]);
    return <div ref={summaryRef} tabIndex={noErrors ? null : -1}>
      Please correct these errors.
    </div>;
  }`,
].map(code => `import { useEffect, useRef } from 'react';\n${code}`);

// Sentinel: verify that the upstream ESLint rule still raises on the patterns our decorator fixes.
// If this test starts failing (i.e., the upstream rule no longer reports these patterns),
// it signals that the decorator can be safely removed.
describe('S6845 upstream sentinel', () => {
  it('upstream no-noninteractive-tabindex raises when a conditional only yields null or negative tab indexes', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-noninteractive-tabindex', upstreamRule, {
      valid: [{ code: `<div tabIndex={disabled ? undefined : -1} />` }],
      invalid: [
        ...programmaticFocusTargets.map(code => ({ code, errors: 1 })),
        {
          code: `<div tabIndex={disabled ? null : -1} />`,
          errors: 1,
        },
      ],
    });
  });
});

describe('S6845', () => {
  it('accepts W3C dialog focus targets and the MDN error summary outside the Tab order', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-noninteractive-tabindex', rule, {
      valid: programmaticFocusTargets.map(code => ({ code })),
      invalid: [
        {
          code: `<h2 tabIndex={closed ? null : 0}>Dialog title</h2>`,
          errors: 1,
        },
        {
          code: `<p tabIndex={closed ? null : tabIndex}>Dialog information</p>`,
          errors: 1,
        },
        {
          code: `<div tabIndex={noErrors ? null : 1}>Please correct these errors.</div>`,
          errors: 1,
        },
      ],
    });
  });

  it('should not flag conditionals whose every branch keeps a noninteractive element out of the tab order', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-noninteractive-tabindex', rule, {
      valid: [
        { code: `<div tabIndex={disabled ? null : -1} />` },
        { code: `<div tabIndex={disabled ? -1 : null} />` },
        { code: `<div tabIndex={disabled ? null : null} />` },
        { code: `<div tabIndex={disabled ? -1 : -2} />` },
        { code: `<div tabIndex={disabled ? undefined : -1} />` },
        { code: `<div tabIndex={disabled ? null : nested ? -1 : -2} />` },
        { code: `<div tabIndex={disabled ? nested ? -1 : -2 : null} />` },
        { code: `<div id="title" tabIndex={disabled ? null : -1} />` },
        { code: `<div tabIndex={disabled ? null : -1} id="title" />` },
      ],
      invalid: [
        {
          code: `const props = { tabindex: 0 }; <div {...props} tabIndex={disabled ? null : -1} />`,
          errors: 1,
        },
        {
          code: `<div {...props} tabIndex={disabled ? null : -1} />`,
          errors: 1,
        },
        {
          code: `<div tabIndex={disabled ? 0 : null} />`,
          errors: 1,
        },
        {
          code: `<div tabIndex={disabled ? nested ? 0 : -1 : null} />`,
          errors: 1,
        },
        {
          code: `<div tabIndex={disabled ? null : -1} tabIndex={0} />`,
          errors: 1,
        },
        {
          code: `<div tabIndex={disabled ? null : -1} tabindex={0} />`,
          errors: 1,
        },
        {
          code: `<div tabIndex={disabled ? null : -1} {...{ tabIndex: 0 }} />`,
          errors: 1,
        },
        {
          code: `<div tabIndex={disabled ? null : -1} {...props} />`,
          errors: 1,
        },
        {
          code: `<div tabIndex={disabled ? null : nested ? -1 : 0} />`,
          errors: 1,
        },
        {
          code: `<div tabIndex={disabled ? null : nested ? -1 : tabIndex} />`,
          errors: 1,
        },
        {
          code: `<div tabIndex={disabled ? null : -0} />`,
          errors: 1,
        },
        {
          code: `<div tabIndex={disabled ? null : -1.5} />`,
          errors: 1,
        },
        {
          code: `<div tabIndex={disabled ? null : 0} />`,
          errors: 1,
        },
        {
          code: `<div tabIndex={disabled ? null : tabIndex} />`,
          errors: 1,
        },
        {
          code: `<div tabIndex={0} />`,
          errors: 1,
        },
      ],
    });
  });

  it('retains reports for unsupported values and unproven attribute combinations', () => {
    const ruleTester = new NoTypeCheckingRuleTester();

    ruleTester.run('no-noninteractive-tabindex', rule, {
      valid: [],
      invalid: [
        `<div tabIndex={disabled ? null : +1} />`,
        `<div tabindex={disabled ? null : -1} />`,
        `<div tabIndex={disabled ? null : '-1'} />`,
        `<div tabIndex={disabled ? null : false} />`,
        `<div tabIndex={disabled ? null : -tabIndex} />`,
        `<div {...{ id: 'title' }} tabIndex={disabled ? null : -1} />`,
        `<div tabIndex={disabled ? null : -1} {...{ id: 'title' }} />`,
        `<div tabIndex={disabled ? null : -1} tabIndex={-1} />`,
      ].map(code => ({ code, errors: 1 })),
    });
  });
});
