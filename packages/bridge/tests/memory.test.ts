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
import { logMemoryError } from '../src/memory.ts';

describe('logMemoryError', () => {
  it('should log out-of-memory troubleshooting guide', () => {
    console.error = jest.fn();

    logMemoryError({ code: 'ERR_WORKER_OUT_OF_MEMORY' });

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining(
        `The analysis will stop due to the Node\.js process running out of memory`,
      ),
    );
    expect(console.error).toHaveBeenCalledWith(
      'You can see how Node.js heap usage evolves during analysis with "sonar.javascript.node.debugMemory=true"',
    );
    expect(console.error).toHaveBeenCalledWith(
      'Try setting "sonar.javascript.node.maxspace" to a higher value to increase Node.js heap size limit',
    );
    expect(console.error).toHaveBeenCalledWith(
      'If the problem persists, please report the issue at https://community.sonarsource.com',
    );
  });

  it('should log default troubleshooting guide', () => {
    console.error = jest.fn();

    logMemoryError('something failed');

    expect(console.error).toHaveBeenCalledWith(
      'The analysis will stop due to an unexpected error: something failed',
    );
    expect(console.error).toHaveBeenCalledWith(
      'Please report the issue at https://community.sonarsource.com',
    );
  });
});
