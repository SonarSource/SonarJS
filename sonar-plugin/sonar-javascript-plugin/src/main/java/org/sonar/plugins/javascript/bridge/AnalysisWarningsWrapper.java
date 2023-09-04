/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2023 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
package org.sonar.plugins.javascript.bridge;

import javax.annotation.Nullable;
import org.sonar.api.notifications.AnalysisWarnings;
import org.sonar.api.scanner.ScannerSide;
import org.sonarsource.api.sonarlint.SonarLintSide;

@ScannerSide
@SonarLintSide(lifespan = SonarLintSide.MULTIPLE_ANALYSES)
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
