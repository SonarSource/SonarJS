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
import { buildSourceCode } from 'parser';
import { extractLineIssues } from './comments';
import { Location, extractLocations, PrimaryLocation, SecondaryLocation } from './locations';
import { SourceCode } from 'eslint';
import * as estree from 'estree';

export class FileIssues {
  private readonly expectedIssues = new Map<number, LineIssues>();
  private orphanSecondaryLocations: SecondaryLocation[] = [];
  private currentPrimary: PrimaryLocation | null = null;

  /**
   * Parses the file into its expected errors. Throws if error flags are not well formated.
   * @param fileContent
   */
  constructor(fileContent: string) {
    const parsed = buildSourceCode(
      { fileContent, filePath: '', fileType: null, tsConfigs: [] },
      null,
    );
    let esTreeComments: estree.Comment[];
    if (parsed instanceof SourceCode) {
      esTreeComments = parsed.getAllComments();
    } else {
      throw Error(`File not parseable: ${fileContent}`);
    }
    const comments = esTreeComments.map(c => {
      return {
        value: c.value,
        line: c.loc.start.line,
        column: c.loc.start.column + 2, // these offsets are everywhere down the road
        endLine: c.loc.end.line,
        endColumn: c.loc.end.column + 1, // same
      };
    });
    for (const comment of comments) {
      const lineIssues = extractLineIssues(comment);
      if (lineIssues !== null) {
        const existingLineIssues = this.expectedIssues.get(lineIssues.line);
        if (existingLineIssues) {
          existingLineIssues.merge(lineIssues);
        } else {
          this.expectedIssues.set(lineIssues.line, lineIssues);
        }
      } else {
        const locations = extractLocations(comment.line, comment.column, comment.value);
        for (const location of locations) {
          this.addLocation(location);
        }
      }
    }
  }

  getExpectedIssues(): LineIssues[] {
    if (this.orphanSecondaryLocations.length !== 0) {
      throw new Error(
        this.orphanSecondaryLocations
          .map(
            secondary =>
              `Secondary location '>' without next primary location at ${secondary.range.toString()}`,
          )
          .join('\n\n'),
      );
    }
    return [...this.expectedIssues.values()];
  }

  private addLocation(location: Location) {
    if (location instanceof PrimaryLocation) {
      this.addPrimary(location);
    } else {
      this.addSecondary(location as SecondaryLocation);
    }
  }

  private addPrimary(primary: PrimaryLocation) {
    const lineIssues = this.expectedIssues.get(primary.range.line);
    if (lineIssues === undefined) {
      throw new Error(
        `Primary location does not have a related issue at ${primary.range.toString()}`,
      );
    }
    if (lineIssues.primaryLocation !== null) {
      throw new Error(
        `Primary location conflicts with another primary location at ${primary.range.toString()}`,
      );
    }
    this.orphanSecondaryLocations.forEach(secondary =>
      FileIssues.addSecondaryTo(secondary, primary),
    );
    this.orphanSecondaryLocations = [];
    lineIssues.primaryLocation = primary;
    this.currentPrimary = primary;
  }

  private addSecondary(secondary: SecondaryLocation) {
    if (secondary.primaryIsBefore) {
      if (this.currentPrimary == null) {
        throw new Error(
          `Secondary location '<' without previous primary location at ${secondary.range.toString()}`,
        );
      }
      FileIssues.addSecondaryTo(secondary, this.currentPrimary);
    } else {
      this.orphanSecondaryLocations.push(secondary);
    }
  }

  private static addSecondaryTo(secondary: SecondaryLocation, primary: PrimaryLocation) {
    primary.secondaryLocations.push(secondary);
  }
}

export class LineIssues {
  public primaryLocation: PrimaryLocation | null;
  constructor(
    readonly line: number,
    readonly messages: string[],
    primaryLocation: PrimaryLocation | null = null,
  ) {
    this.primaryLocation = primaryLocation;
  }

  merge(other: LineIssues) {
    this.messages.push(...other.messages);
    if (this.primaryLocation == null) {
      this.primaryLocation = other.primaryLocation;
    }
  }
}
