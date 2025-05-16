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
import { describe, it, type Mock } from 'node:test';
import { ProgressReport } from '../../src/helpers/progress-report.js';
import { expect } from 'expect';

describe('progress-report', () => {
  it('should report progress', async ({ mock }) => {
    mock.timers.enable({ apis: ['setInterval'] });
    mock.method(console, 'log');
    const progressReport = new ProgressReport(5);
    const consoleLogMock = (console.log as Mock<typeof console.log>).mock;
    expect(consoleLogMock.calls[0].arguments[0]).toEqual(`5 source files to be analyzed`);
    expect(consoleLogMock.callCount()).toEqual(1);
    // we pass next file
    progressReport.nextFile('file1.ts');
    // passing next file should not trigger a console.log
    expect(consoleLogMock.callCount()).toEqual(1);

    // after INTERVAL - 1ms has passed, still no new log
    mock.timers.tick(ProgressReport.INTERVAL - 1);
    expect(consoleLogMock.callCount()).toEqual(1);

    // one more ms and the INTERVAL has passed, there is a new log
    mock.timers.tick(1);
    expect(consoleLogMock.calls[1].arguments[0]).toEqual(
      `1/5 file analyzed, current file: file1.ts`,
    );
    expect(consoleLogMock.callCount()).toEqual(2);

    // another INTERVAL, we should log next file
    mock.timers.tick(ProgressReport.INTERVAL);
    expect(consoleLogMock.calls[2].arguments[0]).toEqual(
      `1/5 file analyzed, current file: file1.ts`,
    );
    expect(consoleLogMock.callCount()).toEqual(3);

    // we stop the report, summary is logged
    progressReport.stop();
    expect(consoleLogMock.calls[3].arguments[0]).toEqual(`5/5 source files have been analyzed`);
    expect(consoleLogMock.callCount()).toEqual(4);
  });
});
