/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2019 SonarSource SA
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
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import javax.annotation.Nullable;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.issue.NoSonarFilter;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.notifications.AnalysisWarnings;
import org.sonar.api.utils.TempFolder;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.JavaScriptChecks;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisRequest;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisResponse;
import org.sonarsource.nodejs.NodeCommandException;

import static java.util.Collections.singletonList;

public class TypeScriptSensor extends AbstractEslintSensor {

  private static final Logger LOG = Loggers.get(TypeScriptSensor.class);
  private static final int PER_TSCONFIG_ANALYSIS_THRESHOLD = 2;
  private List<String> tsconfigs;
  private final TempFolder tempFolder;

  /**
   * Required for SonarLint
   */
  public TypeScriptSensor(CheckFactory checkFactory, NoSonarFilter noSonarFilter,
                          FileLinesContextFactory fileLinesContextFactory,
                          EslintBridgeServer eslintBridgeServer,
                          TempFolder tempFolder) {
    this(checkFactory, noSonarFilter, fileLinesContextFactory, eslintBridgeServer, null, tempFolder);
  }

  public TypeScriptSensor(CheckFactory checkFactory, NoSonarFilter noSonarFilter,
                          FileLinesContextFactory fileLinesContextFactory,
                          EslintBridgeServer eslintBridgeServer,
                          @Nullable AnalysisWarnings analysisWarnings,
                          TempFolder tempFolder) {
    super(checks(checkFactory), noSonarFilter, fileLinesContextFactory, eslintBridgeServer, analysisWarnings);
    this.tempFolder = tempFolder;
  }

  private static JavaScriptChecks checks(CheckFactory checkFactory) {
    return JavaScriptChecks.createJavaScriptChecks(checkFactory)
      .addChecks(CheckList.TS_REPOSITORY_KEY, CheckList.getTypeScriptChecks());
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      .onlyOnLanguage(TypeScriptLanguage.KEY)
      .name("ESLint-based TypeScript analysis")
      .onlyOnFileType(Type.MAIN);
  }

  @Override
  protected List<InputFile> getInputFiles() {
    FileSystem fileSystem = context.fileSystem();
    FilePredicate mainFilePredicate = filePredicate(fileSystem);
    return StreamSupport.stream(fileSystem.inputFiles(mainFilePredicate).spliterator(), false)
      .collect(Collectors.toList());
  }

  static FilePredicate filePredicate(FileSystem fileSystem) {
    return fileSystem.predicates().and(
      fileSystem.predicates().hasType(Type.MAIN),
      fileSystem.predicates().hasLanguage(TypeScriptLanguage.KEY));
  }

  @Override
  void analyzeFiles(List<InputFile> inputFiles) throws IOException {
    tsconfigs = tsConfigs();
    if (tsconfigs.size() > PER_TSCONFIG_ANALYSIS_THRESHOLD) {
      splitAnalysisByTsConfig(inputFiles);
    } else {
      analyzeFilesWithTsConfigs(inputFiles, tsconfigs);
    }
  }

  private void splitAnalysisByTsConfig(List<InputFile> inputFiles) {
    Map<String, List<InputFile>> filesByTsConfig = TsConfigFile.inputFilesByTsConfig(tsconfigs, inputFiles, eslintBridgeServer);
    for (Map.Entry<String, List<InputFile>> entry : filesByTsConfig.entrySet()) {
      String tsConfigFile = entry.getKey();
      List<InputFile> files = entry.getValue();
      if (TsConfigFile.UNMATCHED_CONFIG.equals(tsConfigFile)) {
        LOG.info("Skipping {} files with no tsconfig.json", files.size());
        LOG.debug("Skipped files: " + files.stream().map(InputFile::toString).collect(Collectors.joining("\n")));
        continue;
      }
      LOG.info("Analyzing {} files using tsconfig: {}", files.size(), tsConfigFile);
      analyzeFilesWithTsConfigs(files, singletonList(tsConfigFile));
      eslintBridgeServer.newTsConfig();
    }
  }

  private void analyzeFilesWithTsConfigs(List<InputFile> files, List<String> tsConfigs) {
    for (InputFile inputFile : files) {
      if (eslintBridgeServer.isAlive()) {
        analyze(inputFile, tsConfigs);
        progressReport.nextFile();
      } else {
        throw new IllegalStateException("eslint-bridge server is not answering");
      }
    }
  }

  private void analyze(InputFile file, List<String> tsConfigs) {
    try {
      String fileContent = isSonarLint(context) ? file.contents() : null;
      AnalysisRequest request = new AnalysisRequest(file.absolutePath(), fileContent, rules, ignoreHeaderComments(), tsConfigs);
      AnalysisResponse response = eslintBridgeServer.analyzeTypeScript(request);
      processResponse(file, response);
    } catch (IOException e) {
      LOG.error("Failed to get response while analyzing " + file, e);
    }
  }

  private List<String> tsConfigs() throws IOException {
    if (tsconfigs == null) {
      tsconfigs = new TsConfigProvider(tempFolder).tsconfigs(context);
      if (tsconfigs.isEmpty()) {
        throw new NodeCommandException("No tsconfig.json file found, analysis will be stopped.");
      }
    }
    return tsconfigs;
  }
}
