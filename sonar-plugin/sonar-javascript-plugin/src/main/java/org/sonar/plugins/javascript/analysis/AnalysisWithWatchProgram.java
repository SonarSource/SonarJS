/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.analysis;

import java.io.IOException;
import java.util.List;
import javax.annotation.Nullable;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.plugins.javascript.bridge.AnalysisWarningsWrapper;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.utils.ProgressReport;
import org.sonarsource.api.sonarlint.SonarLintSide;

@ScannerSide
@SonarLintSide
public class AnalysisWithWatchProgram extends AbstractAnalysis {

  TsConfigCache tsConfigCache;

  public AnalysisWithWatchProgram(
    BridgeServer bridgeServer,
    AnalysisProcessor analysisProcessor,
    AnalysisWarningsWrapper analysisWarnings,
    @Nullable TsConfigCache tsConfigCache
  ) {
    super(bridgeServer, analysisProcessor, analysisWarnings);
    this.tsConfigCache = tsConfigCache;
  }

  @Override
  public void analyzeFiles(List<InputFile> inputFiles, List<String> tsConfigs) throws IOException {
    boolean success = false;
    progressReport = new ProgressReport(PROGRESS_REPORT_TITLE, PROGRESS_REPORT_PERIOD);
    try {
      progressReport.start(inputFiles.size(), inputFiles.iterator().next().toString());
      for (InputFile inputFile : inputFiles) {
        var tsConfigFile = tsConfigCache.getTsConfigForInputFile(inputFile);
        analyzeFile(inputFile, tsConfigFile == null ? List.of() : List.of(tsConfigFile.getFilename()), null);
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
  }
}
