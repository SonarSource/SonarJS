/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import { error } from './logging.js';

type ErrorWithMessageAndStack = {
  message?: string;
  stack?: string;
};

export function handleError(err: unknown) {
  const normalizedError = normalizeError(err);
  const { message, stack } = normalizedError;
  if (stack) {
    error(stack);
  }
  return { error: message ?? 'Unexpected error' };
}

export function normalizeError(err: unknown): ErrorWithMessageAndStack {
  if (typeof err === 'object' && err !== null) {
    return err as ErrorWithMessageAndStack;
  }
  if (typeof err === 'string') {
    return { message: err };
  }
  return { message: 'Unexpected error' };
}
