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

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.plugins.javascript.JavaScriptFilePredicate;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.eslint.cache.CacheAnalysis;
import org.sonar.plugins.javascript.eslint.cache.CacheStrategies;

public class JsTsSensor extends AbstractEslintSensor {

  private static final Logger LOG = Loggers.get(JsTsSensor.class);
  private final JsTsChecks checks;
  private final AnalysisProcessor analysisProcessor;
  private AnalysisMode analysisMode;
  private List<EslintRule> rules;

  public JsTsSensor(
    JsTsChecks checks,
    EslintBridgeServer eslintBridgeServer,
    AnalysisWarningsWrapper analysisWarnings,
    Monitoring monitoring
  ) {
    this(checks, eslintBridgeServer, analysisWarnings, monitoring, null);
  }

  public JsTsSensor(
    JsTsChecks checks,
    EslintBridgeServer eslintBridgeServer,
    AnalysisWarningsWrapper analysisWarnings,
    Monitoring monitoring,
    AnalysisProcessor analysisProcessor
  ) {
    super(eslintBridgeServer, analysisWarnings, monitoring);
    this.checks = checks;
    this.analysisProcessor = analysisProcessor;
    this.rules = checks.eslintRules();
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      .onlyOnLanguages(JavaScriptLanguage.KEY, TypeScriptLanguage.KEY)
      .name("JavaScript/TypeScript analysis");
  }

  @Override
  protected String getProgressReportTitle() {
    return "Progress of JavaScript/TypeScript analysis";
  }

  @Override
  protected List<InputFile> getInputFiles() {
    FileSystem fileSystem = context.fileSystem();
    FilePredicate allFilesPredicate = JavaScriptFilePredicate.getJsTsPredicate(fileSystem);
    return StreamSupport
      .stream(fileSystem.inputFiles(allFilesPredicate).spliterator(), false)
      .collect(Collectors.toList());
  }

  protected void initLinter() throws IOException {
    this.analysisMode = AnalysisMode.getMode(context, this.rules);
    eslintBridgeServer.initLinter(rules, environments, globals, analysisMode);
  }

  protected void analyze(InputFile file) throws IOException {
    monitoring.startFile(file);
    var cacheStrategy = CacheStrategies.getStrategyFor(context, file);
    if (cacheStrategy.isAnalysisRequired()) {
      try {
        LOG.debug("Analyzing file: " + file.uri());
        var request = getRequest(file);
        var response = getResponse(file, request);
        analysisProcessor.processResponse(context, checks, file, response);
        cacheStrategy.writeAnalysisToCache(
          CacheAnalysis.fromResponse(response.ucfgPaths, response.cpdTokens),
          file
        );
      } catch (IOException | RuntimeException e) {
        LOG.error("Failed to get response while analyzing " + file.uri(), e);
        throw new IllegalStateException("Failure during analysis of " + file.uri(), e);
      }
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

  private EslintBridgeServer.JsAnalysisRequest getRequest(InputFile file) throws IOException {
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
      true,
      context.fileSystem().baseDir().getAbsolutePath()
    );
  }

  protected static String inputFileLanguage(InputFile file) {
    return JavaScriptFilePredicate.isTypeScriptFile(file)
      ? TypeScriptLanguage.KEY
      : JavaScriptLanguage.KEY;
  }
}
