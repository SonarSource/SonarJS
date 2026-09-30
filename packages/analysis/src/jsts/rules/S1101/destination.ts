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
const DUMMY_BASE = 'https://sonarjs-placeholder.invalid/';

export function normalizeDestination(href: string): string {
  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(href);
  const isProtocolRelative = href.startsWith('//');
  let url: URL;
  try {
    url = new URL(href, DUMMY_BASE);
  } catch {
    return href;
  }
  const scheme = hasScheme || isProtocolRelative ? normalizeScheme(url.protocol) : '';
  const authority = (hasScheme || isProtocolRelative) && url.host ? `//${url.host}` : '';
  const keepFragment = ROUTING_FRAGMENT_PATTERN.test(url.hash);
  return `${scheme}${authority}${url.pathname}${url.search}${keepFragment ? url.hash : ''}`;
}

function normalizeScheme(protocol: string): string {
  return protocol === 'https:' ? 'http:' : protocol;
}
