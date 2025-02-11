/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the Sonar Source-Available License Version 1, as published by SonarSource SA.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the Sonar Source-Available License for more details.
 *
 * You should have received a copy of the Sonar Source-Available License
 * along with this program; if not, see https://sonarsource.com/license/ssal/
 */
package org.sonar.plugins.javascript.analysis;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.StreamSupport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.DependedUpon;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.plugins.javascript.CancellationException;
import org.sonar.plugins.javascript.JavaScriptFilePredicate;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.analysis.cache.CacheAnalysis;
import org.sonar.plugins.javascript.analysis.cache.CacheStrategies;
import org.sonar.plugins.javascript.analysis.cache.CacheStrategy;
import org.sonar.plugins.javascript.api.JsFile;
import org.sonar.plugins.javascript.api.estree.ESTree;
import org.sonar.plugins.javascript.bridge.AnalysisMode;
import org.sonar.plugins.javascript.bridge.AnalysisWarningsWrapper;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.ESTreeFactory;
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonar.plugins.javascript.utils.ProgressReport;

@DependedUpon("js-analysis")
public class JsTsSensor extends AbstractBridgeSensor {

  private static final Logger LOG = LoggerFactory.getLogger(JsTsSensor.class);
  private final JsTsChecks checks;
  private final AnalysisConsumers consumers;
  final AnalysisProcessor analysisProcessor;
  protected final AnalysisWarningsWrapper analysisWarnings;
  static final String PROGRESS_REPORT_TITLE = "Progress of JavaScript/TypeScript analysis";
  static final long PROGRESS_REPORT_PERIOD = TimeUnit.SECONDS.toMillis(10);

  public JsTsSensor(
    JsTsChecks checks,
    BridgeServer bridgeServer,
    AnalysisConsumers consumers,
    AnalysisProcessor analysisProcessor,
    AnalysisWarningsWrapper analysisWarnings
  ) {
    super(bridgeServer, "JS/TS");
    this.checks = checks;
    this.consumers = consumers;
    this.analysisProcessor = analysisProcessor;
    this.analysisWarnings = analysisWarnings;
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
    return StreamSupport.stream(
      fileSystem.inputFiles(allFilesPredicate).spliterator(),
      false
    ).toList();
  }

  @Override
  protected List<BridgeServer.Issue> analyzeFiles(List<InputFile> inputFiles) throws IOException {
    var analysisMode = AnalysisMode.getMode(context);
    ProgressReport progressReport = new ProgressReport(
      PROGRESS_REPORT_TITLE,
      PROGRESS_REPORT_PERIOD
    );
    progressReport.start(inputFiles.size(), inputFiles.iterator().next().toString());
    boolean success;

    bridgeServer.initLinter(
      checks.eslintRules(),
      environments,
      globals,
      analysisMode,
      context.fileSystem().baseDir().getAbsolutePath(),
      exclusions
    );

    if (context.isCancelled()) {
      throw new CancellationException(
        "Analysis interrupted because the SensorContext is in cancelled state"
      );
    }
    var issues = new ArrayList<BridgeServer.Issue>();
    var filesToAnalyze = new HashMap<String, BridgeServer.JsTsFile>();
    var fileToInputFile = new HashMap<String, InputFile>();
    var fileToCacheStrategy = new HashMap<String, CacheStrategy>();
    for (InputFile inputFile : inputFiles) {
      var cacheStrategy = CacheStrategies.getStrategyFor(context, inputFile);
      if (cacheStrategy.isAnalysisRequired()) {
        filesToAnalyze.put(
          inputFile.absolutePath(),
          new BridgeServer.JsTsFile(
            contextUtils.shouldSendFileContent(inputFile) ? inputFile.contents() : null,
            contextUtils.ignoreHeaderComments(),
            inputFile.type().toString(),
            inputFileLanguage(inputFile)
          )
        );
        fileToInputFile.put(inputFile.absolutePath(), inputFile);
        fileToCacheStrategy.put(inputFile.absolutePath(), cacheStrategy);
      } else {
        LOG.debug("Processing cache analysis of file: {}", inputFile.uri());
        var cacheAnalysis = cacheStrategy.readAnalysisFromCache();
        analysisProcessor.processCacheAnalysis(context, inputFile, cacheAnalysis);
      }
    }
    var skipAst =
      !consumers.hasConsumers() ||
      !(contextUtils.isSonarArmorEnabled() ||
        contextUtils.isSonarJasminEnabled() ||
        contextUtils.isSonarJaredEnabled());

    var request = new BridgeServer.ProjectAnalysisRequest(
      filesToAnalyze,
      checks.eslintRules(),
      environments,
      globals,
      context.fileSystem().baseDir().getAbsolutePath(),
      exclusions,
      false,
      null,
      skipAst
    );
    try {
      var projectResponse = bridgeServer.analyzeProject(request);
      for (var entry : projectResponse.files().entrySet()) {
        var filePath = entry.getKey();
        var response = entry.getValue();
        var file = fileToInputFile.get(filePath);
        var cacheStrategy = fileToCacheStrategy.get(filePath);
        analysisProcessor.processResponse(context, checks, file, response);
        cacheStrategy.writeAnalysisToCache(
          CacheAnalysis.fromResponse(response.ucfgPaths(), response.cpdTokens()),
          file
        );
        acceptAstResponse(response, file);
      }
      success = true;
      new PluginTelemetry(context, bridgeServer).reportTelemetry();
    } catch (Exception e) {
      LOG.error("Failed to get response from analysis", e);
      throw e;
    }
    consumers.doneAnalysis();
    if (analysisProcessor.parsingErrorFilesCount() > 0) {
      this.analysisWarnings.addUnique(
          String.format(
            "There were parsing errors in %d files while analyzing the project. Check the logs for further details.",
            analysisProcessor.parsingErrorFilesCount()
          )
        );
    }
    if (success) {
      progressReport.stop();
    } else {
      progressReport.cancel();
    }
    return issues;
  }

  protected static String inputFileLanguage(InputFile file) {
    return JavaScriptFilePredicate.isTypeScriptFile(file)
      ? TypeScriptLanguage.KEY
      : JavaScriptLanguage.KEY;
  }

  protected boolean isJavaScript(InputFile file) {
    return inputFileLanguage(file).equals(JavaScriptLanguage.KEY);
  }

  protected void acceptAstResponse(BridgeServer.AnalysisResponse response, InputFile file) {
    Node responseAst = response.ast();
    if (responseAst != null) {
      // When we haven't serialized the AST:
      // either because no consumer is listening
      // or the file extension or AST nodes are unsupported
      try {
        ESTree.Program program = ESTreeFactory.from(responseAst, ESTree.Program.class);
        consumers.accept(new JsFile(file, program));
      } catch (Exception e) {
        LOG.debug("Failed to deserialize AST for file: {}", file.uri(), e);
      }
    }
  }
}
