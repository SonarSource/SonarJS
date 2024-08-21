/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2024 SonarSource SA
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
package org.sonar.plugins.javascript.analysis;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.StreamSupport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FilePredicates;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.plugins.javascript.CancellationException;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.analysis.cache.CacheAnalysis;
import org.sonar.plugins.javascript.analysis.cache.CacheStrategies;
import org.sonar.plugins.javascript.analysis.cache.CacheStrategy;
import org.sonar.plugins.javascript.bridge.AnalysisMode;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.BridgeServer.JsAnalysisRequest;
import org.sonar.plugins.javascript.utils.ProgressReport;

public class HtmlSensor extends AbstractBridgeSensor {

  public static final String LANGUAGE = "web";

  private static final Logger LOG = LoggerFactory.getLogger(HtmlSensor.class);
  private final JsTsChecks checks;
  private final AnalysisProcessor analysisProcessor;
  private AnalysisMode analysisMode;

  public HtmlSensor(
    JsTsChecks checks,
    BridgeServer bridgeServer,
    AnalysisProcessor processAnalysis
  ) {
    // The monitoring sensor remains inactive during HTML files analysis, as the
    // bridge doesn't provide nor compute metrics for such files.
    super(bridgeServer, "JS in HTML");
    this.analysisProcessor = processAnalysis;
    this.checks = checks;
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor.onlyOnLanguage(LANGUAGE).name("JavaScript inside HTML analysis");
  }

  @Override
  protected void analyzeFiles(List<InputFile> inputFiles) throws IOException {
    var progressReport = new ProgressReport("Analysis progress", TimeUnit.SECONDS.toMillis(10));
    analysisMode = AnalysisMode.getMode(context);
    var success = false;
    try {
      progressReport.start(inputFiles.size(), inputFiles.iterator().next().toString());
      bridgeServer.initLinter(
        AnalysisMode.getHtmlFileRules(checks.eslintRules()),
        environments,
        globals,
        analysisMode,
        context.fileSystem().baseDir().getAbsolutePath(),
        exclusions
      );
      for (var inputFile : inputFiles) {
        if (context.isCancelled()) {
          throw new CancellationException(
            "Analysis interrupted because the SensorContext is in cancelled state"
          );
        }
        progressReport.nextFile(inputFile.toString());
        var cacheStrategy = CacheStrategies.getStrategyFor(context, inputFile);
        if (cacheStrategy.isAnalysisRequired()) {
          analyze(inputFile, cacheStrategy);
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

  @Override
  protected List<InputFile> getInputFiles() {
    var fileSystem = context.fileSystem();
    FilePredicates p = fileSystem.predicates();
    FilePredicate filePredicate = p.and(
      p.hasLanguage(HtmlSensor.LANGUAGE),
      fileSystem
        .predicates()
        .or(
          fileSystem.predicates().hasExtension("htm"),
          fileSystem.predicates().hasExtension("html")
        )
    );
    var inputFiles = context.fileSystem().inputFiles(filePredicate);
    return StreamSupport.stream(inputFiles.spliterator(), false).toList();
  }

  private void analyze(InputFile file, CacheStrategy cacheStrategy) throws IOException {
    try {
      LOG.debug("Analyzing file: {}", file.uri());
      var fileContent = contextUtils.shouldSendFileContent(file) ? file.contents() : null;
      var jsAnalysisRequest = new JsAnalysisRequest(
        file.absolutePath(),
        file.type().toString(),
        JavaScriptLanguage.KEY,
        fileContent,
        contextUtils.ignoreHeaderComments(),
        null,
        null,
        analysisMode.getLinterIdFor(file),
        false
      );
      var response = bridgeServer.analyzeHtml(jsAnalysisRequest);
      analysisProcessor.processResponse(context, checks, file, response);
      cacheStrategy.writeAnalysisToCache(
        CacheAnalysis.fromResponse(response.ucfgPaths(), response.cpdTokens()),
        file
      );
    } catch (IOException e) {
      LOG.error("Failed to get response while analyzing " + file.uri(), e);
      throw e;
    }
  }
}
