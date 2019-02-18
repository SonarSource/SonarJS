/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2018 SonarSource SA
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
package org.sonar.plugins.javascript;

import org.sonar.api.batch.InstantiationStrategy;
import org.sonar.api.batch.ScannerSide;
import org.sonar.api.notifications.AnalysisWarnings;

/**
 * Wrap an AnalysisWarnings instance, available since SQ API 7.4.
 * Do not load this class on older runtimes.
 * Drop this class when the minimum supported version of SonarQube API reaches 7.4.
 */
@ScannerSide
@InstantiationStrategy("PER_BATCH")
public class AnalysisWarningsWrapper {
  private final AnalysisWarnings analysisWarnings;

  public AnalysisWarningsWrapper(AnalysisWarnings analysisWarnings) {
    this.analysisWarnings = analysisWarnings;
  }

  public void addUnique(String text) {
    this.analysisWarnings.addUnique(text);
  }

}
