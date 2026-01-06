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
import { join } from 'node:path/posix';
import { pathToFileURL } from 'node:url';
import type { Rule } from 'eslint';
import * as rules from '../packages/jsts/src/rules/rules.js';
import { getRspecMeta, RULES_FOLDER } from './helpers.js';

type RuleMeta = {
  quickFixMessage?: string;
};

const errors: string[] = [];

console.log('Validating quickfix configuration...\n');

for (const [sonarKey, rule] of Object.entries(rules) as [string, Rule.RuleModule][]) {
  const rspecMeta = await getRspecMeta(sonarKey, {});

  // Load rule meta.ts for quickFixMessage
  const metaFile = pathToFileURL(join(RULES_FOLDER, sonarKey, 'meta.ts')).toString();
  let ruleMeta: RuleMeta = {};
  try {
    ruleMeta = await import(metaFile);
  } catch {
    // meta.ts might not exist for all rules
  }

  const rspecHasQuickfix = rspecMeta.quickfix === 'covered';
  const ruleHasFixable = !!rule.meta?.fixable;
  const ruleHasSuggestions = !!rule.meta?.hasSuggestions;
  const ruleHasQuickfixCapability = ruleHasFixable || ruleHasSuggestions;

  // Validation 1: RSPEC says quickfix but rule doesn't implement it
  if (rspecHasQuickfix && !ruleHasQuickfixCapability) {
    errors.push(
      `${sonarKey}: RSPEC declares quickfix='covered' but rule has neither fixable nor hasSuggestions`,
    );
  }

  // Validation 2: Rule implements fix/suggestion but RSPEC doesn't declare it
  if (ruleHasQuickfixCapability && !rspecHasQuickfix) {
    errors.push(
      `${sonarKey}: Rule has ${ruleHasFixable ? 'fixable' : 'hasSuggestions'} but RSPEC doesn't declare quickfix='covered'`,
    );
  }

  // Validation 3: Rule has fixable (auto-fix) but no quickFixMessage
  if (ruleHasFixable && !ruleMeta.quickFixMessage) {
    errors.push(`${sonarKey}: Rule is fixable but meta.ts doesn't export quickFixMessage`);
  }
}

if (errors.length > 0) {
  console.error('Quickfix validation failed:\n');
  for (const error of errors) {
    console.error(`  ✗ ${error}`);
  }
  console.error(`\n${errors.length} error(s) found.`);
  process.exit(1);
} else {
  console.log('✓ All quickfix configurations are valid.');
}
