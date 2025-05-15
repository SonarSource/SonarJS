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
import { info } from './logging.js';

/**
 * Logs the current file being analyzed every N seconds
 *
 * @param interval the interval between two logs, in milliseconds
 */

export class ProgressReport {
  private currentFileNumber = 0;
  private currentFilename = '';
  private intervalId: NodeJS.Timeout | undefined = undefined;

  constructor(
    private readonly count: number,
    private readonly interval: number = 10_000,
  ) {
    info(`${this.count} source ${this.pluralizeFile(this.count)} to be analyzed.`);
  }

  pluralizeFile(count: number) {
    return count === 1 ? 'file' : 'files';
  }

  start() {
    this.intervalId = setInterval(() => {
      info(
        `${this.currentFileNumber}/${this.count} ${this.pluralizeFile(this.currentFileNumber)} analyzed, current file: ${this.currentFilename}`,
      );
    }, this.interval);
  }

  nextFile(currentFilename: string) {
    this.currentFileNumber++;
    this.currentFilename = currentFilename;
    if (!this.intervalId) {
      this.start();
    }
  }

  stop() {
    clearInterval(this.intervalId);
    info(
      `${this.count}/${this.count} source ${this.pluralizeFile(this.count)} ${this.count === 1 ? 'has' : 'have'} been analyzed.`,
    );
  }

  cancel() {
    clearInterval(this.intervalId);
  }
}
