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
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisResponse;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.JsAnalysisRequest;
import org.sonar.plugins.javascript.eslint.cache.CacheStrategies;
import org.sonar.plugins.javascript.eslint.cache.CacheStrategy;
import org.sonar.plugins.javascript.eslint.tsconfig.TsConfigProvider;
import org.sonar.plugins.javascript.utils.ProgressReport;

public class JavaScriptEslintBasedSensor extends AbstractEslintSensor {

  private static final Logger LOG = Loggers.get(JavaScriptEslintBasedSensor.class);

  private final JavaScriptChecks checks;
  private final AnalysisProcessor processAnalysis;
  private final ProjectChecker projectChecker;
  private AnalysisMode analysisMode;

  // This constructor is required to avoid an error in SonarCloud because there's no implementation available for the interface
  // JavaScriptProjectChecker. The implementation for that interface is available only in SonarLint. Unlike SonarCloud,
  // SonarQube is simply passing null and doesn't throw any error.
  public JavaScriptEslintBasedSensor(JavaScriptChecks checks, EslintBridgeServer eslintBridgeServer,
                                     AnalysisWarningsWrapper analysisWarnings, TempFolder folder, Monitoring monitoring,
                                     AnalysisProcessor processAnalysis) {
    this(checks, eslintBridgeServer, analysisWarnings, folder, monitoring, processAnalysis, null);
  }

  public JavaScriptEslintBasedSensor(JavaScriptChecks checks, EslintBridgeServer eslintBridgeServer,
                                     AnalysisWarningsWrapper analysisWarnings, Monitoring monitoring,
                                     AnalysisProcessor processAnalysis,
                                     @Nullable ProjectChecker projectChecker) {
    super(eslintBridgeServer, analysisWarnings, monitoring);
    this.checks = checks;
    this.processAnalysis = processAnalysis;
    this.projectChecker = projectChecker;
  }

  @Override
  protected void analyzeFiles(List<InputFile> inputFiles) throws IOException {
    runEslintAnalysis(getTsConfigProvider().tsconfigs(), inputFiles);
  }

  private TsConfigProvider getTsConfigProvider() {
    return TsConfigProvider.builder(context)
      .with(projectChecker)
      .with(this::createTsConfigFile)
      .skipSearchForTsConfigFiles()
      .build();
  }

  private void runEslintAnalysis(List<String> tsConfigs, List<InputFile> inputFiles) throws IOException {
    analysisMode = AnalysisMode.getMode(context, checks.eslintRules());
    ProgressReport progressReport = new ProgressReport("Analysis progress", TimeUnit.SECONDS.toMillis(10));
    boolean success = false;
    try {
      progressReport.start(inputFiles.size(), inputFiles.iterator().next().absolutePath());
      eslintBridgeServer.initLinter(checks.eslintRules(), environments, globals, analysisMode);
      for (InputFile inputFile : inputFiles) {
        monitoring.startFile(inputFile);
        if (context.isCancelled()) {
          throw new CancellationException("Analysis interrupted because the SensorContext is in cancelled state");
        }
        if (eslintBridgeServer.isAlive()) {
          progressReport.nextFile(inputFile.absolutePath());
          var cacheStrategy = CacheStrategies.getStrategyFor(context, inputFile);
          if (cacheStrategy.isAnalysisRequired()) {
            analyze(inputFile, tsConfigs, cacheStrategy);
          }
        } else {
          throw new IllegalStateException("eslint-bridge server is not answering");
        }
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

  private void analyze(InputFile file, List<String> tsConfigs, CacheStrategy cacheStrategy) throws IOException {
    try {
      LOG.debug("Analyzing file: {}", file.uri());
      String fileContent = contextUtils.shouldSendFileContent(file) ? file.contents() : null;
      JsAnalysisRequest jsAnalysisRequest = new JsAnalysisRequest(file.absolutePath(), file.type().toString(),
        fileContent, contextUtils.ignoreHeaderComments(), tsConfigs, null, analysisMode.getLinterIdFor(file));
      AnalysisResponse response = eslintBridgeServer.analyzeJavaScript(jsAnalysisRequest);
      processAnalysis.processResponse(context, checks, file, response);
      cacheStrategy.writeGeneratedFilesToCache(response.ucfgPaths);
    } catch (IOException e) {
      LOG.error("Failed to get response while analyzing " + file.uri(), e);
      throw e;
    }
  }

  private String createTsConfigFile(String baseDir) throws IOException {
    return eslintBridgeServer.createTsConfigFile(baseDir).getFilename();
  }

  @Override
  protected List<InputFile> getInputFiles() {
    FileSystem fileSystem = context.fileSystem();
    FilePredicate allFilesPredicate = JavaScriptFilePredicate.getJavaScriptPredicate(fileSystem);
    return StreamSupport.stream(fileSystem.inputFiles(allFilesPredicate).spliterator(), false)
      .collect(Collectors.toList());
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      .onlyOnLanguage(JavaScriptLanguage.KEY)
      .name("JavaScript analysis");
  }

}
