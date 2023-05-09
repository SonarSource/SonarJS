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

import static org.sonar.plugins.javascript.JavaScriptFilePredicate.isTypeScriptFile;
import static org.sonar.plugins.javascript.eslint.AbstractAnalysis.inputFileLanguage;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import javax.annotation.Nullable;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.CancellationException;
import org.sonar.plugins.javascript.JavaScriptFilePredicate;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.eslint.cache.CacheAnalysis;
import org.sonar.plugins.javascript.eslint.cache.CacheStrategies;
import org.sonar.plugins.javascript.utils.ProgressReport;

public class JsTsSensor extends AbstractEslintSensor {

  static final String PROGRESS_REPORT_TITLE = "Progress of JavaScript/TypeScript analysis";
  static final long PROGRESS_REPORT_PERIOD = TimeUnit.SECONDS.toMillis(10);

  private static final Logger LOG = Loggers.get(JsTsSensor.class);
  private final JsTsChecks checks;
  private final JavaScriptProjectChecker javaScriptProjectChecker;
  private AnalysisProcessor analysisProcessor;

  public JsTsSensor(
    JsTsChecks checks,
    EslintBridgeServer eslintBridgeServer,
    AnalysisWarningsWrapper analysisWarnings,
    Monitoring monitoring
  ) {
    this(checks, eslintBridgeServer, analysisWarnings, monitoring, null, null);
  }

  public JsTsSensor(
    JsTsChecks checks,
    EslintBridgeServer eslintBridgeServer,
    AnalysisWarningsWrapper analysisWarnings,
    Monitoring monitoring,
    @Nullable JavaScriptProjectChecker javaScriptProjectChecker,
    AnalysisProcessor analysisProcessor
  ) {
    super(eslintBridgeServer, analysisWarnings, monitoring);
    this.checks = checks;
    this.javaScriptProjectChecker = javaScriptProjectChecker;
    this.analysisProcessor = analysisProcessor;
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      .onlyOnLanguages(JavaScriptLanguage.KEY, TypeScriptLanguage.KEY)
      .name("JavaScript/TypeScript analysis");
  }

  @Override
  protected List<InputFile> getInputFiles() {
    FileSystem fileSystem = context.fileSystem();
    FilePredicate allFilesPredicate = JavaScriptFilePredicate.getJsTsPredicate(fileSystem);
    return StreamSupport
      .stream(fileSystem.inputFiles(allFilesPredicate).spliterator(), false)
      .collect(Collectors.toList());
  }

  @Override
  protected void analyzeFiles(List<InputFile> inputFiles) throws IOException {
    var analysisMode = AnalysisMode.getMode(context, checks.eslintRules());
    eslintBridgeServer.initLinter(checks.eslintRules(), environments, globals, analysisMode);
    var progressReport = new ProgressReport(PROGRESS_REPORT_TITLE, PROGRESS_REPORT_PERIOD);
    progressReport.start(inputFiles.size(), inputFiles.iterator().next().absolutePath());
    var success = false;
    try {
      for (var file : inputFiles) {
        analyzeFile(analysisMode, progressReport, file);
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

  private void analyzeFile(
    AnalysisMode analysisMode,
    ProgressReport progressReport,
    InputFile file
  ) throws IOException {
    if (context.isCancelled()) {
      throw new CancellationException(
        "Analysis interrupted because the SensorContext is in cancelled state"
      );
    }
    if (!eslintBridgeServer.isAlive()) {
      throw new IllegalStateException("eslint-bridge server is not answering");
    }
    monitoring.startFile(file);
    progressReport.nextFile(file.absolutePath());
    var cacheStrategy = CacheStrategies.getStrategyFor(context, file);
    if (cacheStrategy.isAnalysisRequired()) {
      LOG.debug("Analyzing file: " + file.uri());
      var request = getRequest(analysisMode, file);
      var response = getResponse(file, request);
      analysisProcessor.processResponse(context, checks, file, response);
      cacheStrategy.writeAnalysisToCache(
        CacheAnalysis.fromResponse(response.ucfgPaths, response.cpdTokens),
        file
      );
    } else {
      LOG.debug("Processing cache analysis of file: {}", file.uri());
      var cacheAnalysis = cacheStrategy.readAnalysisFromCache();
      analysisProcessor.processCacheAnalysis(context, file, cacheAnalysis);
    }
  }

  private EslintBridgeServer.AnalysisResponse getResponse(
    InputFile file,
    EslintBridgeServer.JsAnalysisRequest request
  ) throws IOException {
    return isTypeScriptFile(file)
      ? eslintBridgeServer.analyzeTypeScript(request)
      : eslintBridgeServer.analyzeJavaScript(request);
  }

  private EslintBridgeServer.JsAnalysisRequest getRequest(
    AnalysisMode analysisMode,
    InputFile file
  ) throws IOException {
    var fileContent = contextUtils.shouldSendFileContent(file) ? file.contents() : null;
    return new EslintBridgeServer.JsAnalysisRequest(
      file.absolutePath(),
      file.type().toString(),
      inputFileLanguage(file),
      fileContent,
      contextUtils.ignoreHeaderComments(),
      null,
      null,
      analysisMode.getLinterIdFor(file),
      true
    );
  }
}
