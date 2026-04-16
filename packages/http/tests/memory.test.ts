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
import { getAvailableMemory, getMemoryConfigurationMessages, logMemoryError } from '../src/memory.js';
import { describe, it, type Mock } from 'node:test';
import { expect } from 'expect';

describe('memory configuration', () => {
  it('should prefer docker memory limit when it is lower than host memory', () => {
    expect(getAvailableMemory(507675, 32768)).toEqual(32768);
  });

  it('should warn when node heap is higher than effective available memory', () => {
    expect(getMemoryConfigurationMessages(507675, 500192, 32768)).toEqual({
      infoMessage: 'Memory configuration: OS (507675 MB), Docker (32768 MB), Node.js (500192 MB).',
      warningMessage:
        'Node.js heap size limit 500192 is higher than available memory 32768. Check your configuration of sonar.javascript.node.maxspace',
    });
  });

  it('should not warn when node heap fits in available memory', () => {
    expect(getMemoryConfigurationMessages(8192, 4096)).toEqual({
      infoMessage: 'Memory configuration: OS (8192 MB), Node.js (4096 MB).',
      warningMessage: undefined,
    });
  });
});

describe('logMemoryError', () => {
  it('should log out-of-memory troubleshooting guide', ({ mock }) => {
    console.error = mock.fn(console.error);

    logMemoryError({ code: 'ERR_WORKER_OUT_OF_MEMORY' });

    const logs = (console.error as Mock<typeof console.error>).mock.calls.map(
      call => call.arguments[0],
    );
    expect(logs).toContainEqual(
      expect.stringContaining(
        'The analysis will stop due to the Node.js process running out of memory',
      ),
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

  it('should log default troubleshooting guide', ({ mock }) => {
    console.error = mock.fn(console.error);

    logMemoryError('something failed');

    const logs = (console.error as Mock<typeof console.error>).mock.calls.map(
      call => call.arguments[0],
    );
    expect(logs).toContain('The analysis will stop due to an unexpected error: something failed');
    expect(logs).toContain('Please report the issue at https://community.sonarsource.com');
  });
});
