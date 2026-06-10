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
function normalizeRuleKey(key: string): string {
  const trimmed = key.trim();
  if (/^RSPEC-\d+$/.test(trimmed)) {
    return trimmed.replace(/^RSPEC-/, 'S');
  }
  if (/^S\d+$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d+$/.test(trimmed)) {
    return `S${trimmed}`;
  }
  throw new Error(`Wrong replacement rule key format: '${key}'. Expected S###, RSPEC-###, or ###.`);
}

/**
 * Keep deprecated/closed/superseded post-processing equivalent to the previous
 * rspec-maven-plugin + sonar-rule-api generation path.
 */
export function generateDeprecatedSectionAndCorrectStatus(
  langSq: string,
  metadata: Record<string, unknown>,
): string {
  const status = String(metadata.status ?? '').toLowerCase();
  const extra = metadata.extra as Record<string, unknown> | undefined;
  const replacements = extra?.replacementRules;

  if (status === 'closed' && !Array.isArray(replacements)) {
    metadata.status = 'deprecated';
    return '<p>This rule is deprecated, and will eventually be removed.</p>\n';
  }

  if (!['closed', 'deprecated', 'superseded'].includes(status) || !Array.isArray(replacements)) {
    return '';
  }

  let noReplacementDrafted = true;
  const replacementRules: string[] = [];

  for (const replacementRule of replacements) {
    noReplacementDrafted = false;
    const replacementRuleId = normalizeRuleKey(String(replacementRule));
    replacementRules.push(`{rule:${langSq}:${replacementRuleId}}`);
  }

  if (replacementRules.length === 0) {
    metadata.status = 'deprecated';
    if (noReplacementDrafted) {
      return '<p>This rule is deprecated, and will eventually be removed.</p>\n';
    }
    metadata.status = 'ready';
    return '';
  }

  metadata.status = 'deprecated';
  return `<p>This rule is deprecated; use ${replacementRules.join(', ')} instead.</p>\n`;
}
