/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
import { extractComments } from './comments.js';
import {
  Location,
  extractLocations,
  PrimaryLocation,
  SecondaryLocation,
  isLocationLine,
} from './locations.js';
import { extractQuickFixes, isQuickfixLine, QuickFix } from './quickfixes.js';
import { LineIssues, extractLineIssues, isNonCompliantLine } from './issues.js';

export class FileIssues {
  public readonly expectedIssues = new Map<number, LineIssues>();
  public readonly quickfixes = new Map<string, QuickFix>();
  private orphanSecondaryLocations: SecondaryLocation[] = [];
  private currentPrimary: PrimaryLocation | null = null;

  /**
   * Parses the file into its expected errors. Throws if error flags are not well formatted.
   * @param fileContent
   * @param filePath
   */
  constructor(fileContent: string, filePath: string) {
    const comments = extractComments(fileContent, filePath);
    for (const comment of comments) {
      if (isNonCompliantLine(comment.value)) {
        extractLineIssues(this, comment);
      } else if (isLocationLine(comment.value)) {
        extractLocations(this, comment);
      } else if (isQuickfixLine(comment.value)) {
        extractQuickFixes(this.quickfixes, comment);
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

  public addLocation(location: Location, line?: number) {
    if (location instanceof PrimaryLocation) {
      this.addPrimary(location, line);
    } else {
      this.addSecondary(location as SecondaryLocation);
    }
  }

  private addPrimary(primary: PrimaryLocation, line?: number) {
    const lineIssues = this.expectedIssues.get(primary.range?.line || line);
    if (lineIssues === undefined) {
      throw new Error(
        `Primary location does not have a related issue at ${primary.range.toString()}`,
      );
    }
    if (!lineIssues.primaryLocation?.range && primary.range) {
      primary = {
        ...lineIssues.primaryLocation,
        range: primary.range,
      };
    }
    this.orphanSecondaryLocations.forEach(secondary => primary.secondaryLocations.push(secondary));
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
      this.currentPrimary.secondaryLocations.push(secondary);
    } else {
      this.orphanSecondaryLocations.push(secondary);
    }
  }
}
