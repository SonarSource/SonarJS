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
 * Prints a message to `stdout` like `console.log` by prefixing it with `DEBUG`.
 *
 * The `DEBUG` prefix is recognized by the scanner, which
 * will show the logged message in the scanner debug logs.
 *
 * @param message the message to log
 */
export function debug(message: string) {
  console.log(`DEBUG ${message}`);
}

export function error(message: string) {
  console.error(message);
}

export function info(message: string) {
  console.log(message);
}

export function warn(message: string) {
  console.log(`WARN ${message}`);
}
