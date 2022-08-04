/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import * as estree from 'estree';
import { AST } from 'eslint';
import { TSESTree } from '@typescript-eslint/experimental-utils';
import { EncodedMessage, IssueLocation } from 'eslint-plugin-sonarjs/lib/utils/locations';

export type LocationHolder = AST.Token | TSESTree.Node | estree.Node | { loc: AST.SourceLocation };

export function toEncodedMessage(
  message: string,
  secondaryLocationsHolder: Array<LocationHolder> = [],
  secondaryMessages: (string | undefined)[] = [],
  cost?: number,
): string {
  const encodedMessage: EncodedMessage = {
    message,
    cost,
    secondaryLocations: secondaryLocationsHolder.map((locationHolder, index) =>
      toSecondaryLocation(
        locationHolder,
        !!secondaryMessages ? secondaryMessages[index] : undefined,
      ),
    ),
  };
  return JSON.stringify(encodedMessage);
}

function toSecondaryLocation(locationHolder: LocationHolder, message?: string): IssueLocation {
  if (!locationHolder.loc) {
    throw new Error('Invalid secondary location');
  }
  return {
    message,
    column: locationHolder.loc.start.column,
    line: locationHolder.loc.start.line,
    endColumn: locationHolder.loc.end.column,
    endLine: locationHolder.loc.end.line,
  };
}
