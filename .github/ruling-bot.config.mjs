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
import { defaults } from './actions/ruling_bot/config.mjs';

// Canonical SonarJS caller settings. generate-config.mjs owns their checked-in consumers.
export const rulingConfig = {
  ...defaults,
  'new-results-path': 'packages/ruling/actual',
  'old-results-path': 'its/ruling/src/test/resources/expected',
  'sources-repo-url': 'https://github.com/SonarSource/jsts-test-sources/blob/master',
  'rspec-base-url': 'https://musical-adventure-r9qk65j.pages.github.io/rspec/#',
  'results-artifact-name': 'actual_js_ts',
};
