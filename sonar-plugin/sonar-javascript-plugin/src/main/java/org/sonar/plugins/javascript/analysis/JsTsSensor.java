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

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.StreamSupport;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.DependedUpon;
import org.sonar.api.batch.fs.FilePredicate;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.plugins.javascript.JavaScriptFilePredicate;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.analysis.cache.CacheAnalysis;
import org.sonar.plugins.javascript.analysis.cache.CacheStrategies;
import org.sonar.plugins.javascript.analysis.cache.CacheStrategy;
import org.sonar.plugins.javascript.api.JsFile;
import org.sonar.plugins.javascript.api.estree.ESTree;
import org.sonar.plugins.javascript.bridge.AnalysisWarningsWrapper;
import org.sonar.plugins.javascript.bridge.AnalyzeProjectHandler;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.ESTreeFactory;
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonar.plugins.javascript.external.EslintReportImporter;
import org.sonar.plugins.javascript.external.ExternalIssue;
import org.sonar.plugins.javascript.sonarlint.FSListener;

@DependedUpon("js-analysis")
public class JsTsSensor extends AbstractBridgeSensor {

  private static final Logger LOG = LoggerFactory.getLogger(JsTsSensor.class);
  private static final Gson GSON = new Gson();

  private final AbstractAnalysis analysis;
  private final JsTsChecks checks;
  private final AnalysisConsumers consumers;
  private final AnalysisProcessor analysisProcessor;
  private final AnalysisWarningsWrapper analysisWarnings;
  FSListener fsListener;

  public JsTsSensor(
    JsTsChecks checks,
    BridgeServer bridgeServer,
    AbstractAnalysis analysis,
    AnalysisProcessor analysisProcessor,
    AnalysisWarningsWrapper analysisWarnings,
    AnalysisConsumers consumers
  ) {
    this(checks, bridgeServer, analysis, analysisProcessor, analysisWarnings, consumers, null);
  }

  public JsTsSensor(
    JsTsChecks checks,
    BridgeServer bridgeServer,
    AbstractAnalysis analysis,
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
    this.analysis = analysis;
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
  protected List<BridgeServer.Issue> analyzeFiles(List<InputFile> inputFiles) throws IOException {
    if (!context.isAnalyzeProjectEnabled()) {
      bridgeServer.initLinter(
        checks.enabledEslintRules(),
        context.getEnvironments(),
        context.getGlobals(),
        context.getSensorContext().fileSystem().baseDir().getAbsolutePath(),
        context.isSonarLint()
      );

      analysis.initialize(context, checks, consumers, analysisWarnings);
      var issues = analysis.analyzeFiles(inputFiles);
      consumers.doneAnalysis();

      return issues;
    }

    try {
      var issues = bridgeServer.analyzeProject(createAnalyzeProjectHandler(inputFiles)).join();
      new PluginTelemetry(context.getSensorContext(), bridgeServer).reportTelemetry();
      consumers.doneAnalysis();
      return issues;
    } catch (Exception e) {
      LOG.error("Failed to get response from analysis", e);
      throw e;
    }
  }

  @Override
  protected List<ExternalIssue> getESLintIssues(JsTsContext<?> context) {
    var importer = new EslintReportImporter();

    return importer.execute(context);
  }

  AnalyzeProjectHandlerImpl createAnalyzeProjectHandler(List<InputFile> inputFiles) {
    return new AnalyzeProjectHandlerImpl(inputFiles);
  }

  class AnalyzeProjectHandlerImpl implements AnalyzeProjectHandler {

    List<InputFile> inputFiles;
    private final List<BridgeServer.Issue> issues = new ArrayList<>();
    private final List<InputFile> filesToAnalyze = new ArrayList<>();
    private final Map<String, InputFile> fileToInputFile = new HashMap<>();
    private final HashMap<String, CacheStrategy> fileToCacheStrategy = new HashMap<>();
    private CompletableFuture<List<BridgeServer.Issue>> handle;

    AnalyzeProjectHandlerImpl(List<InputFile> inputFiles) {
      this.inputFiles = inputFiles;
    }

    @Override
    public BridgeServer.ProjectAnalysisRequest getRequest() throws IOException {
      var configuration = new BridgeServer.ProjectAnalysisConfiguration(
        context.isSonarLint(),
        fsListener != null ? fsListener.listFSEventsStringified() : List.of(),
        context.allowTsParserJsFiles(),
        context.getAnalysisMode(),
        context.skipAst(consumers),
        context.ignoreHeaderComments(),
        context.getMaxFileSizeProperty(),
        context.getTypeCheckingLimit(),
        context.getEnvironments(),
        context.getGlobals(),
        context.getTsExtensions(),
        context.getJsExtensions(),
        context.getTsConfigPaths(),
        Arrays.asList(context.getExcludedPaths())
      );
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
          acceptAstResponse(cacheAnalysis.getAst(), inputFile);
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
            context.shouldSendFileContent(file) ? file.contents() : null
          )
        );
      }
      return new BridgeServer.ProjectAnalysisRequest(
        files,
        checks.enabledEslintRules(),
        configuration,
        context.getSensorContext().fileSystem().baseDir().getAbsolutePath()
      );
    }

    @Override
    public void processMessage(String message) throws IOException {
      JsonObject jsonObject = JsonParser.parseString(message).getAsJsonObject();
      var messageType = jsonObject.get("messageType").getAsString();
      switch (messageType) {
        case "fileResult":
          var filePath = jsonObject.get("filename").getAsString();
          var response = BridgeServer.AnalysisResponse.fromDTO(
            GSON.fromJson(jsonObject, BridgeServer.AnalysisResponseDTO.class)
          );
          var file = fileToInputFile.get(filePath);
          var cacheStrategy = fileToCacheStrategy.get(filePath);
          issues.addAll(analysisProcessor.processResponse(context, checks, file, response));
          cacheStrategy.writeAnalysisToCache(
            CacheAnalysis.fromResponse(response.ucfgPaths(), response.cpdTokens(), response.ast()),
            file
          );
          acceptAstResponse(response.ast(), file);
          break;
        case "meta":
          var meta = GSON.fromJson(jsonObject, BridgeServer.ProjectAnalysisMetaResponse.class);
          handle.complete(issues);
          meta.warnings().forEach(analysisWarnings::addUnique);
          break;
        default:
          throw new IllegalStateException("Invalid message type: " + messageType);
      }
    }

    @Override
    public void setFutureHandle(CompletableFuture<List<BridgeServer.Issue>> handle) {
      this.handle = handle;
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
