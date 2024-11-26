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
package org.sonar.plugins.javascript.bridge;

import javax.annotation.Nullable;
import org.sonar.api.notifications.AnalysisWarnings;
import org.sonar.api.scanner.ScannerSide;
import org.sonarsource.api.sonarlint.SonarLintSide;

@ScannerSide
@SonarLintSide(lifespan = SonarLintSide.INSTANCE)
public class AnalysisWarningsWrapper {

  private final AnalysisWarnings analysisWarnings;

  /**
   * This constructor is used when {@link AnalysisWarnings} is not available, e.g. SonarLint
   */
  public AnalysisWarningsWrapper() {
    this.analysisWarnings = null;
  }

  public AnalysisWarningsWrapper(@Nullable AnalysisWarnings analysisWarnings) {
    this.analysisWarnings = analysisWarnings;
  }

  public void addUnique(String text) {
    if (analysisWarnings != null) {
      analysisWarnings.addUnique(text);
    }
  }
}
