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
import java.nio.file.Path;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.scanner.ScannerSide;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.api.utils.log.Profiler;
import org.sonar.plugins.javascript.CancellationException;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.TsProgram;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.TsProgramRequest;
import org.sonar.plugins.javascript.eslint.cache.CacheAnalysis;
import org.sonar.plugins.javascript.eslint.cache.CacheStrategies;
import org.sonar.plugins.javascript.utils.ProgressReport;
import org.sonarsource.api.sonarlint.SonarLintSide;

import static org.sonar.plugins.javascript.eslint.TypeScriptSensor.PROGRESS_REPORT_PERIOD;
import static org.sonar.plugins.javascript.eslint.TypeScriptSensor.PROGRESS_REPORT_TITLE;

@ScannerSide
@SonarLintSide
public class AnalysisWithProgram {

  private static final Logger LOG = Loggers.get(AnalysisWithProgram.class);
  private static final Profiler PROFILER = Profiler.create(LOG);
  private final EslintBridgeServer eslintBridgeServer;
  private final Monitoring monitoring;
  private final AnalysisProcessor processAnalysis;
  private final AnalysisWarningsWrapper analysisWarnings;
  private SensorContext context;
  private ContextUtils contextUtils;
  private AbstractChecks checks;
  private ProgressReport progressReport;
  private AnalysisMode analysisMode;

  public AnalysisWithProgram(EslintBridgeServer eslintBridgeServer, Monitoring monitoring, AnalysisProcessor processAnalysis, AnalysisWarningsWrapper analysisWarnings) {
    this.eslintBridgeServer = eslintBridgeServer;
    this.monitoring = monitoring;
    this.processAnalysis = processAnalysis;
    this.analysisWarnings = analysisWarnings;
  }

  void analyzeFiles(SensorContext context, AbstractChecks checks, List<InputFile> inputFiles) throws IOException {
    this.context = context;
    this.contextUtils = new ContextUtils(context);
    this.checks = checks;
    this.analysisMode = AnalysisMode.getMode(context, checks.eslintRules());
    var tsConfigs = new TsConfigProvider().tsconfigs(context);
    if (tsConfigs.isEmpty()) {
      LOG.info("No tsconfig.json file found");
    }
    progressReport = new ProgressReport(PROGRESS_REPORT_TITLE, PROGRESS_REPORT_PERIOD);
    progressReport.start(inputFiles.size(), inputFiles.iterator().next().absolutePath());
    boolean success = false;
    try {
      Deque<String> workList = new ArrayDeque<>(tsConfigs);
      Set<String> analyzedProjects = new HashSet<>();
      Set<InputFile> analyzedFiles = new HashSet<>();
      while (!workList.isEmpty()) {
        var tsConfig = Path.of(workList.pop()).toString();
        // Use of path.of as it normalizes Unix and Windows paths. Otherwise, project references returned by typescript may not match system slash
        if (!analyzedProjects.add(tsConfig)) {
          LOG.debug("tsconfig.json already analyzed: '{}'. Skipping it.", tsConfig);
          continue;
        }
        monitoring.startProgram(tsConfig);
        PROFILER.startInfo("Creating TypeScript program");
        LOG.info("TypeScript configuration file " + tsConfig);
        var program = eslintBridgeServer.createProgram(new TsProgramRequest(tsConfig));
        if (program.error != null) {
          LOG.error("Failed to create program: " + program.error);
          PROFILER.stopInfo();
          continue;
        }
        if (program.missingTsConfig) {
          String msg = "At least one tsconfig.json was not found in the project. Please run 'npm install' for a more complete analysis. Check analysis logs for more details.";
          LOG.warn(msg);
          this.analysisWarnings.addUnique(msg);
        }
        PROFILER.stopInfo();
        monitoring.stopProgram();
        analyzeProgram(program, analyzedFiles);
        workList.addAll(program.projectReferences);
        eslintBridgeServer.deleteProgram(program);
      }
      Set<InputFile> skippedFiles = new HashSet<>(inputFiles);
      skippedFiles.removeAll(analyzedFiles);
      if (!skippedFiles.isEmpty()) {
        LOG.info("Skipped {} file(s) because they were not part of any tsconfig.json (enable debug logs to see the full list)", skippedFiles.size());
        skippedFiles.forEach(f -> LOG.debug("File not part of any tsconfig.json: {}", f));
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

  private void analyzeProgram(TsProgram program, Set<InputFile> analyzedFiles) throws IOException {
    LOG.info("Starting analysis with current program");
    var fs = context.fileSystem();
    var counter = 0;
    for (var file : program.files) {
      var inputFile = fs.inputFile(fs.predicates().and(
        fs.predicates().hasAbsolutePath(file),
        // we need to check the language, because project might contain files which were already analyzed with JS sensor
        // this should be removed once we unify the two sensors
        fs.predicates().hasLanguage(TypeScriptLanguage.KEY)));
      if (inputFile == null) {
        LOG.debug("File not part of the project: '{}'", file);
        continue;
      }
      if (analyzedFiles.add(inputFile)) {
        analyze(inputFile, program);
        counter++;
      } else {
        LOG.debug("File already analyzed: '{}'. Check your project configuration to avoid files being part of multiple projects.", file);
      }
    }

    LOG.info("Analyzed {} file(s) with current program", counter);
  }

  private void analyze(InputFile file, TsProgram tsProgram) throws IOException {
    if (context.isCancelled()) {
      throw new CancellationException("Analysis interrupted because the SensorContext is in cancelled state");
    }
    var cacheStrategy = CacheStrategies.getStrategyFor(context, file);
    if (cacheStrategy.isAnalysisRequired()) {
      try {
        LOG.debug("Analyzing file: {}", file.uri());
        progressReport.nextFile(file.absolutePath());
        monitoring.startFile(file);
        EslintBridgeServer.JsAnalysisRequest request = new EslintBridgeServer.JsAnalysisRequest(file.absolutePath(),
          file.type().toString(), null, contextUtils.ignoreHeaderComments(), null, tsProgram.programId, analysisMode.getLinterIdFor(file));
        EslintBridgeServer.AnalysisResponse response = eslintBridgeServer.analyzeWithProgram(request);
        processAnalysis.processResponse(context, checks, file, response);
        cacheStrategy.writeAnalysisToCache(CacheAnalysis.fromResponse(response.ucfgPaths, response.cpdTokens), file);
      } catch (IOException e) {
        LOG.error("Failed to get response while analyzing " + file, e);
        throw e;
      }
    } else {
      LOG.debug("Processing cache analysis of file: {}", file.uri());
      var cacheAnalysis = cacheStrategy.readAnalysisFromCache();
      processAnalysis.processCacheAnalysis(context, file, cacheAnalysis);
    }
  }

}
