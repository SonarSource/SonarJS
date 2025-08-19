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
import { ruleRegex, verifyRuleName } from './helpers.js';
import { createNewRule } from './create-rule-boilerplate.js';

const sonarKey = await input({ message: 'Enter the Sonar key for the new rule (SXXXX)' });
const eslintId = await input({ message: 'Enter the ESLint ID for the rule' });
const scope = (await select({
  message: 'What code does the rule target?',
  choices: [
    {
      value: 'Main',
    },
    {
      value: 'Tests',
    },
  ],
})) satisfies 'Main' | 'Tests';
const implementation = (await select({
  message: 'Origin of the rule',
  choices: [
    {
      name: 'Sonar pure implementation',
      value: 'original',
    },
    {
      name: 'External rule to be used directly',
      value: 'external',
    },
    {
      name: 'Rule will decorate an external rule',
      value: 'decorated',
    },
  ],
})) satisfies 'original' | 'external' | 'decorated';
const languages = (await checkbox({
  message: 'What languages will the rule support?',
  choices: [
    {
      value: 'js',
      checked: true,
    },
    {
      value: 'ts',
      checked: true,
    },
  ],
  required: true,
})) satisfies ('js' | 'ts')[];
const hasSecondaries = await select({
  message: 'Will the rule produce secondary locations?',
  choices: [
    {
      value: true,
      name: 'Yes',
    },
    {
      value: false,
      name: 'No',
    },
  ],
});

function verifyRspecId(sonarKey: string) {
  if (!ruleRegex.exec(sonarKey)) {
    throw new Error(`Invalid rspec key: it should match ${ruleRegex}, but got "${sonarKey}"`);
  }
}

verifyRspecId(sonarKey);
verifyRuleName(eslintId);

await createNewRule(sonarKey, eslintId, implementation, languages, scope, hasSecondaries);
