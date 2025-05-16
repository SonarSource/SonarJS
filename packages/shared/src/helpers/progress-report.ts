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
 * Logs the current file being analyzed every 10 seconds
 */

export class ProgressReport {
  private counter = 0;
  private currentFilename = '';
  public static readonly INTERVAL = 10_000;
  private intervalId: NodeJS.Timeout | undefined = undefined;

  constructor(private readonly total: number) {
    info(`${this.total} source ${this.pluralizeFile(this.total)} to be analyzed`);
  }

  pluralizeFile(count: number) {
    return count === 1 ? 'file' : 'files';
  }

  start() {
    this.intervalId = setInterval(() => {
      info(
        `${this.counter}/${this.total} ${this.pluralizeFile(this.counter)} analyzed, current file: ${this.currentFilename}`,
      );
    }, ProgressReport.INTERVAL);
  }

  nextFile(currentFilename: string) {
    this.counter++;
    this.currentFilename = currentFilename;
    if (!this.intervalId) {
      this.start();
    }
  }

  stop() {
    clearInterval(this.intervalId);
    info(
      `${this.total}/${this.total} source ${this.pluralizeFile(this.total)} ${this.total === 1 ? 'has' : 'have'} been analyzed`,
    );
  }
}
