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

import exclusions from '@sonarsource/analyzer-commons-configurations/cleartext-protocol-exclusions.json' with { type: 'json' };

export const CLEARTEXT_PROTOCOLS: readonly string[] = exclusions.cleartextProtocols;

const HOST_PATTERNS = Object.values(exclusions.hostPatterns).map(
  pattern => new RegExp(pattern, exclusions.match.hostPatterns.caseInsensitive ? 'i' : ''),
);
const SAFE_URL_PREFIXES = exclusions.safeUrlPrefixes.map(prefix =>
  exclusions.match.safeUrlPrefixes.caseInsensitive ? prefix.toLowerCase() : prefix,
);

// Extract the raw authority, skipping user information, even when a URL contains placeholders.
// The explicit whitespace characters match Java's default \s.
const CLEARTEXT_AUTHORITY = new RegExp(
  String.raw`^(?:${CLEARTEXT_PROTOCOLS.map(protocol => protocol.replace('://', '')).join('|')}):\/\/(?:[^@\t\n\v\f\r /?#]*@)?([^\t\n\v\f\r /?#]+)`,
  'i',
);

// Commons calls String.strip(), whose whitespace definition differs from JavaScript's trim().
const JAVA_WHITESPACE =
  /[\t-\r\u001c-\u0020\u1680\u2000-\u2006\u2008-\u200a\u2028\u2029\u205f\u3000]/;
const JAVA_MAX_INTEGER = 2_147_483_647;

/** Applies the Commons exclusions in Node.js; the npm package supplies data, not its Java matcher. */
export function isSafeWithoutTls(value: string): boolean {
  const stripped = stripJavaWhitespace(value);
  const lower = stripped.toLowerCase();
  const prefixTarget = exclusions.match.safeUrlPrefixes.caseInsensitive ? lower : stripped;
  if (
    !CLEARTEXT_PROTOCOLS.some(protocol => lower.startsWith(protocol)) ||
    SAFE_URL_PREFIXES.some(prefix => prefixTarget.startsWith(prefix))
  ) {
    return true;
  }

  const match = CLEARTEXT_AUTHORITY.exec(stripped);
  if (!match) {
    return false;
  }
  const authority = match[1];
  if (HOST_PATTERNS.some(pattern => pattern.test(authority))) {
    return true;
  }

  // Commons validates the complete authority separately: malformed paths do not disable this exemption.
  const rawAuthority = stripped.split('://', 2)[1].split(/[/?#]/, 1)[0];
  const singleLabel = /^(?:[^@]*@)?([a-z\d](?:[a-z\d-]*[a-z\d])?)(?::(\d*))?$/i.exec(rawAuthority);
  return (
    singleLabel !== null &&
    !/^(?:\d+|0x[\da-f]+)$/i.test(singleLabel[1]) &&
    Number(singleLabel[2] ?? 0) <= JAVA_MAX_INTEGER &&
    !/[\p{Cc}\p{Z}<>"\\^`{|}]|%(?![\da-f]{2})/iu.test(rawAuthority) &&
    !/[[\]]/.test(rawAuthority)
  );
}

export function stripJavaWhitespace(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && JAVA_WHITESPACE.test(value[start])) {
    start++;
  }
  while (end > start && JAVA_WHITESPACE.test(value[end - 1])) {
    end--;
  }
  return value.slice(start, end);
}
