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

const PRESENTATION_ROLES = new Set(['presentation', 'none']);
const LAYOUT_CONTAINER_ELEMENTS = new Set(['div', 'span', 'ul', 'li']);

export function isPresentationalLayoutContainer(elementName: string | null, role: string): boolean {
  return (
    elementName !== null &&
    PRESENTATION_ROLES.has(role) &&
    LAYOUT_CONTAINER_ELEMENTS.has(elementName)
  );
}
