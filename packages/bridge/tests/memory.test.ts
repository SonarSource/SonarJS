/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
