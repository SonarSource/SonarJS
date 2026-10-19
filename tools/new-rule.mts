/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { checkbox, input, select } from '@inquirer/prompts';
import { verifyRuleName } from './helpers.js';
import { createNewRule } from './create-rule-boilerplate.js';
import { createNewCssRule } from './create-css-rule-boilerplate.js';
import { isRuleKey, ruleKeyRegex } from './rule-key.js';
import type stylelint from 'stylelint';
import type { CssRuleDefinition } from '../packages/analysis/src/css/rules/types.js';

const engine = await select({
  message: 'Which linter will run the rule?',
  choices: [
    { name: 'JavaScript / TypeScript (ESLint)', value: 'eslint' },
    { name: 'CSS (Stylelint)', value: 'stylelint' },
  ],
});
const sonarKey = await input({ message: 'Enter the Sonar key for the new rule (SXXXX)' });
if (!isRuleKey(sonarKey)) {
  throw new Error(`Invalid rspec key: it should match ${ruleKeyRegex}, but got "${sonarKey}"`);
}
const implementation = await select({
  message: 'Origin of the rule',
  choices: [
    { name: 'Sonar pure implementation', value: 'original' },
    { name: 'External rule to be used directly', value: 'external' },
    { name: 'Rule will decorate an external rule', value: 'decorated' },
  ],
});

if (engine === 'stylelint') {
  const stylelintKey = await input({
    message:
      implementation === 'external'
        ? 'Enter the upstream Stylelint key (including @stylistic/ when applicable)'
        : 'Enter the local Stylelint key (sonar/rule-name)',
  });
  const cssOnly = await select({
    message: 'Which syntax does this rule support?',
    choices: [
      { name: 'CSS and preprocessors', value: false },
      { name: 'Plain CSS only (including CSS blocks in HTML/Vue)', value: true },
    ],
  });
  const binding = { stylelintKey, cssOnly };
  let meta: CssRuleDefinition;
  if (implementation === 'external') {
    const externalPlugin = await select({
      message: 'Which package provides the rule?',
      choices: [
        { name: 'Stylelint core', value: 'stylelint' },
        { name: '@stylistic/stylelint-plugin', value: '@stylistic/stylelint-plugin' },
      ],
    });
    meta = { implementation, externalPlugin, bindings: [binding] };
  } else if (implementation === 'decorated') {
    const upstreamRule = await input({ message: 'Enter the Stylelint core rule to decorate' });
    // The scaffolder validates this key against the installed Stylelint version.
    meta = {
      implementation,
      bindings: [{ ...binding, upstreamRule: upstreamRule as keyof typeof stylelint.rules }],
    };
  } else {
    meta = { implementation, bindings: [binding] };
  }
  await createNewCssRule(sonarKey, meta);
  console.log(`
    NEXT STEPS:
    1. Add any parameters to meta.ts. Implement the rule and enable its generated tests.
    2. Refresh the CSS RSPEC data, then run npm run generate-java-rule-classes.
    3. Run npm run generate-meta after adding or changing rule integration metadata.
    See packages/analysis/src/css/rules/README.md for the CSS authoring workflow.
  `);
} else {
  const eslintId = await input({ message: 'Enter the ESLint ID for the rule' });
  verifyRuleName(eslintId);
  const scope = await select({
    message: 'What code does the rule target?',
    choices: [{ value: 'Main' }, { value: 'Tests' }],
  });
  const languages = await checkbox({
    message: 'What languages will the rule support?',
    choices: [
      { value: 'js', checked: true },
      { value: 'ts', checked: true },
    ],
    required: true,
  });
  const hasSecondaries = await select({
    message: 'Will the rule produce secondary locations?',
    choices: [
      { value: true, name: 'Yes' },
      { value: false, name: 'No' },
    ],
  });
  await createNewRule(sonarKey, eslintId, implementation, languages, scope, hasSecondaries);
}
