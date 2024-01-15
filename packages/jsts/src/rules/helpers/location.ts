/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
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
import { TSESTree } from '@typescript-eslint/utils';
import { EncodedMessage, IssueLocation } from 'eslint-plugin-sonarjs/lib/utils/locations';

export type LocationHolder = AST.Token | TSESTree.Node | estree.Node | { loc: AST.SourceLocation };

/**
 * Encodes an ESLint descriptor message with secondary locations
 *
 * The encoding consists in stringifying a JavaScript object with
 * `JSON.stringify` that includes the ESLint's descriptor message
 * along with second location information: message and location.
 *
 * This encoded message is eventually decoded by the linter wrapper
 * on the condition that the rule definition of the flagged problem
 * defines the internal `sonar-runtime` parameter in its schema.
 *
 * @param message the ESLint descriptor message
 * @param secondaryLocationsHolder the secondary locations
 * @param secondaryMessages the messages for each secondary location
 * @param cost the optional cost to fix
 * @returns the encoded message with secondary locations
 */
export function toEncodedMessage(
  message: string,
  secondaryLocationsHolder: Array<LocationHolder> = [],
  secondaryMessages?: (string | undefined)[],
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
