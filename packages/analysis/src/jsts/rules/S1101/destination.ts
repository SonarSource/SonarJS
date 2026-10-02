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

const ROUTING_FRAGMENT_PATTERN = /^#[!/]/;
// Two placeholder bases differing only in host: an href that carries its own scheme or authority
// resolves to the same host against both, while a relative one inherits each base's own host.
const DUMMY_BASE_A = 'https://sonarjs-placeholder-a.invalid/';
const DUMMY_BASE_B = 'https://sonarjs-placeholder-b.invalid/';

export function normalizeDestination(href: string): string {
  const url = parseUrl(href, DUMMY_BASE_A);
  const otherUrl = parseUrl(href, DUMMY_BASE_B);
  if (!url || !otherUrl) {
    return href;
  }
  // Asks the URL parser itself, so leading whitespace, `\\host` and the like are handled per WHATWG.
  const isBaseIndependent = url.host === otherUrl.host;
  const scheme = isBaseIndependent ? normalizeScheme(url.protocol) : '';
  const authority = isBaseIndependent && url.host ? `//${url.host}` : '';
  const keepFragment = ROUTING_FRAGMENT_PATTERN.test(url.hash);
  return `${scheme}${authority}${url.pathname}${url.search}${keepFragment ? url.hash : ''}`;
}

function parseUrl(href: string, base: string): URL | undefined {
  try {
    return new URL(href, base);
  } catch {
    return undefined;
  }
}

function normalizeScheme(protocol: string): string {
  return protocol === 'https:' ? 'http:' : protocol;
}
