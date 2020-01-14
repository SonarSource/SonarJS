/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2020 SonarSource SA
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
import org.sonar.api.batch.fs.InputFile.Type;
import org.sonar.api.batch.rule.CheckFactory;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.api.issue.NoSonarFilter;
import org.sonar.api.measures.FileLinesContextFactory;
import org.sonar.api.notifications.AnalysisWarnings;
import org.sonar.api.utils.log.Logger;
import org.sonar.api.utils.log.Loggers;
import org.sonar.api.utils.log.Profiler;
import org.sonar.javascript.checks.CheckList;
import org.sonar.plugins.javascript.CancellationException;
import org.sonar.plugins.javascript.JavaScriptChecks;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.JavaScriptSensor;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisRequest;
import org.sonar.plugins.javascript.eslint.EslintBridgeServer.AnalysisResponse;
import org.sonarsource.analyzer.commons.ProgressReport;

public class JavaScriptEslintBasedSensor extends AbstractEslintSensor {

  private static final Logger LOG = Loggers.get(JavaScriptEslintBasedSensor.class);
  private static final Profiler PROFILER = Profiler.create(LOG);
  private final JavaScriptSensor javaScriptSensor;


  /**
   * Required for SonarLint
   */
  public JavaScriptEslintBasedSensor(CheckFactory checkFactory, NoSonarFilter noSonarFilter,
                                     FileLinesContextFactory fileLinesContextFactory, EslintBridgeServer eslintBridgeServer, JavaScriptSensor javaScriptSensor) {
    this(checkFactory, noSonarFilter, fileLinesContextFactory, eslintBridgeServer, null, javaScriptSensor);
  }

  public JavaScriptEslintBasedSensor(CheckFactory checkFactory, NoSonarFilter noSonarFilter,
                                     FileLinesContextFactory fileLinesContextFactory, EslintBridgeServer eslintBridgeServer,
                                     @Nullable AnalysisWarnings analysisWarnings, JavaScriptSensor javaScriptSensor) {
    super(checks(checkFactory), noSonarFilter, fileLinesContextFactory, eslintBridgeServer, analysisWarnings);
    this.javaScriptSensor = javaScriptSensor;
  }

  private static JavaScriptChecks checks(CheckFactory checkFactory) {
    return JavaScriptChecks.createJavaScriptChecks(checkFactory).addChecks(CheckList.JS_REPOSITORY_KEY, CheckList.getJavaScriptChecks());
  }

  @Override
  void analyzeFiles() throws IOException, InterruptedException {
    runEslintAnalysis();
    PROFILER.startInfo("Sensor SonarJS [javascript]");
    javaScriptSensor.execute(context);
    PROFILER.stopInfo();
  }

  private void runEslintAnalysis() throws IOException, InterruptedException {
    ProgressReport progressReport = new ProgressReport("Analysis progress", TimeUnit.SECONDS.toMillis(10));
    boolean success = false;
    try {
      List<InputFile> inputFiles = getInputFiles();
      progressReport.start(inputFiles.stream().map(InputFile::toString).collect(Collectors.toList()));
      for (InputFile inputFile : inputFiles) {
        if (context.isCancelled()) {
          throw new CancellationException("Analysis interrupted because the SensorContext is in cancelled state");
        }
        if (eslintBridgeServer.isAlive()) {
          analyze(inputFile);
          progressReport.nextFile();
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
      progressReport.join();
    }
  }

  private void analyze(InputFile file) throws IOException {
    try {
      String fileContent = shouldSendFileContent(file) ? file.contents() : null;
      AnalysisRequest analysisRequest = new AnalysisRequest(file.absolutePath(), fileContent, rules, ignoreHeaderComments(), null);
      AnalysisResponse response = eslintBridgeServer.analyzeJavaScript(analysisRequest);
      processResponse(file, response);
    } catch (IOException e) {
      LOG.error("Failed to get response while analyzing " + file.uri(), e);
      throw e;
    }
  }

  private List<InputFile> getInputFiles() {
    FileSystem fileSystem = context.fileSystem();
    FilePredicate mainFilePredicate = context.fileSystem().predicates().and(
      fileSystem.predicates().hasType(InputFile.Type.MAIN),
      fileSystem.predicates().hasLanguage(JavaScriptLanguage.KEY));
    return StreamSupport.stream(fileSystem.inputFiles(mainFilePredicate).spliterator(), false)
      .collect(Collectors.toList());
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      .onlyOnLanguage(JavaScriptLanguage.KEY)
      .name("JavaScript analysis")
      .onlyOnFileType(Type.MAIN);
  }
}
