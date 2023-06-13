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
import java.util.Locale;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import javax.annotation.Nullable;
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
  private final JavaScriptProjectChecker javaScriptProjectChecker;
  private AnalysisMode analysisMode;
  private List<String> tsconfigs;
  private boolean useFoundTSConfigs = false;
  private boolean createWildcardTSConfig = false;
  private boolean createProgram = true;

  // Constructor for SonarCloud without the optional dependency (Pico doesn't support optional dependencies)
  public JsTsSensor(
    JsTsChecks checks,
    EslintBridgeServer eslintBridgeServer,
    AnalysisWarningsWrapper analysisWarnings,
    Monitoring monitoring,
    AnalysisProcessor analysisProcessor
  ) {
    this(checks, eslintBridgeServer, analysisWarnings, monitoring, analysisProcessor, null);
  }

  public JsTsSensor(
    JsTsChecks checks,
    EslintBridgeServer eslintBridgeServer,
    AnalysisWarningsWrapper analysisWarnings,
    Monitoring monitoring,
    AnalysisProcessor analysisProcessor,
    @Nullable JavaScriptProjectChecker javaScriptProjectChecker
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

  @Override
  protected void prepareAnalysis(List<InputFile> inputFiles) throws IOException {
    var rules = checks.eslintRules();
    analysisMode = AnalysisMode.getMode(context, rules);
    tsconfigs = TsConfigPropertyProvider.tsconfigs(context);
    if (tsconfigs.isEmpty()) {
      useFoundTSConfigs = true;
    }
    JavaScriptProjectChecker.checkOnce(javaScriptProjectChecker, contextUtils);
    if (javaScriptProjectChecker != null && !javaScriptProjectChecker.isBeyondLimit()) {
      createWildcardTSConfig = true;
    }
    var vueFile = inputFiles
      .stream()
      .filter(f -> f.filename().toLowerCase(Locale.ROOT).endsWith(".vue"))
      .findAny();
    if (vueFile.isPresent()) {
      createProgram = false;
      if (
        contextUtils.isSonarQube() && contextUtils.canUseWildcardForTypeChecking(inputFiles.size())
      ) {
        createWildcardTSConfig = true;
      }
    }
    eslintBridgeServer.initLinter(rules, environments, globals, analysisMode);
  }

  @Override
  protected void analyze(InputFile file) throws IOException {
    monitoring.startFile(file);
    var cacheStrategy = CacheStrategies.getStrategyFor(context, file);
    if (cacheStrategy.isAnalysisRequired()) {
      try {
        LOG.debug("Analyzing file: " + file.uri());
        var fileContent = contextUtils.shouldSendFileContent(file) ? file.contents() : null;
        var request = new EslintBridgeServer.JsAnalysisRequest(
          file.absolutePath(),
          file.type().toString(),
          JavaScriptFilePredicate.isTypeScriptFile(file)
            ? TypeScriptLanguage.KEY
            : JavaScriptLanguage.KEY,
          fileContent,
          contextUtils.ignoreHeaderComments(),
          tsconfigs,
          analysisMode.getLinterIdFor(file),
          createProgram,
          useFoundTSConfigs,
          createWildcardTSConfig,
          context.fileSystem().baseDir().getAbsolutePath()
        );
        var response = isTypeScriptFile(file)
          ? eslintBridgeServer.analyzeTypeScript(request)
          : eslintBridgeServer.analyzeJavaScript(request);
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
}
