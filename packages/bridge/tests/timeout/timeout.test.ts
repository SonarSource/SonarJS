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
import { Timeout } from '../../src/timeout/timeout.js';
import { describe, it, mock } from 'node:test';
import assert from 'node:assert';

describe('timeout', () => {
  it('should start the timeout', () => {
    mock.timers.enable({ apis: ['setTimeout'] });

    const fn = mock.fn();
    const timeout = new Timeout(fn, 0);
    timeout.start();

    mock.timers.tick(1);

    assert(fn.mock.calls.length > 0);
  });

  it('should stop the timeout', () => {
    const fn = mock.fn();
    const timeout = new Timeout(fn, 10_000);
    timeout.start();
    timeout.stop();

    assert(fn.mock.calls.length === 0);
  });
});
