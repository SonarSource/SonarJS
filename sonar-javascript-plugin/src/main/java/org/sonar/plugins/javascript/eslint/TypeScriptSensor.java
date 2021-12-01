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
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.issue.NoSonarFilter;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.api.utils.log.Profiler;
import org.sonar.plugins.javascript.CancellationException;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptChecks;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisResponse;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.JsAnalysisRequest;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.TsProgram;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.TsProgramRequest;

import static java.util.Collections.emptyList;

public class TypeScriptSensor extends AbstractEslintSensor {

  private static final Logger LOG = Loggers.get(TypeScriptSensor.class);
  private static final Profiler PROFILER = Profiler.create(LOG);


  public TypeScriptSensor(TypeScriptChecks typeScriptChecks, NoSonarFilter noSonarFilter,
                          FileLinesContextFactory fileLinesContextFactory,
                          EslintBridgeServer eslintBridgeServer,
                          AnalysisWarningsWrapper analysisWarnings,
                          Monitoring monitoring) {
    super(typeScriptChecks,
      noSonarFilter,
      fileLinesContextFactory,
      eslintBridgeServer,
      analysisWarnings,
      monitoring
    );
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      // JavaScriptLanguage.KEY is required for Vue single file components, bc .vue is considered as JS language
      .onlyOnLanguages(JavaScriptLanguage.KEY, TypeScriptLanguage.KEY)
      .name("JavaScript/TypeScript analysis");
  }

  @Override
  protected List<InputFile> getInputFiles() {
    FileSystem fs = context.fileSystem();
    var predicate = fs.predicates().hasLanguages(JavaScriptLanguage.KEY, TypeScriptLanguage.KEY);
    return StreamSupport.stream(fs.inputFiles(predicate).spliterator(), false)
      .collect(Collectors.toList());
  }

  @Override
  protected void analyzeFiles(List<InputFile> inputFiles) throws IOException {
    eslintBridgeServer.initLinter(rules, environments, globals);
    var tsConfigs = new TsConfigProvider().tsconfigs(context);
    if (tsConfigs.isEmpty()) {
      analyzeWithDefaultProgram(inputFiles);
      return;
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
    }
    Set<InputFile> skippedFiles = new HashSet<>(inputFiles);
    skippedFiles.removeAll(analyzedFiles);
    LOG.debug("Skipped {} files because they were not part of any tsconfig", skippedFiles.size());
    skippedFiles.forEach(f -> LOG.debug("File not part of any tsconfig: {}", f));
  }

  private void analyzeWithDefaultProgram(List<InputFile> inputFiles) throws IOException {
    LOG.debug("No tsconfig file found, will create default program with {} files", inputFiles.size());
    var files = inputFiles.stream().map(InputFile::absolutePath).collect(Collectors.toList());
    PROFILER.startInfo("Creating default program");
    var defaultProgram = eslintBridgeServer.createProgram(new TsProgramRequest(files));
    PROFILER.stopInfo();
    analyzeProgram(defaultProgram, new HashSet<>());
  }

  private void analyzeProgram(TsProgram program, Set<InputFile> analyzedFiles) throws IOException {
    var fs = context.fileSystem();
    for (var file : program.files) {
      var inputFile = fs.inputFile(fs.predicates().hasAbsolutePath(file));
      if (inputFile == null) {
        LOG.debug("File not part of the project: '{}'", file);
        continue;
      }
      if (analyzedFiles.add(inputFile)) {
        analyze(inputFile, program);
      } else {
        LOG.debug("File already analyzed: '{}'", file);
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
      String fileContent = shouldSendFileContent(file) ? file.contents() : null;
      JsAnalysisRequest request = new JsAnalysisRequest(file.absolutePath(), file.type().toString(), fileContent,
        ignoreHeaderComments(), emptyList(), tsProgram.id);
      AnalysisResponse response = eslintBridgeServer.analyzeTypeScript(request);
      processResponse(file, response);
    } catch (IOException e) {
      LOG.error("Failed to get response while analyzing " + file, e);
      throw e;
    }
  }
}
