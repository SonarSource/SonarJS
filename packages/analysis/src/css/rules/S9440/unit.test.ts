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
import { expect } from 'expect';
import stylelint from 'stylelint';
import { StylelintRuleTester } from '../../../../tests/css/tools/tester/tester.js';
import { createStylelintConfig } from '../../linter/config.js';
import { messages, rule } from './rule.js';

const RULE = 'sonar/motion-reduced';
const tester = new StylelintRuleTester(RULE);
const frames = `@keyframes move {
  from { transform: translateX(2rem); }
  to { transform: translateX(0); }
}`;
const animation = 'animation: move 400ms';
const transition = 'transition: transform 400ms';
const states = '.panel:hover { transform: translateX(1rem); }';

type Sample = { name: string; code: string; target: string; filename?: string };

/** Add an explicit marker and squiggle for the expected declaration, without reading lint output. */
async function invalid(sample: Sample, configuration: unknown[] = []): Promise<void> {
  const offset = sample.code.lastIndexOf(sample.target);
  expect(offset).toBeGreaterThanOrEqual(0);
  const prefix = sample.code.slice(0, offset);
  const line = prefix.split('\n').length;
  const column = offset - prefix.lastIndexOf('\n');
  const lines = sample.code.split('\n');
  lines[line - 1] += ' /* Noncompliant */';
  const squiggle = `${' '.repeat(column - 1)}${'^'.repeat(sample.target.length)}`;
  // The comment starts at column one, so the squiggle retains its exact alignment.
  lines.splice(line, 0, `/*${squiggle.slice(2)} */`);
  const config = createStylelintConfig([{ key: RULE, configurations: configuration }]);
  const {
    results: [result],
  } = await stylelint.lint({
    code: lines.join('\n'),
    codeFilename: sample.filename ?? 'test.css',
    config,
  });
  expect(result.parseErrors).toHaveLength(0);
  expect(result.warnings).toHaveLength(1);
  expect(result.warnings[0]).toMatchObject({
    rule: RULE,
    text: `${messages.motion} (${RULE})`,
    line,
    column,
    endLine: line,
    endColumn: column + sample.target.length,
  });
}

describe('S9440 spatial motion and reduced-motion safeguards', (): void => {
  const quotedNoneFrames = `@keyframes "none" {
    from { transform: translateX(1rem); }
    to { transform: none; }
  }`;
  const invalidSamples: Sample[] = [
    {
      name: 'nested media declaration still enables unguarded animation',
      code: `.panel {
  @media screen { animation: move 1s; }
}
${frames}`,
      target: 'animation: move 1s',
    },
    {
      name: 'nested reduce declaration explicitly enables motion',
      code: `.panel {
  @media (prefers-reduced-motion: reduce) { animation: move 1s; }
}
${frames}`,
      target: 'animation: move 1s',
    },
    {
      name: 'later declaration re-enables a nested reduce override',
      code: `.panel {
  @media (prefers-reduced-motion: reduce) { animation: none; }
  animation: move 1s;
}
${frames}`,
      target: 'animation: move 1s',
    },
    {
      name: 'nested override on an unrelated selector does not guard motion',
      code: `.panel { animation: move 1s; }
.other {
  @media (prefers-reduced-motion: reduce) { animation: none; }
}
${frames}`,
      target: 'animation: move 1s',
    },
    {
      name: 'quoted none is an animation name in shorthand',
      code: `.panel { animation: "none" 1s; }\n${quotedNoneFrames}`,
      target: 'animation: "none" 1s',
    },
    {
      name: 'quoted none is an animation name in longhand',
      code: `.panel { animation-name: "none"; animation-duration: 1s; }\n${quotedNoneFrames}`,
      target: 'animation-duration: 1s',
    },
    {
      name: 'none can be a fill mode alongside a quoted animation name',
      code: `.panel { animation: none "none" 1s; }\n${quotedNoneFrames}`,
      target: 'animation: none "none" 1s',
    },
    {
      name: 'disabled animation does not suppress another list item',
      code: `.panel { animation-name: none, "none"; animation-duration: 1s; }\n${quotedNoneFrames}`,
      target: 'animation-duration: 1s',
    },
    {
      name: 'quoted CSS-wide keyword is an animation name',
      code: `.panel { animation: "initial" 1s; }\n${frames.replace('move', '"initial"')}`,
      target: 'animation: "initial" 1s',
    },
    {
      name: 'quoted empty string is an animation name',
      code: `.panel { animation: "" 1s; }\n${frames.replace('move', '""')}`,
      target: 'animation: "" 1s',
    },
    {
      name: 'equivalent offsets retain a genuine intermediate movement',
      code: `.panel { animation: move 1s; }
@keyframes move {
  from { transform: none; }
  50%, 100% { transform: translateX(1rem); }
  100.0% { transform: none; }
}`,
      target: 'animation: move 1s',
    },
    {
      name: 'initial transform can animate to a non-identity value',
      code: `.panel { animation: move 1s; }
@keyframes move {
  from { transform: initial; }
  to { transform: translateX(1rem); }
}`,
      target: 'animation: move 1s',
    },
    {
      name: 'transform aliases retain different values',
      code: `.panel { animation: move 1s; }
@keyframes move {
  from { transform: translateX(1rem); }
  to { transform: translate(2rem, 0); }
}`,
      target: 'animation: move 1s',
    },
    {
      name: 'rotateZ full rotation remains motion',
      code: `.panel { animation: move 1s; }
@keyframes move {
  from { transform: rotate(0deg); }
  to { transform: rotateZ(360deg); }
}`,
      target: 'animation: move 1s',
    },
    {
      name: 'different matrices establish spatial motion',
      code: `.panel { animation: move 1s; }
@keyframes move {
  from { transform: matrix(1, 0, 0, 1, 10, 0); }
  to { transform: matrix(1, 0, 0, 1, 20, 0); }
}`,
      target: 'animation: move 1s',
    },
    {
      name: 'different matrix3d values establish spatial motion',
      code: `.panel { animation: move 1s; }
@keyframes move {
  from { transform: matrix3d(.1, 0, 0, 0, 0, .1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1); }
  to { transform: matrix3d(.4, 0, 0, 0, 0, .4, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1); }
}`,
      target: 'animation: move 1s',
    },
    {
      name: 'non-identity matrix transition establishes spatial motion',
      code: `.panel { transition: transform 1s; }
.panel:hover { transform: matrix(1, 0, 0, 1, 10, 0); }`,
      target: 'transition: transform 1s',
    },
    {
      name: 'ID selector spatial animation',
      code: `#main { ${animation}; }\n${frames}`,
      target: animation,
    },
    {
      name: 'attribute suffix selector spatial animation',
      code: `[href$=".pdf"] { ${animation}; }\n${frames}`,
      target: animation,
    },
    {
      name: 'animation duration cycling leaves a second animation unreduced',
      code: `.panel { animation-name: move, move; animation-duration: 1s, .2s; }\n@media (prefers-reduced-motion: reduce) { .panel { animation-duration: .5s; } }\n${frames}`,
      target: 'animation-duration: .5s',
    },
    {
      name: 'transition duration cycling leaves a second property unreduced',
      code: '.panel { width: 10px; transition-property: transform, width; transition-duration: 1s, .2s; }\n.panel:hover { width: 20px; transform: translateX(1rem); }\n@media (prefers-reduced-motion: reduce) { .panel { transition-duration: .5s; } }',
      target: 'transition-duration: .5s',
    },
    {
      name: 'case-insensitive transition shorthand',
      code: `.panel { transition: TRANSFORM 1s; }\n${states}`,
      target: 'transition: TRANSFORM 1s',
    },
    {
      name: 'case-insensitive transition longhand',
      code: `.panel { transition-property: TRANSFORM; transition-duration: 1s; }\n${states}`,
      target: 'transition-duration: 1s',
    },
    {
      name: 'case-insensitive smooth scrolling',
      code: 'html { SCROLL-BEHAVIOR: SMOOTH; }',
      target: 'SCROLL-BEHAVIOR: SMOOTH',
    },
    {
      name: 'case-insensitive infinite iterations',
      code: `.panel { animation: move 1s; animation-iteration-count: INFINITE; }\n${frames}`,
      target: 'animation: move 1s',
    },
    {
      name: 'case-insensitive infinite shorthand',
      code: `.panel { animation: move 1s INFINITE; }\n${frames}`,
      target: 'animation: move 1s INFINITE',
    },
    {
      name: 'HTML keyframes shared across style blocks',
      code: `<style>\n.panel { ${animation}; }\n</style>\n<style>${frames}</style>`,
      target: animation,
      filename: 'page.html',
    },
    {
      name: 'earlier HTML style override is re-enabled',
      code: `<style>@media (prefers-reduced-motion: reduce) { .panel { animation: none; } }</style>\n<style>\n.panel { ${animation}; }\n${frames}\n</style>`,
      target: animation,
      filename: 'page.html',
    },
    {
      name: 'HTML sibling safeguard has an unrelated selector',
      code: `<style>\n.panel { ${animation}; }\n${frames}\n</style>\n<style>@media (prefers-reduced-motion: reduce) { .other { animation: none; } }</style>`,
      target: animation,
      filename: 'page.html',
    },
    {
      name: 'HTML style media attribute enables motion under reduce',
      code: `<style>${frames}</style>\n<style media="(prefers-reduced-motion: reduce)">\n.panel { ${animation}; }\n</style>`,
      target: animation,
      filename: 'page.html',
    },
    {
      name: 'full-turn rotation still interpolates movement',
      code: '.panel { animation: move 1s; }\n@keyframes move { from { transform: rotate(0turn); } to { transform: rotate(1turn); } }',
      target: 'animation: move 1s',
    },
    {
      name: 'RSPEC spatial animation',
      code: `.panel { ${animation}; }\n${frames}`,
      target: animation,
    },
    {
      name: 'RSPEC spatial transition',
      code: `.panel { ${transition}; }\n${states}`,
      target: transition,
    },
    {
      name: 'RSPEC smooth scrolling',
      code: 'html { scroll-behavior: smooth; }',
      target: 'scroll-behavior: smooth',
    },
    {
      name: 'animation longhands',
      code: `.panel { animation-name: move; animation-duration: 1s; }\n${frames}`,
      target: 'animation-duration: 1s',
    },
    {
      name: 'transition longhands',
      code: `.panel { transition-property: transform; transition-duration: 1s; }\n${states}`,
      target: 'transition-duration: 1s',
    },
    {
      name: 'animation duration before name',
      code: `.panel { animation-duration: 1s; animation-name: move; }\n${frames}`,
      target: 'animation-name: move',
    },
    {
      name: 'duration is distinct from delay',
      code: `.panel { animation: move 2s 0s; }\n${frames}`,
      target: 'animation: move 2s 0s',
    },
    {
      name: 'timing function commas',
      code: `.panel { animation: move 1s steps(2, end); }\n${frames}`,
      target: 'animation: move 1s steps(2, end)',
    },
    {
      name: 'animation lists cycle durations',
      code: `.panel { animation-name: fade, move; animation-duration: 1s; }\n${frames}`,
      target: 'animation-duration: 1s',
    },
    {
      name: 'transition list aligns durations',
      code: `.panel { transition: opacity 0s, transform 1s; }\n${states}`,
      target: 'transition: opacity 0s, transform 1s',
    },
    {
      name: 'later duplicate selector enables animation',
      code: `.panel { animation-name: move; }\n.panel { animation-duration: 1s; }\n${frames}`,
      target: 'animation-duration: 1s',
    },
    {
      name: 'unrelated safeguard',
      code: `.panel { ${animation}; }\n@media (prefers-reduced-motion: reduce) { .other { animation: none; } }\n${frames}`,
      target: animation,
    },
    {
      name: 'unguarded media alternative',
      code: `@media (prefers-reduced-motion: no-preference), screen { .panel { ${animation}; } }\n${frames}`,
      target: animation,
    },
    {
      name: 'motion explicitly enabled under reduce',
      code: `@media (prefers-reduced-motion: reduce) { .panel { ${animation}; } }\n${frames}`,
      target: animation,
    },
    {
      name: 'important enabling declaration wins',
      code: `.panel { animation: move 400ms !important; }\n@media (prefers-reduced-motion: reduce) { .panel { animation: none; } }\n${frames}`,
      target: 'animation: move 400ms !important',
    },
    {
      name: 'important enabling declaration beats universal reset',
      code: `.panel { animation: move 400ms !important; }\n@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }\n${frames}`,
      target: 'animation: move 400ms !important',
    },
    {
      name: 'earlier normal override is re-enabled',
      code: `@media (prefers-reduced-motion: reduce) { .panel { animation: none; } }\n.panel { ${animation}; }\n${frames}`,
      target: animation,
    },
    {
      name: 'later declaration re-enables motion',
      code: `.panel { ${animation}; }\n@media (prefers-reduced-motion: reduce) { .panel { animation: none; } }\n.panel { animation: move 1s; }\n${frames}`,
      target: 'animation: move 1s',
    },
    {
      name: 'one selector-list branch lacks safeguard',
      code: `.panel, .other { ${animation}; }\n@media (prefers-reduced-motion: reduce) { .panel { animation: none; } }\n${frames}`,
      target: animation,
    },
    {
      name: 'static nested CSS',
      code: `.container { .panel { ${animation}; } }\n${frames}`,
      target: animation,
    },
    {
      name: 'nested ampersand selector',
      code: `.panel { &.active { ${animation}; } }\n${frames}`,
      target: animation,
    },
    {
      name: 'SCSS literal motion',
      code: `.container { .panel { ${animation}; } }\n${frames}`,
      target: animation,
      filename: 'styles.scss',
    },
    {
      name: 'Less literal motion',
      code: `.container { .panel { ${animation}; } }\n${frames}`,
      target: animation,
      filename: 'styles.less',
    },
    {
      name: 'Sass literal motion',
      code: '.panel\n  scroll-behavior: smooth',
      target: 'scroll-behavior: smooth',
      filename: 'styles.sass',
    },
    {
      name: 'HTML style block',
      code: `<style>\n.panel { ${animation}; }\n${frames}\n</style>`,
      target: animation,
      filename: 'page.html',
    },
    {
      name: 'Vue style block',
      code: `<template><div /></template>\n<style>\n.panel { ${animation}; }\n${frames}\n</style>`,
      target: animation,
      filename: 'component.vue',
    },
    {
      name: 'embedded SCSS',
      code: `<template><div /></template>\n<style lang="scss">\n.container { .panel { ${animation}; } }\n${frames}\n</style>`,
      target: animation,
      filename: 'component.vue',
    },
    {
      name: 'known layout state change',
      code: '.panel { width: 10px; transition: width 1s; }\n.panel:hover { width: 20px; }',
      target: 'transition: width 1s',
    },
    {
      name: 'last unconditional keyframes win',
      code: `@keyframes move { from { opacity: 0; } to { opacity: 1; } }\n${frames}\n.panel { ${animation}; }`,
      target: animation,
    },
    {
      name: 'negated no-preference enables reduce motion',
      code: `@media not (prefers-reduced-motion: no-preference) { .panel { ${animation}; } }\n${frames}`,
      target: animation,
    },
    {
      name: 'pseudo-element needs its own global reset',
      code: `.panel::before { ${animation}; }\n@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }\n${frames}`,
      target: animation,
    },
    {
      name: 'unrelated disable comment',
      code: `/* stylelint-disable-next-line color-no-invalid-hex */\n.panel { ${animation}; }\n${frames}`,
      target: animation,
    },
  ];
  for (const sample of invalidSamples) {
    it(sample.name, (): Promise<void> => invalid(sample));
  }

  const validSamples: Array<{ name: string; code: string; filename?: string }> = [
    {
      name: 'nested media disables animation for reduced motion',
      code: `.panel {
  animation: move 1s;
  @media (prefers-reduced-motion: reduce) { animation: none; }
}
${frames}`,
    },
    {
      name: 'nested media disables a spatial transition for reduced motion',
      code: `.panel {
  transition: transform 1s;
  @media (prefers-reduced-motion: reduce) { transition: none; }
}
${states}`,
    },
    {
      name: 'nested media disables smooth scrolling for reduced motion',
      code: `html {
  scroll-behavior: smooth;
  @media (prefers-reduced-motion: reduce) { scroll-behavior: auto; }
}`,
    },
    {
      name: 'nested media guards animation in SCSS',
      code: `.panel {
  animation: move 1s;
  @media (prefers-reduced-motion: reduce) { animation: none; }
}
${frames}`,
      filename: 'styles.scss',
    },
    {
      name: 'PVF Koel nested reduced-motion guard in a postcss style block',
      code: `<template><div class="marquee" /></template>
<style lang="postcss">
@keyframes marquee {
  from { left: -50%; }
  to { left: 100%; }
}
.marquee {
  animation: marquee 3s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; }
}
</style>`,
      filename: 'component.vue',
    },
    ...[
      'animation: none 1s',
      'animation: NONE 1s',
      'animation: 1s',
      'animation-name: none; animation-duration: 1s',
      'animation-duration: 1s',
      'animation: "none" 1s; animation-name: none',
    ].map((declaration: string): { name: string; code: string } => ({
      name: `disabled animation does not resolve quoted none: ${declaration}`,
      code: `.panel { ${declaration}; }\n${quotedNoneFrames}`,
    })),
    {
      name: 'numeric end offset overrides an equivalent spelling',
      code: `.panel { animation: move 1s; }
@keyframes move {
  from { transform: translateX(1rem); }
  100% { transform: none; }
  100.0% { transform: translateX(1rem); }
}`,
    },
    {
      name: 'disabled animation does not resolve a quoted empty name',
      code: `.panel { animation: none 1s; }\n${frames.replace('move', '""')}`,
    },
    {
      name: 'numeric start offset overrides from',
      code: `.panel { animation: move 1s; }
@keyframes move {
  from { transform: translateX(1rem); }
  0.0% { transform: none; }
  to { transform: none; }
}`,
    },
    {
      name: 'offset aliases preserve property values from earlier blocks',
      code: `.panel { animation: move 1s; }
@keyframes move {
  from { transform: none; }
  100% { transform: none; }
  1e2% { opacity: 1; }
}`,
    },
    {
      name: 'numeric offsets support signs and exponent notation',
      code: `.panel { animation: move 1s; }
@keyframes move {
  -0% { transform: translateX(1rem); }
  +0.0% { transform: none; }
  1e2% { transform: none; }
}`,
    },
    {
      name: 'inherited keyframe transform is unresolved',
      code: `.panel { animation: move 1s; }
@keyframes move {
  from { transform: inherit; }
  to { transform: none; }
}`,
    },
    {
      name: 'reverted transition transform is unresolved',
      code: `.panel { transform: revert-layer; transition: transform 1s; }
.panel:hover { transform: translateX(1rem); }`,
    },
    {
      name: 'non-identity matrix equivalence is unresolved',
      code: `.panel { animation: move 1s; }
@keyframes move {
  from { transform: matrix(1, 0, 0, 1, 10, 0); }
  to { transform: translateX(10px); }
}`,
    },
    {
      name: 'zero percent transform is identity',
      code: '.panel { animation: move 1s; }\n@keyframes move { from { transform: translateY(0%); } to { transform: none; } }',
    },
    {
      name: 'zero viewport length is identity',
      code: '.panel { animation: move 1s; }\n@keyframes move { from { transform: translateX(0vw); } to { transform: none; } }',
    },
    {
      name: 'interpolated SCSS selector is uncertain',
      code: `#{$selector} { ${animation}; }\n${frames}`,
      filename: 'styles.scss',
    },
    {
      name: 'embedded motion-specific disable comment',
      code: `<style>\n/* stylelint-disable-next-line ${RULE} */\n.panel { ${animation}; }\n${frames}\n</style>\n<style>.other { color: red; }</style>`,
      filename: 'page.html',
    },
    {
      name: 'identical explicit base and hover transform',
      code: '.panel { transform: translateX(1rem); transition: transform 1s; }\n.panel:hover { transform: translateX(1rem); }',
    },
    {
      name: 'transform argument whitespace is equivalent',
      code: '.panel { animation: move 1s; }\n@keyframes move { from { transform: translateX(1rem); } to { transform: translateX( 1rem ); } }',
    },
    {
      name: 'identity matrix is equivalent to none',
      code: '.panel { animation: move 1s; }\n@keyframes move { from { transform: none; } to { transform: matrix(1, 0, 0, 1, 0, 0); } }',
    },
    {
      name: 'identity matrix3d is equivalent to none',
      code: '.panel { animation: move 1s; }\n@keyframes move { from { transform: none; } to { transform: matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1); } }',
    },
    {
      name: 'zero turns are equivalent to none',
      code: '.panel { animation: move 1s; }\n@keyframes move { from { transform: none; } to { transform: rotate(0turn); } }',
    },
    {
      name: 'zero grads are equivalent to none',
      code: '.panel { animation: move 1s; }\n@keyframes move { from { transform: none; } to { transform: rotate(0grad); } }',
    },
    {
      name: 'case-insensitive paused longhand',
      code: `.panel { animation: move 1s; animation-play-state: PAUSED; }\n${frames}`,
    },
    {
      name: 'HTML sibling style override',
      code: `<style>.panel { ${animation}; }\n${frames}</style>\n<style>@media (prefers-reduced-motion: reduce) { .panel { animation: none; } }</style>`,
      filename: 'page.html',
    },
    {
      name: 'HTML no-preference media attribute',
      code: `<style media="(prefers-reduced-motion: no-preference)">.panel { ${animation}; }\n${frames}</style>`,
      filename: 'page.html',
    },
    {
      name: 'HTML reduced-motion media attribute override',
      code: `<style>.panel { ${animation}; }\n${frames}</style>\n<style media="(prefers-reduced-motion: reduce)">.panel { animation: none; }</style>`,
      filename: 'page.html',
    },
    {
      name: 'Vue scoped styles do not resolve unscoped keyframes',
      code: `<style scoped>.panel { ${animation}; }</style>\n<style>${frames}</style>`,
      filename: 'component.vue',
    },
    {
      name: 'RSPEC no-preference animation guard',
      code: `@media (prefers-reduced-motion: no-preference) { .panel { ${animation}; } }\n${frames}`,
    },
    {
      name: 'RSPEC no-preference transition guard preserves final state',
      code: `@media (prefers-reduced-motion: no-preference) { .panel { ${transition}; } }\n${states}`,
    },
    {
      name: 'RSPEC guarded smooth scrolling',
      code: '@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }',
    },
    {
      name: 'RSPEC later same-selector reduce override',
      code: `.panel { ${animation}; }\n${frames}\n@media (prefers-reduced-motion: reduce) { .panel { animation: none; } }`,
    },
    { name: 'zero animation duration', code: `.panel { animation: move 0s 1s; }\n${frames}` },
    { name: 'zero transition duration', code: `.panel { transition: transform 0ms; }\n${states}` },
    { name: 'animation none', code: `.panel { animation: none 1s; }\n${frames}` },
    {
      name: 'animation name without duration',
      code: `.panel { animation-name: move; }\n${frames}`,
    },
    {
      name: 'shorthand resets earlier duration',
      code: `.panel { animation-duration: 1s; animation: move; }\n${frames}`,
    },
    {
      name: 'later unconditional disabling declaration',
      code: `.panel { ${animation}; }\n.panel { animation: none; }\n${frames}`,
    },
    {
      name: 'same-value keyframes',
      code: '.panel { animation: move 1s; }\n@keyframes move { from { transform: translateX(1rem); } to { transform: translateX(1rem); } }',
    },
    {
      name: 'overwritten keyframe values',
      code: '.panel { animation: move 1s; }\n@keyframes move { from { transform: translateX(1rem); transform: none; } to { transform: none; } }',
    },
    {
      name: 'identity transforms do not move',
      code: '.panel { animation: move 1s; }\n@keyframes move { from { transform: translateX(0px); } to { transform: none; } }',
    },
    {
      name: 'opacity-only keyframes',
      code: '.panel { animation: fade 1s; }\n@keyframes fade { from { opacity: 0; } to { opacity: 1; } }',
    },
    {
      name: 'color-only transition',
      code: '.panel { transition: color 1s; }\n.panel:hover { color: red; }',
    },
    {
      name: 'opacity-only transition',
      code: '.panel { transition: opacity 1s; }\n.panel:hover { opacity: 0; }',
    },
    {
      name: 'all-property transition is uncertain',
      code: `.panel { transition: all 1s; }\n${states}`,
    },
    { name: 'transition target is unresolved', code: `.panel { ${transition}; }` },
    {
      name: 'constant transformed element does not establish a transition',
      code: `.panel { ${transition}; transform: translateX(1rem); }`,
    },
    {
      name: 'identity hover transform',
      code: `.panel { ${transition}; }\n.panel:hover { transform: translateX(0); }`,
    },
    {
      name: 'layout state is unresolved',
      code: '.panel { transition: width 1s; }\n.panel:hover { width: 100px; }',
    },
    {
      name: 'dynamic target state',
      code: `.panel { ${transition}; }\n.panel:hover { transform: translateX(var(--distance)); }`,
    },
    {
      name: 'dynamic animation duration',
      code: `.panel { animation: move var(--duration); }\n${frames}`,
    },
    { name: 'unresolved animation name', code: '.panel { animation: unknown 1s; }' },
    {
      name: 'dynamic keyframe values',
      code: '.panel { animation: move 1s; }\n@keyframes move { from { transform: translateX(var(--distance)); } to { transform: none; } }',
    },
    {
      name: 'conditional keyframes',
      code: `.panel { ${animation}; }\n@media screen { ${frames} }`,
    },
    { name: 'paused animation', code: `.panel { animation: move 1s paused; }\n${frames}` },
    { name: 'zero iterations', code: `.panel { animation: move 1s 0; }\n${frames}` },
    { name: 'decimal zero iterations', code: `.panel { animation: move 1s 0.0; }\n${frames}` },
    {
      name: 'all initial resets motion',
      code: `.panel { ${animation}; all: initial; }\n${frames}`,
    },
    { name: 'all unset resets motion', code: `.panel { ${animation}; all: unset; }\n${frames}` },
    { name: 'all revert is unresolved', code: `.panel { ${animation}; all: revert; }\n${frames}` },
    {
      name: 'contradictory motion conditions never enable movement',
      code: `@media (prefers-reduced-motion: reduce) and (prefers-reduced-motion: no-preference) { .panel { ${animation}; } }\n${frames}`,
    },
    {
      name: 'negated reduce guard',
      code: `@media not (prefers-reduced-motion: reduce) { .panel { ${animation}; } }\n${frames}`,
    },
    {
      name: 'all media alternatives exclude reduce',
      code: `@media screen and (prefers-reduced-motion: no-preference), print and (prefers-reduced-motion: no-preference) { .panel { ${animation}; } }\n${frames}`,
    },
    {
      name: 'nested no-preference guard',
      code: `@media screen { @media (prefers-reduced-motion: no-preference) { .panel { ${animation}; } } }\n${frames}`,
    },
    {
      name: 'same-context reduce override',
      code: `@media screen { .panel { ${animation}; } @media (prefers-reduced-motion: reduce) { .panel { animation: none; } } }\n${frames}`,
    },
    {
      name: 'unconditional reduce branch covers all reduce users',
      code: `.panel { ${animation}; }\n@media (prefers-reduced-motion: reduce), print { .panel { animation: none; } }\n${frames}`,
    },
    {
      name: 'zero-duration reduce override',
      code: `.panel { ${animation}; }\n@media (prefers-reduced-motion: reduce) { .panel { animation-duration: 0s; } }\n${frames}`,
    },
    {
      name: 'shorter positive reduced duration is uncertain',
      code: `.panel { ${animation}; }\n@media (prefers-reduced-motion: reduce) { .panel { animation-duration: 0.01ms; } }\n${frames}`,
    },
    {
      name: 'smooth scrolling is disabled by auto',
      code: 'html { scroll-behavior: smooth; }\n@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }',
    },
    {
      name: 'important universal reset',
      code: `.panel { ${animation}; }\n@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }\n${frames}`,
    },
    {
      name: 'earlier important universal reset',
      code: `@media (prefers-reduced-motion: reduce) { * { animation-duration: 0s !important; } }\n.panel { ${animation}; }\n${frames}`,
    },
    {
      name: 'pseudo-element universal reset',
      code: `.panel::before { ${animation}; }\n@media (prefers-reduced-motion: reduce) { *::before { animation: none !important; } }\n${frames}`,
    },
    {
      name: 'static nested selector overrides',
      code: `.container { .panel { ${animation}; } }\n@media (prefers-reduced-motion: reduce) { .container .panel { animation: none; } }\n${frames}`,
    },
    {
      name: 'layers are unresolved',
      code: `@layer widgets { .panel { ${animation}; } }\n${frames}`,
    },
    {
      name: 'layered override makes matching selector uncertain',
      code: `.panel { ${animation}; }\n@layer reset { .panel { animation: none; } }\n${frames}`,
    },
    {
      name: 'conditional reduce override is uncertain',
      code: `.panel { ${animation}; }\n@media (prefers-reduced-motion: reduce) and (max-width: 500px) { .panel { animation: none; } }\n${frames}`,
    },
    {
      name: 'dynamic SCSS value',
      code: `.panel { animation: move $duration; }\n${frames}`,
      filename: 'styles.scss',
    },
    {
      name: 'dynamic Less value',
      code: `.panel { animation: move @duration; }\n${frames}`,
      filename: 'styles.less',
    },
    {
      name: 'motion-specific disable comment',
      code: `/* stylelint-disable-next-line ${RULE} */\n.panel { ${animation}; }\n${frames}`,
    },
    {
      name: 'global disable comment',
      code: `/* stylelint-disable */\n.panel { ${animation}; }\n${frames}`,
    },
  ];
  for (const sample of validSamples) {
    it(sample.name, (): Promise<void> =>
      tester.valid({ code: sample.code, codeFilename: sample.filename }),
    );
  }

  const equivalentTransforms: Array<[string, string]> = [
    ['initial', 'none'],
    ['unset', 'none'],
    ['translateX(1rem)', 'translate(1rem, 0)'],
    ['translateY(1rem)', 'translate(0, 1rem)'],
    ['translate(1rem)', 'translate(1rem, 0)'],
    ['scaleX(2)', 'scale(2, 1)'],
    ['scaleY(2)', 'scale(1, 2)'],
    ['scale(2)', 'scale(2, 2)'],
    ['rotateZ(45deg)', 'rotate(45deg)'],
    ['skewX(15deg)', 'skew(15deg, 0)'],
    ['skewY(15deg)', 'skew(0, 15deg)'],
    ['skew(15deg)', 'skew(15deg, 0)'],
  ];
  for (const [before, after] of equivalentTransforms) {
    it(`constant keyframes: ${before} and ${after}`, (): Promise<void> =>
      tester.valid({
        code: `.panel { animation: move 1s; }
@keyframes move {
  from { transform: ${before}; }
  to { transform: ${after}; }
}`,
      }));
    it(`constant transition: ${before} and ${after}`, (): Promise<void> =>
      tester.valid({
        code: `.panel { transform: ${before}; transition: transform 1s; }
.panel:hover { transform: ${after}; }`,
      }));
  }

  it('accepts a verified exact selector exception', (): Promise<void> =>
    new StylelintRuleTester(RULE, [true, { ignoreSelectors: ['.panel'] }]).valid({
      code: `.panel { ${animation}; }\n${frames}`,
    }));
  it('accepts a verified regular-expression exception', (): Promise<void> =>
    new StylelintRuleTester(RULE, [true, { ignoreSelectors: ['/motion-enabled/'] }]).valid({
      code: `.motion-enabled .panel { ${animation}; }\n${frames}`,
    }));
  it('does not infer safeguards from opt-in-looking class names', (): Promise<void> =>
    invalid({
      name: 'unverified opt-in',
      code: `.motion-enabled { ${animation}; }\n${frames}`,
      target: animation,
    }));
  it('does not suppress unignored selector-list branches', (): Promise<void> =>
    invalid(
      {
        name: 'partial exception',
        code: `.panel, .other { ${animation}; }\n${frames}`,
        target: animation,
      },
      [true, { ignoreSelectors: ['.panel'] }],
    ));
  it('rejects an invalid regular-expression option without throwing', async (): Promise<void> => {
    const config = createStylelintConfig([
      { key: RULE, configurations: [true, { ignoreSelectors: ['/[/'] }] },
    ]);
    const {
      results: [result],
    } = await stylelint.lint({ code: 'html { scroll-behavior: smooth; }', config });
    expect(result.invalidOptionWarnings).toHaveLength(1);
  });
  it('rejects unknown secondary options', async (): Promise<void> => {
    const config = { plugins: [rule], rules: { [RULE]: [true, { unknown: true }] } };
    const {
      results: [result],
    } = await stylelint.lint({ code: 'html { scroll-behavior: smooth; }', config });
    expect(result.invalidOptionWarnings).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);
  });
});
