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
import { generateMetaForRule, listRulesDir } from './helpers.js';

/**
 * Generate packages/jsts/src/rules/SXXXX/generated-meta.ts on each rule
 * with data coming from the RSPEC json files. This data fills in the Rule ESLint metadata
 * as well as the JSON schema files available in
 * "sonar-plugin/javascript-checks/src/main/resources/org/sonar/l10n/javascript/rules/javascript/schemas"
 */
for (const file of await listRulesDir()) {
  await generateMetaForRule(file);
}

await import('./generate-rule-indexes.js');
