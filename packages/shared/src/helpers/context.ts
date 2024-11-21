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
 * A container of contextual information
 *
 * @param workDir the working directory of the analyzed project
 * @param shouldUseTypeScriptParserForJS a flag for parsing JavaScript code with TypeScript ESLint parser
 * @param sonarlint a flag for indicating whether the bridge is used in SonarLint context
 * @param bundles a set of rule bundles to load
 */
export interface Context {
  workDir: string;
  shouldUseTypeScriptParserForJS: boolean;
  sonarlint: boolean;
  debugMemory?: boolean;
  bundles: string[];
}

/**
 * The global context
 *
 * It is available anywhere within the bridge as well as in
 * external and custom rules provided their definition sets
 * the `sonar-context` internal parameter.
 */
let context: Context;

/**
 * Returns the global context
 * @returns the global context
 */
export function getContext(): Context {
  return context;
}

/**
 * Sets the global context
 * @param ctx the new global context
 */
export function setContext(ctx: Context) {
  context = { ...ctx };
}
