/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
import { logMemoryError } from '../src/memory.js';
import { describe, it, mock, Mock } from 'node:test';
import { expect } from 'expect';

describe('logMemoryError', () => {
  it('should log out-of-memory troubleshooting guide', () => {
    console.error = mock.fn();

    logMemoryError({ code: 'ERR_WORKER_OUT_OF_MEMORY' });

    const logs = (console.error as Mock<typeof console.error>).mock.calls.map(
      call => call.arguments[0],
    );
    expect(logs).toContain(
      'You can see how Node.js heap usage evolves during analysis with "sonar.javascript.node.debugMemory=true"',
    );

    expect(logs).toContain(
      'You can see how Node.js heap usage evolves during analysis with "sonar.javascript.node.debugMemory=true"',
    );
    expect(logs).toContain(
      'Try setting "sonar.javascript.node.maxspace" to a higher value to increase Node.js heap size limit',
    );
    expect(logs).toContain(
      'If the problem persists, please report the issue at https://community.sonarsource.com',
    );
  });

  it('should log default troubleshooting guide', () => {
    console.error = mock.fn();

    logMemoryError('something failed');

    const logs = (console.error as Mock<typeof console.error>).mock.calls.map(
      call => call.arguments[0],
    );
    expect(logs).toContain('The analysis will stop due to an unexpected error: something failed');
    expect(logs).toContain('Please report the issue at https://community.sonarsource.com');
  });
});
