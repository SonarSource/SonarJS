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
import path from 'node:path';
import { describe, it } from 'node:test';
import { expect } from 'expect';
import { meta } from './meta.js';
import { StylelintRuleTester } from '../../../../tests/css/tools/tester/tester.js';
import { LinterWrapper } from '../../linter/wrapper.js';
import { normalizeToAbsolutePath } from '../../../../../shared/src/helpers/files.js';

const RULE = meta.bindings[0].stylelintKey;
const MESSAGE =
  'Specify which properties should transition so future style changes do not animate unexpectedly.';
const tester = new StylelintRuleTester(RULE);

type Sample = { name: string; code: string; codeFilename?: string };

/** Carets are explicit golden locations, independent of the rule's parsing and reporting. */
async function invalid(sample: Sample): Promise<void> {
  const errors: {
    text: string;
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
  }[] = [];
  for (const [index, line] of sample.code.split('\n').entries()) {
    const carets = line.trimStart().startsWith('/*') ? /\^+/.exec(line) : null;
    if (carets) {
      errors.push({
        text: `${MESSAGE} (${RULE})`,
        line: index,
        column: carets.index + 1,
        endLine: index,
        endColumn: carets.index + carets[0].length + 1,
      });
    }
  }
  expect(errors.length).toBeGreaterThan(0);
  expect(sample.code.match(/Noncompliant/g)?.length).toBe(errors.length);
  await tester.invalid({ code: sample.code, codeFilename: sample.codeFilename, errors });
}

const valid: Sample[] = [
  {
    name: 'less variable overrides duration',
    code: 'a { transition: all 1s; transition-duration: @duration; }',
    codeFilename: 'test.less',
  },
  {
    name: 'preprocessor function overrides duration',
    code: 'a { transition: all 1s; transition-duration: duration(); }',
    codeFilename: 'test.scss',
  },
  {
    name: 'preprocessor function overrides shorthand',
    code: 'a { transition: all 1s; transition: motion(); }',
    codeFilename: 'test.scss',
  },

  { name: 'explicit properties', code: 'a { transition: opacity 200ms, background-color 200ms; }' },
  { name: 'zero shorthand', code: 'a { transition: all 0s; }' },
  { name: 'negative zero', code: 'a { transition: all -0ms; }' },
  { name: 'no duration', code: 'a { transition: all ease; }' },
  { name: 'none', code: 'a { transition: none; }' },
  { name: 'zero longhand', code: 'a { transition-property: all; transition-duration: 0ms; }' },
  { name: 'only property', code: 'a { transition-property: all; }' },
  { name: 'only duration', code: 'a { transition-duration: 1s; }' },
  { name: 'only delay', code: 'a { transition: all 0s 1s; }' },
  {
    name: 'positive delay with zero duration',
    code: 'a { transition-property: all; transition-delay: 1s; }',
  },
  { name: 'later shorthand property', code: 'a { transition: all 1s; transition: opacity 1s; }' },
  {
    name: 'later longhand property',
    code: 'a { transition: all 1s; transition-property: opacity; }',
  },
  { name: 'later zero duration', code: 'a { transition: all 1s; transition-duration: 0s; }' },
  { name: 'shorthand resets duration', code: 'a { transition-duration: 1s; transition: all; }' },
  {
    name: 'important property excludes all',
    code: 'a { transition-property: opacity !important; transition: all 1s; }',
  },
  {
    name: 'important zero duration',
    code: 'a { transition-duration: 0s !important; transition: all 1s; }',
  },
  {
    name: 'later important zero duration',
    code: 'a { transition: all 1s; transition-duration: 0s !important; }',
  },
  { name: 'later all supersedes earlier', code: 'a { transition: all 1s, all 0s; }' },
  {
    name: 'duration repetition zero',
    code: 'a { transition-property: opacity, all, transform; transition-duration: 1s, 0s; }',
  },
  {
    name: 'excess positive duration ignored',
    code: 'a { transition-property: all; transition-duration: 0s, 1s; }',
  },
  { name: 'unknown shorthand', code: 'a { transition: all 1s; transition: var(--motion); }' },
  {
    name: 'unknown property',
    code: 'a { transition: all 1s; transition-property: var(--property); }',
  },
  { name: 'unknown duration', code: 'a { transition: all 1s; transition-duration: var(--time); }' },
  { name: 'unknown math duration', code: 'a { transition: all calc(1s + 1s); }' },
  { name: 'inherit reset', code: 'a { transition: all 1s; transition: inherit; }' },
  {
    name: 'initial duration reset',
    code: 'a { transition: all 1s; transition-duration: initial; }',
  },
  { name: 'global reset', code: 'a { transition: all 1s; all: initial; }' },
  { name: 'unknown global reset', code: 'a { transition: all 1s; all: var(--reset); }' },
  { name: 'negative shorthand duration', code: 'a { transition: all -1s; }' },
  {
    name: 'negative longhand duration',
    code: 'a { transition-property: all; transition-duration: -1s; }',
  },
  { name: 'invalid mixed none', code: 'a { transition: all 1s, none 1s; }' },
  {
    name: 'invalid property list',
    code: 'a { transition-property: all, none; transition-duration: 1s; }',
  },
  { name: 'quoted property', code: 'a { transition: "all" 1s; }' },
  {
    name: 'separate blocks',
    code: 'a { transition-property: all; } b { transition-duration: 1s; }',
  },
  {
    name: 'parent duration not inherited',
    code: 'a { transition-duration: 1s; b { transition-property: all; } }',
  },
  { name: 'font descriptors', code: '@font-face { transition: all 1s; }' },
  { name: 'property descriptors', code: '@property --x { syntax: "*"; transition: all 1s; }' },
  { name: 'keyframes', code: '@keyframes fade { from { transition: all 1s; } }' },
  { name: 'prefixed keyframes', code: '@-webkit-keyframes fade { to { transition: all 1s; } }' },
  {
    name: 'disable comment',
    code: '/* stylelint-disable sonar/transition-no-all */ a { transition: all 1s; }',
  },
  { name: 'vendor prefix deferred', code: 'a { -webkit-transition: all 1s; }' },
  { name: 'scss variable', code: 'a { transition: all $time; }', codeFilename: 'test.scss' },
  { name: 'scss interpolation', code: 'a { transition: #{$motion}; }', codeFilename: 'test.scss' },
  { name: 'less interpolation', code: 'a { transition: @{motion}; }', codeFilename: 'test.less' },
  { name: 'sass named property', code: 'a\n  transition: opacity 1s\n', codeFilename: 'test.sass' },
];

const noncompliant: Sample[] = [
  {
    name: 'sass literal',
    code: `a
  transition: all 1s /* Noncompliant */
/*            ^^^ */
`,
    codeFilename: 'test.sass',
  },
  {
    name: 'multiple blocks',
    code: `a {
  transition: all 1s; /* Noncompliant */
/*            ^^^ */
}
b {
  transition: 1s ease; /* Noncompliant */
/*            ^^^^^^^ */
}`,
  },
  {
    name: 'explicit all',
    code: `a {
  transition: all 200ms; /* Noncompliant */
/*            ^^^ */
}`,
  },
  {
    name: 'implicit all',
    code: `a {
  transition: 200ms ease; /* Noncompliant */
/*            ^^^^^^^^^^ */
}`,
  },
  {
    name: 'longhand pair',
    code: `a {
  transition-property: all; /* Noncompliant */
/*                     ^^^ */
  transition-duration: 200ms;
}`,
  },
  {
    name: 'mixed list',
    code: `a {
  transition: all 200ms ease, opacity 100ms; /* Noncompliant */
/*            ^^^ */
}`,
  },
  {
    name: 'duration before target',
    code: `a {
  transition-duration: 1s;
  transition-property: all; /* Noncompliant */
/*                     ^^^ */
}`,
  },
  {
    name: 'later duration makes shorthand effective',
    code: `a {
  transition: all; /* Noncompliant */
/*            ^^^ */
  transition-duration: 1s;
}`,
  },
  {
    name: 'later property changes named shorthand',
    code: `a {
  transition: opacity 1s;
  transition-property: all; /* Noncompliant */
/*                     ^^^ */
}`,
  },
  {
    name: 'important shorthand wins',
    code: `a {
  transition: all 1s !important; /* Noncompliant */
/*            ^^^ */
  transition-property: opacity;
}`,
  },
  {
    name: 'important target combines normal duration',
    code: `a {
  transition-property: all !important; /* Noncompliant */
/*                     ^^^ */
  transition: opacity 1s;
}`,
  },
  {
    name: 'important duration survives shorthand',
    code: `a {
  transition-duration: 1s !important;
  transition: all; /* Noncompliant */
/*            ^^^ */
}`,
  },
  {
    name: 'later important wins',
    code: `a {
  transition: opacity 1s !important;
  transition: all 1s !important; /* Noncompliant */
/*            ^^^ */
}`,
  },
  {
    name: 'last all entry',
    code: `a {
  transition: all 0s, all 1s; /* Noncompliant */
/*                    ^^^ */
}`,
  },
  {
    name: 'duration repetition',
    code: `a {
  transition-property: opacity, transform, all; /* Noncompliant */
/*                                         ^^^ */
  transition-duration: 1s, 0s;
}`,
  },
  {
    name: 'shorter duration list',
    code: `a {
  transition-property: opacity, all; /* Noncompliant */
/*                              ^^^ */
  transition-duration: 1s;
}`,
  },
  {
    name: 'duration extra entries',
    code: `a {
  transition-property: all; /* Noncompliant */
/*                     ^^^ */
  transition-duration: 1s, 0s;
}`,
  },
  {
    name: 'unknown overridden',
    code: `a {
  transition: var(--motion);
  transition: all 1s; /* Noncompliant */
/*            ^^^ */
}`,
  },
  {
    name: 'unknown lower importance',
    code: `a {
  transition: all 1s !important; /* Noncompliant */
/*            ^^^ */
  transition: var(--motion);
}`,
  },
  {
    name: 'invalid later shorthand ignored',
    code: `a {
  transition: all 1s; /* Noncompliant */
/*            ^^^ */
  transition: all 1s 2s 3s;
}`,
  },
  {
    name: 'negative later duration ignored',
    code: `a {
  transition: all 1s; /* Noncompliant */
/*            ^^^ */
  transition-duration: -1s;
}`,
  },
  {
    name: 'invalid none list ignored',
    code: `a {
  transition: all 1s; /* Noncompliant */
/*            ^^^ */
  transition: none 1s, opacity 1s;
}`,
  },
  {
    name: 'case-insensitive keywords and units',
    code: `a {
  TRANSITION: ALL 1MS; /* Noncompliant */
/*            ^^^ */
}`,
  },
  {
    name: 'escaped all',
    code: String.raw`a {
  transition: \61ll 1s; /* Noncompliant */
/*            ^^^^^ */
}`,
  },
  {
    name: 'comments preserve raw offsets',
    code: `a {
  transition: /* before */ opacity 0s, /* middle */ all /* after */ 1s; /* Noncompliant */
/*                                                  ^^^ */
}`,
  },
  {
    name: 'multiline implicit entry',
    code: `a {
  transition: opacity 0s,
    1s ease; /* Noncompliant */
/*  ^^^^^^^ */
}`,
  },
  {
    name: 'time before property',
    code: `a {
  transition: 1s ease all; /* Noncompliant */
/*                    ^^^ */
}`,
  },
  {
    name: 'negative delay is not duration',
    code: `a {
  transition: 1s -50ms all; /* Noncompliant */
/*                     ^^^ */
}`,
  },
  {
    name: 'function commas',
    code: `a {
  transition: all 1s cubic-bezier(0, 0, 1, 1); /* Noncompliant */
/*            ^^^ */
}`,
  },
  {
    name: 'timing keyword with implicit all',
    code: `a {
  transition: linear 1s; /* Noncompliant */
/*            ^^^^^^^^^ */
}`,
  },
  {
    name: 'transition behavior',
    code: `a {
  transition: all 1s allow-discrete; /* Noncompliant */
/*            ^^^ */
}`,
  },
  {
    name: 'media rule',
    code: `@media (hover: hover) { a {
  transition: all 1s; /* Noncompliant */
/*            ^^^ */
} }`,
  },
  {
    name: 'supports rule',
    code: `@supports (display: grid) { a {
  transition: all 1s; /* Noncompliant */
/*            ^^^ */
} }`,
  },
  {
    name: 'nested conditional declarations',
    code: `a { @media (hover: hover) {
  transition: all 1s; /* Noncompliant */
/*            ^^^ */
} }`,
  },
  {
    name: 'scss literal',
    code: `a {
  transition: all 1s; /* Noncompliant */
/*            ^^^ */
}`,
    codeFilename: 'test.scss',
  },
  {
    name: 'less literal',
    code: `a {
  transition: all 1s; /* Noncompliant */
/*            ^^^ */
}`,
    codeFilename: 'test.less',
  },
  {
    name: 'embedded CSS',
    code: `<style>
a {
  transition: all 1s; /* Noncompliant */
/*            ^^^ */
}
</style>`,
    codeFilename: 'test.html',
  },
  {
    name: 'embedded SCSS',
    code: `<template><div /></template>
<style lang="scss">
a {
  transition: all 1s; /* Noncompliant */
/*            ^^^ */
}
</style>`,
    codeFilename: 'component.vue',
  },
];

describe('S9449 (transition-no-all)', (): void => {
  for (const sample of valid) {
    it(`accepts ${sample.name}`, async (): Promise<void> => tester.valid(sample));
  }
  for (const sample of noncompliant) {
    it(`reports ${sample.name} at the annotated location`, async (): Promise<void> =>
      invalid(sample));
  }
  it('maps the rule and issue location through the analyzer bridge', async (): Promise<void> => {
    const linter = new LinterWrapper();
    linter.initialize([{ key: RULE, configurations: [] }]);
    const filePath = normalizeToAbsolutePath(path.join(import.meta.dirname, 'bridge.css'));
    const { issues } = await linter.lint(
      filePath,
      `a {
  transition: all 1s; /* Noncompliant */
/*            ^^^ */
}`,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      ruleId: RULE,
      message: MESSAGE,
      line: 2,
      column: 14,
      endLine: 2,
      endColumn: 17,
    });
  });
});
