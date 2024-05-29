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
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.plugins.javascript.bridge.AnalysisWarningsWrapper;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.TsConfigFile;
import org.sonar.plugins.javascript.utils.ProgressReport;
import org.sonarsource.api.sonarlint.SonarLintSide;

@ScannerSide
@SonarLintSide
public class AnalysisWithWatchProgram extends AbstractAnalysis {

  private static final Logger LOG = LoggerFactory.getLogger(AnalysisWithWatchProgram.class);

  public AnalysisWithWatchProgram(
    BridgeServer bridgeServer,
    AnalysisProcessor analysisProcessor,
    AnalysisWarningsWrapper analysisWarnings
  ) {
    super(bridgeServer, analysisProcessor, analysisWarnings);
  }

  @Override
  public void analyzeFiles(List<InputFile> inputFiles, List<String> tsConfigs) throws IOException {
    boolean success = false;
    progressReport = new ProgressReport(PROGRESS_REPORT_TITLE, PROGRESS_REPORT_PERIOD);
    Map<TsConfigFile, List<InputFile>> filesByTsConfig = TsConfigFile.inputFilesByTsConfig(
      loadTsConfigs(tsConfigs),
      inputFiles
    );
    try {
      progressReport.start(inputFiles.size(), inputFiles.iterator().next().toString());
      if (tsConfigs.isEmpty()) {
        LOG.info("Analyzing {} files without tsconfig", inputFiles.size());
        analyzeTsConfig(null, inputFiles);
      } else {
        for (Map.Entry<TsConfigFile, List<InputFile>> entry : filesByTsConfig.entrySet()) {
          TsConfigFile tsConfigFile = entry.getKey();
          List<InputFile> files = entry.getValue();
          if (TsConfigFile.UNMATCHED_CONFIG.equals(tsConfigFile)) {
            LOG.info("Analyzing {} files without tsconfig", files.size());
            analyzeTsConfig(null, files);
          } else {
            LOG.info("Analyzing {} files using tsconfig: {}", files.size(), tsConfigFile);
            analyzeTsConfig(tsConfigFile, files);
          }
        }
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

  private List<TsConfigFile> loadTsConfigs(List<String> tsConfigPaths) {
    List<TsConfigFile> tsConfigFiles = new ArrayList<>();
    Deque<String> workList = new ArrayDeque<>(tsConfigPaths);
    Set<String> processed = new HashSet<>();
    while (!workList.isEmpty()) {
      String path = workList.pop();
      if (processed.add(path)) {
        TsConfigFile tsConfigFile = bridgeServer.loadTsConfig(path);
        tsConfigFiles.add(tsConfigFile);
        if (!tsConfigFile.getProjectReferences().isEmpty()) {
          LOG.debug("Adding referenced project's tsconfigs {}", tsConfigFile.getProjectReferences());
        }
        workList.addAll(tsConfigFile.getProjectReferences());
      }
    }
    return tsConfigFiles;
  }

  private void analyzeTsConfig(@Nullable TsConfigFile tsConfigFile, List<InputFile> files)
    throws IOException {
    List<String> tsConfigs = tsConfigFile == null ? List.of() : List.of(tsConfigFile.getFilename());
    for (InputFile inputFile : files) {
      analyzeFile(inputFile, tsConfigs, null);
    }
  }
}
