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
/**
 * Wrapper of Node.js timeout.
 *
 * The purpose of this wrapper is to rely on a single reference of Node.js timeout,
 * start the timeout to execute a function at a given delay, and stop it on demand.
 */
export class Timeout {
  private timeout: NodeJS.Timeout | null = null;

  /**
   * Builds a wrapper of Node.js timeout.
   * @param f the function to be executed after the timer expires.
   * @param delay The time in milliseconds that the timer should wait.
   */
  constructor(
    private readonly f: () => void,
    private readonly delay: number,
  ) {}

  /**
   * Starts the timeout.
   */
  start() {
    this.stop();
    this.timeout = setTimeout(this.f, this.delay);
  }

  /**
   * Stops the timeout.
   */
  stop() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}
