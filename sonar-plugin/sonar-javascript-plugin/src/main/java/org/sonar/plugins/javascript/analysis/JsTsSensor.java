/*
 * SonarQube JavaScript Plugin
 * Copyright (C) 2011-2025 SonarSource Sàrl
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletionException;
import java.util.stream.StreamSupport;
import javax.annotation.Nullable;
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
import org.sonar.plugins.javascript.bridge.AnalysisWarningsWrapper;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.BridgeServer.ProjectAnalysisRequest;
import org.sonar.plugins.javascript.bridge.ESTreeFactory;
import org.sonar.plugins.javascript.bridge.GrpcProjectAnalysisHandler;
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonar.plugins.javascript.external.EslintReportImporter;
import org.sonar.plugins.javascript.external.ExternalIssue;
import org.sonar.plugins.javascript.external.ExternalIssueRepository;
import org.sonar.plugins.javascript.sonarlint.FSListener;

@DependedUpon("js-analysis")
public class JsTsSensor extends AbstractBridgeSensor {

  private static final Logger LOG = LoggerFactory.getLogger(JsTsSensor.class);

  private final JsTsChecks checks;
  private final AnalysisConsumers consumers;
  private final AnalysisProcessor analysisProcessor;
  private final AnalysisWarningsWrapper analysisWarnings;
  FSListener fsListener;

  public JsTsSensor(
    JsTsChecks checks,
    BridgeServer bridgeServer,
    AnalysisProcessor analysisProcessor,
    AnalysisWarningsWrapper analysisWarnings,
    AnalysisConsumers consumers
  ) {
    this(checks, bridgeServer, analysisProcessor, analysisWarnings, consumers, null);
  }

  public JsTsSensor(
    JsTsChecks checks,
    BridgeServer bridgeServer,
    AnalysisProcessor analysisProcessor,
    AnalysisWarningsWrapper analysisWarnings,
    AnalysisConsumers consumers,
    @Nullable FSListener fsListener
  ) {
    super(bridgeServer, "JS/TS");
    this.checks = checks;
    this.consumers = consumers;
    this.analysisProcessor = analysisProcessor;
    this.fsListener = fsListener;
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
    FileSystem fileSystem = context.getSensorContext().fileSystem();
    FilePredicate allFilesPredicate = JavaScriptFilePredicate.getJsTsPredicate(fileSystem);
    return StreamSupport.stream(
      fileSystem.inputFiles(allFilesPredicate).spliterator(),
      false
    ).toList();
  }

  @Override
  protected void analyzeFiles(List<InputFile> inputFiles) {
    var eslintImporter = new EslintReportImporter();
    var externalIssues = eslintImporter.execute(context);
    try {
      var projectAnalysis = new ProjectAnalysisHelper(context, inputFiles, externalIssues);
      var request = projectAnalysis.buildRequest();
      var handler = new GrpcProjectAnalysisHandler();

      // Execute the gRPC streaming call
      bridgeServer.analyzeProject(handler, request);

      // Wait for completion
      handler.getFuture().join();

      // Check for cancellation
      if (handler.isCancelled()) {
        throw new CancellationException(
          "Analysis interrupted because the SensorContext is in cancelled state"
        );
      }

      // Check for errors
      if (handler.getErrorMessage() != null) {
        throw new IllegalStateException("Project analysis failed: " + handler.getErrorMessage());
      }

      // Process all file results
      projectAnalysis.processResults(handler.getFileResults());

      // Process warnings
      handler.getWarnings().forEach(analysisWarnings::addUnique);

      new PluginTelemetry(context, bridgeServer).reportTelemetry();
      consumers.doneAnalysis(context.getSensorContext());
    } catch (CompletionException e) {
      if (e.getCause() instanceof CancellationException nestedException) {
        throw nestedException;
      }
      throw e;
    } catch (CancellationException e) {
      throw e;
    } catch (Exception e) {
      LOG.error("Failed to get response from analysis", e);
      throw new IllegalStateException("Failed to get response from analysis", e);
    }
  }

  /**
   * Helper class that handles the project analysis request building and result processing.
   * Replaces the WebSocket-based AnalyzeProjectHandler.
   */
  class ProjectAnalysisHelper {

    private final JsTsContext<?> context;
    private final Map<String, List<ExternalIssue>> externalIssues;
    private final List<InputFile> inputFiles;
    private final Map<String, InputFile> fileToInputFile = new HashMap<>();
    private final Map<String, CacheStrategy> fileToCacheStrategy = new HashMap<>();

    ProjectAnalysisHelper(
      JsTsContext<?> context,
      List<InputFile> inputFiles,
      Map<String, List<ExternalIssue>> externalIssues
    ) {
      this.inputFiles = inputFiles;
      this.context = context;
      this.externalIssues = externalIssues;
    }

    ProjectAnalysisRequest buildRequest() throws IOException {
      var files = new HashMap<String, BridgeServer.JsTsFile>();

      for (InputFile inputFile : inputFiles) {
        CacheStrategy cacheStrategy = CacheStrategies.getStrategyFor(context, inputFile);
        if (cacheStrategy.isAnalysisRequired()) {
          files.put(
            inputFile.absolutePath(),
            new BridgeServer.JsTsFile(
              inputFile.absolutePath(),
              inputFile.type().toString(),
              inputFile.status(),
              context.shouldSendFileContent(inputFile) ? inputFile.contents() : null
            )
          );
          fileToInputFile.put(inputFile.absolutePath(), inputFile);
          fileToCacheStrategy.put(inputFile.absolutePath(), cacheStrategy);
        } else {
          LOG.debug("Processing cache analysis of file: {}", inputFile.uri());
          var cacheAnalysis = cacheStrategy.readAnalysisFromCache();
          analysisProcessor.processCacheAnalysis(context, inputFile, cacheAnalysis);
          acceptAstResponse(cacheAnalysis.getAst(), inputFile);
        }
      }

      if (fsListener != null) {
        configuration.setFsEvents(fsListener.listFSEvents());
      }
      configuration.setSkipAst(context.skipAst(consumers));

      return new BridgeServer.ProjectAnalysisRequest(
        files,
        checks.enabledEslintRules(),
        configuration
      );
    }

    void processResults(Map<String, BridgeServer.AnalysisResponse> fileResults) {
      for (Map.Entry<String, BridgeServer.AnalysisResponse> entry : fileResults.entrySet()) {
        String filePath = entry.getKey();
        BridgeServer.AnalysisResponse response = entry.getValue();

        var file = fileToInputFile.get(filePath);
        if (file == null) {
          LOG.warn("Received analysis result for unknown file: {}", filePath);
          continue;
        }

        var cacheStrategy = fileToCacheStrategy.get(filePath);
        var issues = analysisProcessor.processResponse(context, checks, file, response);
        var dedupedIssues = ExternalIssueRepository.deduplicateIssues(
          externalIssues.get(filePath),
          issues
        );
        if (!dedupedIssues.isEmpty()) {
          ExternalIssueRepository.saveESLintIssues(context.getSensorContext(), dedupedIssues);
        }
        externalIssues.remove(filePath);

        try {
          cacheStrategy.writeAnalysisToCache(
            CacheAnalysis.fromResponse(response.cpdTokens(), response.ast()),
            file
          );
        } catch (IOException e) {
          LOG.error("Failed to write analysis to cache for file: {}", filePath, e);
        }

        acceptAstResponse(response.ast(), file);
      }
    }

    private void acceptAstResponse(@Nullable Node responseAst, InputFile file) {
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
}
