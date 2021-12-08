/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2021 SonarSource SA
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
import org.sonarsource.api.sonarlint.SonarLintSide;

@ScannerSide
@SonarLintSide
public class AnalysisWithProgram {

  private static final Logger LOG = Loggers.get(AnalysisWithProgram.class);
  private static final Profiler PROFILER = Profiler.create(LOG);
  private final EslintBridgeServer eslintBridgeServer;
  private final Monitoring monitoring;
  private final AnalysisProcessor processAnalysis;
  private SensorContext context;
  private ContextUtils contextUtils;
  private AbstractChecks checks;

  public AnalysisWithProgram(EslintBridgeServer eslintBridgeServer, Monitoring monitoring, AnalysisProcessor processAnalysis) {
    this.eslintBridgeServer = eslintBridgeServer;
    this.monitoring = monitoring;
    this.processAnalysis = processAnalysis;
  }

  void analyzeFiles(SensorContext context, AbstractChecks checks, List<InputFile> inputFiles) throws IOException {
    this.context = context;
    this.contextUtils = new ContextUtils(context);
    this.checks = checks;
    var tsConfigs = new TsConfigProvider().tsconfigs(context);
    if (tsConfigs.isEmpty()) {
      LOG.info("No tsconfig.json file found");
    }
    Deque<String> workList = new ArrayDeque<>(tsConfigs);
    Set<String> analyzedProjects = new HashSet<>();
    Set<InputFile> analyzedFiles = new HashSet<>();
    while (!workList.isEmpty()) {
      var tsConfig = workList.pop();
      if (!analyzedProjects.add(tsConfig)) {
        continue;
      }
      PROFILER.startInfo("Creating program from tsconfig " + tsConfig);
      var program = eslintBridgeServer.createProgram(new TsProgramRequest(tsConfig));
      PROFILER.stopInfo();
      analyzeProgram(program, analyzedFiles);
      workList.addAll(program.projectReferences);
      eslintBridgeServer.deleteProgram(program);
    }
    Set<InputFile> skippedFiles = new HashSet<>(inputFiles);
    skippedFiles.removeAll(analyzedFiles);
    LOG.debug("Skipped {} files because they were not part of any tsconfig", skippedFiles.size());
    skippedFiles.forEach(f -> LOG.debug("File not part of any tsconfig: {}", f));
  }

  private void analyzeProgram(TsProgram program, Set<InputFile> analyzedFiles) throws IOException {
    var fs = context.fileSystem();
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
      } else {
        LOG.info("File already analyzed: '{}'. Check your project configuration to avoid files being part of multiple projects.", file);
      }
    }
  }

  private void analyze(InputFile file, TsProgram tsProgram) throws IOException {
    if (context.isCancelled()) {
      throw new CancellationException("Analysis interrupted because the SensorContext is in cancelled state");
    }
    try {
      LOG.debug("Analyzing {}", file);
      monitoring.startFile(file);
      EslintBridgeServer.JsAnalysisRequest request = new EslintBridgeServer.JsAnalysisRequest(file.absolutePath(),
        file.type().toString(), null, contextUtils.ignoreHeaderComments(), null, tsProgram.programId);
      EslintBridgeServer.AnalysisResponse response = eslintBridgeServer.analyzeWithProgram(request);
      processAnalysis.processResponse(context, checks, file, response);
    } catch (IOException e) {
      LOG.error("Failed to get response while analyzing " + file, e);
      throw e;
    }
  }

}
