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
package org.sonar.plugins.javascript.eslint;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.utils.TempFolder;
import org.sonar.plugins.javascript.utils.ProgressReport;

abstract class AbstractAnalysis {

  static final String PROGRESS_REPORT_TITLE = "Progress of TypeScript analysis";
  static final long PROGRESS_REPORT_PERIOD = TimeUnit.SECONDS.toMillis(10);

  final EslintBridgeServer eslintBridgeServer;
  final Monitoring monitoring;
  final AnalysisProcessor analysisProcessor;
  SensorContext context;
  ContextUtils contextUtils;
  AbstractChecks checks;
  ProgressReport progressReport;
  AnalysisMode analysisMode;
  TempFolder tempFolder;

  AbstractAnalysis(
    EslintBridgeServer eslintBridgeServer,
    Monitoring monitoring,
    AnalysisProcessor analysisProcessor
  ) {
    this.eslintBridgeServer = eslintBridgeServer;
    this.monitoring = monitoring;
    this.analysisProcessor = analysisProcessor;
  }

  void initialize(
    SensorContext context,
    AbstractChecks checks,
    AnalysisMode analysisMode,
    TempFolder tempFolder
  ) {
    this.context = context;
    contextUtils = new ContextUtils(context);
    this.checks = checks;
    this.analysisMode = analysisMode;
    this.tempFolder = tempFolder;
  }

  abstract void analyzeFiles(List<InputFile> inputFiles) throws IOException;
}
