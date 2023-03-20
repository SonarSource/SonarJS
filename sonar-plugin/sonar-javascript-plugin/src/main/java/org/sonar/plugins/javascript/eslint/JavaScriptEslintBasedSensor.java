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
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import javax.annotation.Nullable;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.utils.TempFolder;
import org.sonar.plugins.javascript.JavaScriptFilePredicate;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.eslint.TsConfigProvider.DefaultTsConfigProvider;

public class JavaScriptEslintBasedSensor extends AbstractEslintSensor {

  private final TempFolder tempFolder;
  private final JavaScriptChecks checks;
  private final JavaScriptProjectChecker javaScriptProjectChecker;
  private final AnalysisWithProgram analysisWithProgram;
  private final AnalysisWithWatchProgram analysisWithWatchProgram;

  // This constructor is required to avoid an error in SonarCloud because there's no implementation available for the interface
  // JavaScriptProjectChecker. The implementation for that interface is available only in SonarLint. Unlike SonarCloud,
  // SonarQube is simply passing null and doesn't throw any error.
  public JavaScriptEslintBasedSensor(
    JavaScriptChecks checks,
    EslintBridgeServer eslintBridgeServer,
    AnalysisWarningsWrapper analysisWarnings,
    TempFolder folder,
    Monitoring monitoring,
    AnalysisWithProgram analysisWithProgram,
    AnalysisWithWatchProgram analysisWithWatchProgram
  ) {
    this(
      checks,
      eslintBridgeServer,
      analysisWarnings,
      folder,
      monitoring,
      null,
      analysisWithProgram,
      analysisWithWatchProgram
    );
  }

  public JavaScriptEslintBasedSensor(
    JavaScriptChecks checks,
    EslintBridgeServer eslintBridgeServer,
    AnalysisWarningsWrapper analysisWarnings,
    TempFolder folder,
    Monitoring monitoring,
    @Nullable JavaScriptProjectChecker javaScriptProjectChecker,
    AnalysisWithProgram analysisWithProgram,
    AnalysisWithWatchProgram analysisWithWatchProgram
  ) {
    super(eslintBridgeServer, analysisWarnings, monitoring);
    this.tempFolder = folder;
    this.checks = checks;
    this.javaScriptProjectChecker = javaScriptProjectChecker;
    this.analysisWithProgram = analysisWithProgram;
    this.analysisWithWatchProgram = analysisWithWatchProgram;
  }

  @Override
  protected void analyzeFiles(List<InputFile> inputFiles) throws IOException {
    AnalysisMode analysisMode = AnalysisMode.getMode(context, checks.eslintRules());
    eslintBridgeServer.initLinter(checks.eslintRules(), environments, globals, analysisMode);
    var tsConfigs = getTsConfigProvider().tsconfigs(context);
    var analysis = shouldAnalyzeWithProgram(inputFiles)
      ? analysisWithProgram
      : analysisWithWatchProgram;
    analysis.initialize(context, checks, analysisMode, JavaScriptLanguage.KEY);
    analysis.analyzeFiles(inputFiles, tsConfigs);
  }

  private TsConfigProvider.Provider getTsConfigProvider() {
    if (contextUtils.isSonarLint()) {
      JavaScriptProjectChecker.checkOnce(javaScriptProjectChecker, context);
      return new TsConfigProvider.WildcardTsConfigProvider(
        javaScriptProjectChecker,
        this::createTsConfigFile
      );
    } else {
      return new DefaultTsConfigProvider(
        tempFolder,
        JavaScriptFilePredicate::getJavaScriptPredicate
      );
    }
  }

  private String createTsConfigFile(String content) throws IOException {
    return eslintBridgeServer.createTsConfigFile(content).filename;
  }

  @Override
  protected List<InputFile> getInputFiles() {
    FileSystem fileSystem = context.fileSystem();
    FilePredicate allFilesPredicate = JavaScriptFilePredicate.getJavaScriptPredicate(fileSystem);
    return StreamSupport
      .stream(fileSystem.inputFiles(allFilesPredicate).spliterator(), false)
      .collect(Collectors.toList());
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor.onlyOnLanguage(JavaScriptLanguage.KEY).name("JavaScript analysis");
  }
}
