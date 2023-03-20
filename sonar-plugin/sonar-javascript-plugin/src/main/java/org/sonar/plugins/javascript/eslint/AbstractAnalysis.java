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

  // eventually it would be possible to remove this field, it's only needed because we analyze JS and TS in two different sensors
  // to avoid the files to be analyzed by both sensors. With single sensor we won't have this problem
  protected String language;

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
    String language
  ) {
    this.context = context;
    contextUtils = new ContextUtils(context);
    this.checks = checks;
    this.analysisMode = analysisMode;
    this.language = language;
  }

  abstract void analyzeFiles(List<InputFile> inputFiles, List<String> tsConfigs) throws IOException;
}
