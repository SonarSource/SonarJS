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

/**
 * Keys of stylelint rules that are only appropriate for plain CSS.
 *
 * These rules must not run on scss/sass/less files, and must not report
 * issues from non-CSS embedded blocks (e.g. <style lang="scss">) inside
 * HTML or Vue files.
 *
 * Routing (config.ts): rules in this set are enabled only for **\/*.css and
 * HTML/Vue overrides — never for scss/sass/less overrides.
 *
 * Filtering (transform.ts): warnings produced on HTML/Vue files are dropped
 * when the offending position falls inside a non-CSS embedded block.
 *
 * Each CSS-only rule branch adds its stylelint key here.
 */
export const cssOnlyRuleKeys = new Set<string>(['at-rule-descriptor-value-no-unknown']);
