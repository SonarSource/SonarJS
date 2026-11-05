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

import identifierUrls from '@sonarsource/analyzer-commons-configurations/identifier-urls.json' with { type: 'json' };

// The inventory is maintained in Analyzer Commons; keep the matching semantics aligned.
// A match identifies a possible identifier; the caller must also check its use in the AST.
const IDENTIFIER_URLS = new Map<string, RegExp>(
  Object.entries<string>(identifierUrls).map(([domain, pattern]) => [domain, new RegExp(pattern)]),
);

/**
 * The Commons npm package shares the inventory as JSON. Its Java matcher,
 * CleartextProtocolFilter.isKnownIdentifier(), is not exposed through that package.
 * SonarJS therefore performs URL parsing and regex matching here in Node.js using the shared data.
 */
export function isKnownIdentifierUrl(value: string): boolean {
  // Do not use URL.hostname (drops ports), URL.host (normalizes :80), or a lowercased
  // URL (changes identifier spelling). Only the authority is case-insensitive.
  const match = /^http:\/\/([^\s/?#\\]+)([/?#][^\s\\]*)?$/i.exec(value);
  if (!match) {
    return false;
  }
  const remainder = match[2] ?? '';
  const suffix = remainder.startsWith('/') ? remainder : `/${remainder}`;
  return IDENTIFIER_URLS.get(match[1].toLowerCase())?.test(suffix) === true;
}
