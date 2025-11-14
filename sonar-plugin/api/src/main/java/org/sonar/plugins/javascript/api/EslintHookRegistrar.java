/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.api;

import org.sonar.api.scanner.ScannerSide;

/**
 * This class can be extended to provide ESLint hooks to be executed on the JS side during analysis.
 *
 * <pre>
 *   {@code
 *     public void register(RegistrarContext registrarContext) {
 *       registrarContext.registerEslintHook(Language.JAVASCRIPT, jsHook);
 *       registrarContext.registerEslintHook(Language.TYPESCRIPT, tsHook);
 *     }
 *   }
 * </pre>
 */
@ScannerSide
public interface EslintHookRegistrar {
  /**
   * This method is called on the server side and during an analysis to register ESLint hooks.
   */
  void register(RegistrarContext registrarContext);

  interface RegistrarContext {
    /**
     * Registers an ESLint hook to be executed on the JS side if enabled.
     *
     * @param language language for which to execute the hook
     * @param hook ESLint hook
     */
    void registerEslintHook(Language language, EslintHook hook);
  }
}
