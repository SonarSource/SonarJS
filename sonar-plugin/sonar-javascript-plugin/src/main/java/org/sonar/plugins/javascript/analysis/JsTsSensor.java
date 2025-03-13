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
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.stream.StreamSupport;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.DependedUpon;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.plugins.javascript.JavaScriptFilePredicate;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.analysis.cache.CacheAnalysis;
import org.sonar.plugins.javascript.analysis.cache.CacheStrategies;
import org.sonar.plugins.javascript.analysis.cache.CacheStrategy;
import org.sonar.plugins.javascript.api.JsFile;
import org.sonar.plugins.javascript.api.estree.ESTree;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.ESTreeFactory;
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonar.plugins.javascript.external.EslintReportImporter;
import org.sonar.plugins.javascript.external.ExternalIssue;
import org.sonar.plugins.javascript.sonarlint.TsConfigCache;
import org.sonar.plugins.javascript.utils.Exclusions;

@DependedUpon("js-analysis")
public class JsTsSensor extends AbstractBridgeSensor {

  private static final Logger LOG = LoggerFactory.getLogger(JsTsSensor.class);

  private final JsTsChecks checks;
  private final AnalysisConsumers consumers;
  private final AnalysisProcessor analysisProcessor;
  TsConfigCache tsConfigCache;

  public JsTsSensor(
    JsTsChecks checks,
    BridgeServer bridgeServer,
    AnalysisProcessor analysisProcessor,
    AnalysisConsumers consumers
  ) {
    this(checks, bridgeServer, analysisProcessor, consumers, null);
  }

  public JsTsSensor(
    JsTsChecks checks,
    BridgeServer bridgeServer,
    AnalysisProcessor analysisProcessor,
    AnalysisConsumers consumers,
    @Nullable TsConfigCache tsConfigCache
  ) {
    super(bridgeServer, "JS/TS");
    this.checks = checks;
    this.consumers = consumers;
    this.analysisProcessor = analysisProcessor;
    this.tsConfigCache = tsConfigCache;
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
    var issues = new ArrayList<BridgeServer.Issue>();
    var filesToAnalyze = new ArrayList<InputFile>();
    var fileToInputFile = new HashMap<String, InputFile>();
    var fileToCacheStrategy = new HashMap<String, CacheStrategy>();
    for (InputFile inputFile : inputFiles) {
      var cacheStrategy = CacheStrategies.getStrategyFor(context, inputFile);
      if (cacheStrategy.isAnalysisRequired()) {
        filesToAnalyze.add(inputFile);
        fileToInputFile.put(inputFile.absolutePath(), inputFile);
        fileToCacheStrategy.put(inputFile.absolutePath(), cacheStrategy);
      } else {
        LOG.debug("Processing cache analysis of file: {}", inputFile.uri());
        var cacheAnalysis = cacheStrategy.readAnalysisFromCache();
        analysisProcessor.processCacheAnalysis(context, inputFile, cacheAnalysis);
      }
    }

    var files = new HashMap<String, BridgeServer.JsTsFile>();
    for (InputFile file : filesToAnalyze) {
      files.put(
        file.absolutePath(),
        new BridgeServer.JsTsFile(
          file.absolutePath(),
          file.type().toString(),
          file.status(),
          ContextUtils.shouldSendFileContent(context, file) ? file.contents() : null
        )
      );
    }
    var configuration = new BridgeServer.ProjectAnalysisConfiguration(
      ContextUtils.isSonarLint(context),
      this.tsConfigCache != null && this.tsConfigCache.getAndResetShouldClearDependenciesCache(),
      ContextUtils.allowTsParserJsFiles(context),
      ContextUtils.getAnalysisMode(context),
      ContextUtils.skipAst(context, consumers),
      ContextUtils.ignoreHeaderComments(context),
      ContextUtils.getMaxFileSizeProperty(context.config()),
      ContextUtils.getTypeCheckingLimit(context),
      environments,
      globals,
      TypeScriptLanguage.getExtensions(context.config()),
      JavaScriptLanguage.getExtensions(context.config()),
      TsConfigProvider.getTsConfigPaths(context),
      Arrays.asList(Exclusions.getExcludedPaths(context.config()))
    );

    var request = new BridgeServer.ProjectAnalysisRequest(
      files,
      checks.eslintRules(),
      configuration,
      context.fileSystem().baseDir().getAbsolutePath()
    );
    try {
      var projectResponse = bridgeServer.analyzeProject(request);
      for (var entry : projectResponse.files().entrySet()) {
        var filePath = entry.getKey();
        var response = entry.getValue();
        var file = fileToInputFile.get(filePath);
        var cacheStrategy = fileToCacheStrategy.get(filePath);
        issues.addAll(analysisProcessor.processResponse(context, checks, file, response));
        cacheStrategy.writeAnalysisToCache(
          CacheAnalysis.fromResponse(response.ucfgPaths(), response.cpdTokens()),
          file
        );
        acceptAstResponse(response, file);
      }
      new PluginTelemetry(context, bridgeServer).reportTelemetry();
    } catch (Exception e) {
      LOG.error("Failed to get response from analysis", e);
      throw e;
    }
    consumers.doneAnalysis();

    return issues;
  }

  @Override
  protected List<ExternalIssue> getESLintIssues(SensorContext context) {
    var importer = new EslintReportImporter();

    return importer.execute(context);
  }

  private void acceptAstResponse(BridgeServer.AnalysisResponse response, InputFile file) {
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
