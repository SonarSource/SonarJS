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
import {
  DefaultParserRuleTester,
  NoTypeCheckingRuleTester,
} from '../../../../tests/jsts/tools/testers/rule-tester.js';
import { defaultOptions } from '../helpers/configs.js';
import { rules } from '../external/a11y.js';
import { fields } from './config.js';
import { rule } from './index.js';

const options = defaultOptions(fields);
const message = '`tabIndex` should only be declared on interactive elements.';
const valid = [
  '<div role="separator" aria-valuenow="25" tabIndex={0} />',
  '<div role="Separator" aria-valuenow={position} tabIndex={0} />',
  '<div role="unknown SEPARATOR" aria-valuenow={position} tabIndex={0} />',
  '<div role="separator" aria-valuenow={0} tabIndex={0} />',
  '<div role="separator" aria-valuenow={100} tabIndex={0} />',
  '<div role="separator" aria-valuenow={position} tabIndex={0} />',
  '<div role="separator" aria-valuenow={Math.round(position)} tabIndex={0} />',
  '<div role="separator" aria-valuenow={layout.position} tabIndex={0} />',
  '<div role="separator" aria-valuenow={position ?? 50} tabIndex={0} />',
  '<div role="separator" aria-valuenow={enabled ? position : 50} tabIndex={0} />',
  '<div role="separator" aria-valuenow={-~position} tabIndex={0} />',
  '<div role="separator" aria-valuenow={-50} aria-valuemin={-100} aria-valuemax={100} tabIndex={0} />',
  '<div role="separator" aria-valuenow={position} aria-valuemin={minimum} aria-valuemax={maximum} tabIndex={0} />',
  '<div role="separator" aria-valuenow="12.5" aria-valuemin="0" tabIndex="0" />',
  '<div role="separator" aria-valuenow={position} aria-valuemax={200} tabIndex={0} />',
  '<div role={"separator"} aria-valuenow={+50} tabIndex={0} onKeyDown={resize} />',
  '<div role="separator" aria-valuenow={50} tabIndex={1} />',
  '<div role="separator" aria-valuenow={50} tabIndex={-1} />',
  '<div role="separator" aria-valuenow={50} />',
  '<div role="separator" aria-valuenow={50} tabIndex={0} aria-orientation="vertical" />',
  'const position = 25; <div role="separator" aria-valuenow={position} tabIndex={0} />',
  'const layout = { position: 50, min: 0 }; const { position } = layout; <div role="separator" aria-valuenow={position} tabIndex={0} />',
  'const [position] = [50]; <div role="separator" aria-valuenow={position} tabIndex={0} />',
  'const { position } = readLayout(); const current = position; <div role="separator" aria-valuenow={current} tabIndex={0} />',
  '<div role="widget separator" aria-valuenow={50} tabIndex={0} />',
  '<div role="  separator  " aria-valuenow={50} tabIndex={0} />',
  '<div role="unknown separator" aria-valuenow={50} tabIndex={0} />',
  '<div role="separator presentation" aria-valuenow={50} tabIndex={0} />',
  '<div {...props} role="separator" aria-valuenow={position} tabIndex={0} />',
  '<div role="separator" aria-valuenow={position} {...{ onKeyDown: resize }} tabIndex={0} />',
  '<div role="separator" {...{ onKeyDown: resize }} aria-valuenow={position} tabIndex={0} />',
  'const handlers = { onKeyDown: resize }; <div role="separator" aria-valuenow={position} {...handlers} tabIndex={0} />',
  'const handlers = { onKeyDown: resize }; const props = { ...handlers, "aria-label": label }; <div role="separator" aria-valuenow={position} {...props} tabIndex={0} />',
  '<div role="separator" aria-valuenow={position} {...{ ["on" + "KeyDown"]: resize }} tabIndex={0} />',
  '<div role="presentation" role="separator" aria-valuenow={50} tabIndex={0} />',
  '<div role="separator" aria-valuenow={null} aria-valuenow={50} tabIndex={0} />',
  '<div role="tabpanel" tabIndex={0} />',
  '<div role="button" tabIndex={0} />',
  '<div role="progressbar" aria-valuenow={50} tabIndex={0} />',
  '<button tabIndex={0} />',
  '<input tabIndex={0} />',
  '<a href="/help" tabIndex={0}>Help</a>',
  '<div tabIndex={-1} />',
  ...['"-2.5"', '"+50"', '".5"', '"5e1"', '{`50`}', '{`${position}`}'].map(
    value => `<div role="separator" aria-valuenow=${value} tabIndex={0} />`,
  ),
];
const invalid = [
  '<div role="separator" tabIndex={0} />',
  '<div role="separator" aria-valuemin={0} aria-valuemax={100} tabIndex={0} />',
  '<div role="separator" tabIndex={0} onKeyDown={resize} />',
  '<div role="separator" tabIndex={0} onClick={resize} />',
  '<div aria-valuenow={50} tabIndex={0} />',
  '<div role="presentation" aria-valuenow={50} tabIndex={0} />',
  '<div role="status" aria-valuenow={50} tabIndex={0} />',
  '<div role="region" aria-valuenow={50} tabIndex={0} />',
  '<div role="" aria-valuenow={50} tabIndex={0} />',
  '<div role="separator" aria-valuenow="NaN" tabIndex={0} />',
  'const position = null; <div role="separator" aria-valuenow={position} tabIndex={0} />',
  'const position = undefined; <div role="separator" aria-valuenow={position} tabIndex={0} />',
  'const position = "half"; <div role="separator" aria-valuenow={position} tabIndex={0} />',
  'const current = { position }; <div role="separator" aria-valuenow={current} tabIndex={0} />',
  'const current = [position]; <div role="separator" aria-valuenow={current} tabIndex={0} />',
  '<div role="presentation separator" aria-valuenow={50} tabIndex={0} />',
  '<div role="separator" role="presentation" aria-valuenow={50} tabIndex={0} />',
  '<div role="separator" aria-valuenow={50} aria-valuenow={null} tabIndex={0} />',
  '<div role="separator" aria-valuenow={50} {...props} tabIndex={0} />',
  '<div role="separator" {...props} aria-valuenow={50} tabIndex={0} />',
  '<div role="separator" aria-valuenow={50} {...{ role: "presentation" }} tabIndex={0} />',
  '<div role="separator" aria-valuenow={50} {...{ "aria-valuenow": null }} tabIndex={0} />',
  '<div role="separator" aria-valuenow={50} {...{ [attributeName]: value }} tabIndex={0} />',
  '<div role="separator" aria-valuenow={50} {...{ ...props, onKeyDown: resize }} tabIndex={0} />',
  'const props = { ...props }; <div role="separator" aria-valuenow={50} {...props} tabIndex={0} />',
  'const props = { onKeyDown: resize }; props.role = "presentation"; <div role="separator" aria-valuenow={50} {...props} tabIndex={0} />',
  'const props = { onKeyDown: resize }; configure(props); <div role="separator" aria-valuenow={50} {...props} tabIndex={0} />',
  'const { extra } = { extra: { role: "presentation" } }; <div role="separator" aria-valuenow={50} {...extra} tabIndex={0} />',
  'const [extra] = [{ "aria-valuenow": null }]; <div role="separator" aria-valuenow={50} {...extra} tabIndex={0} />',
  '<div {...props} role="separator" tabIndex={0} />',
  '<span role="separator" aria-valuenow={50} tabIndex={0} />',
  '<hr aria-valuenow={50} tabIndex={0} />',
  '<div role="separator" aria-valuenow tabIndex={0} />',
  ...[
    '{null}',
    '{undefined}',
    '{void 0}',
    '{NaN}',
    '{Infinity}',
    '{-Infinity}',
    '{true}',
    '{false}',
    '{1n}',
    '{1 / 0}',
    '{0 / 0}',
    '{[]}',
    '{{}}',
    '{{ position }}',
    '{[position]}',
    '{() => position}',
    '{function () { return position; }}',
    '{class { value() { return position; } }}',
    '{new Number(position)}',
    '{<Position value={position} />}',
    '{<>{position}</>}',
    '{!position}',
    '{typeof position}',
    '{void position}',
    '{delete state.position}',
    '{position < 50}',
    '{position === 50}',
    '{position in layout}',
    '""',
    '" "',
    '"half"',
    '"50px"',
    '"0x32"',
    '"Infinity"',
    '"1e999"',
    '{""}',
    '{`invalid`}',
    '{``}',
  ].map(value => `<div role="separator" aria-valuenow=${value} tabIndex={0} />`),
];

describe('S6845', () => {
  for (const [language, Tester] of [
    ['JavaScript JSX', DefaultParserRuleTester],
    ['TypeScript TSX', NoTypeCheckingRuleTester],
  ] as const) {
    it(`allows separator current values in ${language}`, () => {
      new Tester().run('no-noninteractive-tabindex', rule, {
        valid: valid.map(code => ({ code, options })),
        invalid: [],
      });
    });
    for (const code of invalid) {
      it(`reports ${code} in ${language}`, () => {
        new Tester().run('no-noninteractive-tabindex', rule, {
          valid: [],
          invalid: [{ code, options, errors: [{ message, type: 'JSXAttribute' }] }],
        });
      });
    }
  }

  it('handles TypeScript assertions around current values and literal roles', () => {
    new NoTypeCheckingRuleTester().run('no-noninteractive-tabindex', rule, {
      valid: [
        '<div role="separator" aria-valuenow={position as number} tabIndex={0} />',
        '<div role="separator" aria-valuenow={position!} tabIndex={0} />',
        '<div role="separator" aria-valuenow={position satisfies number} tabIndex={0} />',
        '<div role={"separator" as const} aria-valuenow={50} tabIndex={0} />',
      ].map(code => ({ code, options })),
      invalid: [
        '<div role="separator" aria-valuenow={null as number | null} tabIndex={0} />',
        '<div role="separator" aria-valuenow={undefined!} tabIndex={0} />',
        '<div role="separator" aria-valuenow={/* unset */} tabIndex={0} />',
        '<div role="separator" aria-valuenow={{ position } as unknown as number} tabIndex={0} />',
        '<div role="separator" aria-valuenow={[position] satisfies number[]} tabIndex={0} />',
      ].map(code => ({ code, options, errors: [{ message }] })),
    });
  });

  it('retains upstream reports for component mappings and unknown roles', () => {
    new NoTypeCheckingRuleTester().run('no-noninteractive-tabindex', rule, {
      valid: [],
      invalid: [
        {
          code: '<Separator role="separator" aria-valuenow={50} tabIndex={0} />',
          settings: { 'jsx-a11y': { components: { Separator: 'div' } } },
          options,
          errors: [{ message }],
        },
        {
          code: '<div role={roleName} aria-valuenow={50} tabIndex={0} />',
          options: [{ roles: ['tabpanel'], allowExpressionValues: false }],
          errors: [{ message }],
        },
      ],
    });
  });
});

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
