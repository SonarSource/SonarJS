/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
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
package org.sonar.plugins.javascript.analysis;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.plugins.javascript.bridge.AnalysisWarningsWrapper;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.sonarlint.TsConfigCache;
import org.sonar.plugins.javascript.utils.ProgressReport;
import org.sonarsource.api.sonarlint.SonarLintSide;

@SonarLintSide
public class AnalysisWithWatchProgram extends AbstractAnalysis {

  TsConfigCache tsConfigCache;

  public AnalysisWithWatchProgram(
    BridgeServer bridgeServer,
    AnalysisProcessor analysisProcessor,
    AnalysisWarningsWrapper analysisWarnings,
    TsConfigCache tsConfigCache
  ) {
    super(bridgeServer, analysisProcessor, analysisWarnings);
    this.tsConfigCache = tsConfigCache;
  }

  @Override
  public List<BridgeServer.Issue> analyzeFiles(List<InputFile> inputFiles) throws IOException {
    var issues = new ArrayList<BridgeServer.Issue>();

    TsConfigProvider.initializeTsConfigCache(contextUtils, this::createTsConfigFile, tsConfigCache);
    boolean success = false;
    progressReport = new ProgressReport(PROGRESS_REPORT_TITLE, PROGRESS_REPORT_PERIOD);
    try {
      progressReport.start(inputFiles.size(), inputFiles.iterator().next().toString());
      for (InputFile inputFile : inputFiles) {
        var tsConfigFile = tsConfigCache.getTsConfigForInputFile(inputFile);
        issues.addAll(
          analyzeFile(
            inputFile,
            tsConfigFile == null ? List.of() : List.of(tsConfigFile.getFilename()),
            null,
            this.tsConfigCache.getAndResetShouldClearDependenciesCache()
          )
        );
      }
      success = true;
      if (analysisProcessor.parsingErrorFilesCount() > 0) {
        this.analysisWarnings.addUnique(
            String.format(
              "There were parsing errors in %d files while analyzing the project. Check the logs for further details.",
              analysisProcessor.parsingErrorFilesCount()
            )
          );
      }
    } finally {
      if (success) {
        progressReport.stop();
      } else {
        progressReport.cancel();
      }
    }

    return issues;
  }
}
