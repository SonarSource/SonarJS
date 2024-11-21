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
import { setContext, getContext } from '../../src/helpers/context.js';
import { describe, it, beforeEach } from 'node:test';
import { expect } from 'expect';

describe('context', () => {
  const initialCtx = {
    workDir: '/',
    shouldUseTypeScriptParserForJS: false,
    sonarlint: false,
    bundles: [],
  };

  beforeEach(() => {
    setContext(initialCtx);
  });

  it('should get context', () => {
    expect(getContext()).toEqual(initialCtx);
  });

  it('should set context', () => {
    const newContext = {
      workDir: '/tmp/workdir',
      shouldUseTypeScriptParserForJS: true,
      sonarlint: true,
      bundles: ['custom-rule'],
    };
    setContext(newContext);
    expect(getContext()).toEqual(newContext);
  });
});
