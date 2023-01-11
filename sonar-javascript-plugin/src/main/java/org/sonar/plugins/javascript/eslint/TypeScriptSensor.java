/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2022 SonarSource SA
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
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.utils.TempFolder;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.CancellationException;
import org.sonar.plugins.javascript.JavaScriptFilePredicate;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisResponse;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.JsAnalysisRequest;
import org.sonar.plugins.javascript.eslint.cache.CacheAnalysis;
import org.sonar.plugins.javascript.eslint.cache.CacheStrategies;
import org.sonar.plugins.javascript.utils.ProgressReport;

import static java.util.Collections.singletonList;

public class TypeScriptSensor extends AbstractEslintSensor {

  private static final Logger LOG = Loggers.get(TypeScriptSensor.class);
  static final String PROGRESS_REPORT_TITLE = "Progress of TypeScript analysis";
  static final long PROGRESS_REPORT_PERIOD = TimeUnit.SECONDS.toMillis(10);
  private final TempFolder tempFolder;
  private final AnalysisWithProgram analysisWithProgram;
  private final AnalysisProcessor analysisProcessor;
  private final TypeScriptChecks checks;

  private AnalysisMode analysisMode;

  public TypeScriptSensor(TypeScriptChecks typeScriptChecks, EslintBridgeServer eslintBridgeServer,
                          AnalysisWarningsWrapper analysisWarnings, TempFolder tempFolder, Monitoring monitoring,
                          AnalysisProcessor analysisProcessor, AnalysisWithProgram analysisWithProgram) {
    super(eslintBridgeServer, analysisWarnings, monitoring);
    this.tempFolder = tempFolder;
    this.analysisWithProgram = analysisWithProgram;
    this.analysisProcessor = analysisProcessor;
    checks = typeScriptChecks;
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      // JavaScriptLanguage.KEY is required for Vue single file components, bc .vue is considered as JS language
      .onlyOnLanguages(JavaScriptLanguage.KEY, TypeScriptLanguage.KEY)
      .name("TypeScript analysis");
  }

  @Override
  protected List<InputFile> getInputFiles() {
    FileSystem fileSystem = context.fileSystem();
    FilePredicate allFilesPredicate = JavaScriptFilePredicate.getTypeScriptPredicate(fileSystem);
    return StreamSupport.stream(fileSystem.inputFiles(allFilesPredicate).spliterator(), false)
      .collect(Collectors.toList());
  }

  @Override
  protected void analyzeFiles(List<InputFile> inputFiles) throws IOException {
    analysisMode = AnalysisMode.getMode(context, checks.eslintRules());
    eslintBridgeServer.initLinter(checks.eslintRules(), environments, globals, analysisMode);
    if (shouldAnalyzeWithProgram(inputFiles)) {
      analysisWithProgram.analyzeFiles(context, checks, inputFiles);
      return;
    }
    List<String> tsConfigs = new TsConfigProvider(tempFolder).tsconfigs(context);
    if (tsConfigs.isEmpty()) {
      // This can happen where we are not able to create temporary file for generated tsconfig.json
      LOG.warn("No tsconfig.json file found, analysis will be skipped.");
      return;
    }
    boolean success = false;
    ProgressReport progressReport = new ProgressReport(PROGRESS_REPORT_TITLE, PROGRESS_REPORT_PERIOD);
    Map<TsConfigFile, List<InputFile>> filesByTsConfig = TsConfigFile.inputFilesByTsConfig(loadTsConfigs(tsConfigs), inputFiles);
    try {
      progressReport.start(inputFiles.size(), inputFiles.iterator().next().absolutePath());
      for (Map.Entry<TsConfigFile, List<InputFile>> entry : filesByTsConfig.entrySet()) {
        TsConfigFile tsConfigFile = entry.getKey();
        List<InputFile> files = entry.getValue();
        if (TsConfigFile.UNMATCHED_CONFIG.equals(tsConfigFile)) {
          LOG.info("Skipping {} files with no tsconfig.json", files.size());
          LOG.debug("Skipped files: " + files.stream().map(InputFile::toString).collect(Collectors.joining("\n")));
          continue;
        }
        LOG.info("Analyzing {} files using tsconfig: {}", files.size(), tsConfigFile);
        analyzeFilesWithTsConfig(files, tsConfigFile, progressReport);
        eslintBridgeServer.newTsConfig();
      }
      success = true;
    } finally {
      if (success) {
        progressReport.stop();
      } else {
        progressReport.cancel();
      }
    }
  }

  private boolean shouldAnalyzeWithProgram(List<InputFile> inputFiles) {
    return inputFiles.stream().noneMatch(f -> f.filename().endsWith(".vue")) && !contextUtils.isSonarLint();
  }

  private void analyzeFilesWithTsConfig(List<InputFile> files, TsConfigFile tsConfigFile, ProgressReport progressReport) throws IOException {
    for (InputFile inputFile : files) {
      if (context.isCancelled()) {
        throw new CancellationException("Analysis interrupted because the SensorContext is in cancelled state");
      }
      if (eslintBridgeServer.isAlive()) {
        monitoring.startFile(inputFile);
        analyze(inputFile, tsConfigFile);
        progressReport.nextFile(inputFile.absolutePath());
      } else {
        throw new IllegalStateException("eslint-bridge server is not answering");
      }
    }
  }

  private void analyze(InputFile file, TsConfigFile tsConfigFile) throws IOException {
    var cacheStrategy = CacheStrategies.getStrategyFor(context, file, PluginInfo.getVersion());
    if (cacheStrategy.isAnalysisRequired()) {
      try {
        LOG.debug("Analyzing file: " + file.uri());
        String fileContent = contextUtils.shouldSendFileContent(file) ? file.contents() : null;
        JsAnalysisRequest request = new JsAnalysisRequest(file.absolutePath(), file.type().toString(), fileContent,
          contextUtils.ignoreHeaderComments(), singletonList(tsConfigFile.filename), null, analysisMode.getLinterIdFor(file));
        AnalysisResponse response = eslintBridgeServer.analyzeTypeScript(request);
        analysisProcessor.processResponse(context, checks, file, response);
        cacheStrategy.writeAnalysisToCache(CacheAnalysis.fromResponse(response.ucfgPaths, response.cpdTokens), file);
      } catch (IOException e) {
        LOG.error("Failed to get response while analyzing " + file, e);
        throw e;
      }
    } else {
      LOG.debug("Processing cache analysis of file: {}", file.uri());
      var cacheAnalysis = cacheStrategy.readAnalysisFromCache();
      analysisProcessor.processCacheAnalysis(context, file, cacheAnalysis);
    }
  }

  private List<TsConfigFile> loadTsConfigs(List<String> tsConfigPaths) {
    List<TsConfigFile> tsConfigFiles = new ArrayList<>();
    Deque<String> workList = new ArrayDeque<>(tsConfigPaths);
    Set<String> processed = new HashSet<>();
    while (!workList.isEmpty()) {
      String path = workList.pop();
      if (processed.add(path)) {
        TsConfigFile tsConfigFile = eslintBridgeServer.loadTsConfig(path);
        tsConfigFiles.add(tsConfigFile);
        if (!tsConfigFile.projectReferences.isEmpty()) {
          LOG.debug("Adding referenced project's tsconfigs {}", tsConfigFile.projectReferences);
        }
        workList.addAll(tsConfigFile.projectReferences);
      }
    }
    return tsConfigFiles;
  }
}
