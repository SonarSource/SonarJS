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
package org.sonar.plugins.javascript.api;

import org.sonar.api.scanner.ScannerSide;
import org.sonarsource.api.sonarlint.SonarLintSide;

/**
 * Implementations of this interface will be invoked during the analysis of JavaScript/TypeScript files.
 *
 */
@ScannerSide
@SonarLintSide
public interface JsAnalysisConsumer {

  /**
   * Called for each file during the analysis.
   * @param jsFile the file which was analyzed
   */
  void accept(JsFile jsFile);

  /**
   *
   * Called at the end of the analysis.
   */
  void doneAnalysis();
}
