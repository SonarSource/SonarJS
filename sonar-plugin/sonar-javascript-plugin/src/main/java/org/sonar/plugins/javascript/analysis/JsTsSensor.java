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

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.stream.StreamSupport;
import javax.annotation.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sonar.api.batch.DependedUpon;
import org.sonar.api.batch.fs.FileSystem;
import org.sonar.api.batch.fs.InputFile;
import org.sonar.api.batch.sensor.SensorContext;
import org.sonar.api.batch.sensor.SensorDescriptor;
import org.sonar.css.CssLanguage;
import org.sonar.css.CssRules;
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
import org.sonar.plugins.javascript.bridge.WebSocketMessageHandler;
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonar.plugins.javascript.external.EslintReportImporter;
import org.sonar.plugins.javascript.external.ExternalIssue;
import org.sonar.plugins.javascript.external.ExternalIssueRepository;
import org.sonar.plugins.javascript.sonarlint.FSListener;

@DependedUpon("js-analysis")
public class JsTsSensor extends AbstractBridgeSensor {

  private static final Logger LOG = LoggerFactory.getLogger(JsTsSensor.class);
  private static final Gson GSON = new Gson();

  private final JsTsChecks checks;
  private final AnalysisConsumers consumers;
  private final AnalysisProcessor analysisProcessor;
  private final AnalysisWarningsWrapper analysisWarnings;
  private final CssRules cssRules;
  FSListener fsListener;

  public JsTsSensor(
    JsTsChecks checks,
    BridgeServer bridgeServer,
    AnalysisProcessor analysisProcessor,
    AnalysisWarningsWrapper analysisWarnings,
    AnalysisConsumers consumers,
    CssRules cssRules
  ) {
    this(checks, bridgeServer, analysisProcessor, analysisWarnings, consumers, cssRules, null);
  }

  public JsTsSensor(
    JsTsChecks checks,
    BridgeServer bridgeServer,
    AnalysisProcessor analysisProcessor,
    AnalysisWarningsWrapper analysisWarnings,
    AnalysisConsumers consumers,
    CssRules cssRules,
    @Nullable FSListener fsListener
  ) {
    super(bridgeServer, "JS/TS");
    this.checks = checks;
    this.consumers = consumers;
    this.analysisProcessor = analysisProcessor;
    this.fsListener = fsListener;
    this.analysisWarnings = analysisWarnings;
    this.cssRules = cssRules;
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      .onlyOnLanguages(
        JavaScriptLanguage.KEY,
        TypeScriptLanguage.KEY,
        CssLanguage.KEY,
        "yaml",
        "web"
      )
      .name("JavaScript/TypeScript/CSS analysis");
  }

  @Override
  protected List<InputFile> getInputFiles() {
    FileSystem fileSystem = context.getSensorContext().fileSystem();
    var p = fileSystem.predicates();
    var jsTsPredicate = JavaScriptFilePredicate.getJsTsPredicate(fileSystem);

    // HTML files
    var htmlPredicate = p.and(
      p.hasLanguage("web"),
      p.or(p.hasExtension("htm"), p.hasExtension("html"))
    );

    // YAML files (with SAM template check)
    var yamlPredicate = p.and(JavaScriptFilePredicate.getYamlPredicate(fileSystem), input ->
      JavaScriptFilePredicate.isSamTemplate(input, LOG)
    );

    // CSS files
    var cssPredicate = p.and(p.hasType(InputFile.Type.MAIN), p.hasLanguages(CssLanguage.KEY));

    return StreamSupport.stream(
      fileSystem
        .inputFiles(p.or(jsTsPredicate, htmlPredicate, yamlPredicate, cssPredicate))
        .spliterator(),
      false
    ).toList();
  }

  @Override
  protected void analyzeFiles(List<InputFile> inputFiles) {
    var eslintImporter = new EslintReportImporter();
    var externalIssues = eslintImporter.execute(context);
    try {
      var handler = new AnalyzeProjectHandler(context, inputFiles, externalIssues);
      bridgeServer.analyzeProject(handler);
      new PluginTelemetry(context, bridgeServer).reportTelemetry();
      consumers.doneAnalysis(context.getSensorContext());
    } catch (CompletionException e) {
      if (e.getCause() instanceof CancellationException nestedException) {
        throw nestedException;
      }
      throw e;
    } catch (Exception e) {
      LOG.error("Failed to get response from analysis", e);
      throw e;
    }
  }

  class AnalyzeProjectHandler implements WebSocketMessageHandler<ProjectAnalysisRequest> {

    private final JsTsContext<?> context;
    private final Map<String, List<ExternalIssue>> externalIssues;
    private final List<InputFile> inputFiles;
    private final Map<String, InputFile> fileToInputFile = new HashMap<>();
    private final HashMap<String, CacheStrategy> fileToCacheStrategy = new HashMap<>();
    private final CompletableFuture<Void> handle;

    AnalyzeProjectHandler(
      JsTsContext<?> context,
      List<InputFile> inputFiles,
      Map<String, List<ExternalIssue>> externalIssues
    ) {
      this.inputFiles = inputFiles;
      this.context = context;
      this.handle = new CompletableFuture<>();
      this.externalIssues = externalIssues;
    }

    @Override
    public ProjectAnalysisRequest getRequest() {
      var files = new HashMap<String, BridgeServer.JsTsFile>();
      try {
        for (InputFile inputFile : inputFiles) {
          CacheStrategy cacheStrategy = null;
          cacheStrategy = CacheStrategies.getStrategyFor(context, inputFile);
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
      } catch (IOException e) {
        handle.completeExceptionally(new IllegalStateException(e));
      }
      if (fsListener != null) {
        configuration.setFsEvents(fsListener.listFSEvents());
      }
      configuration.setSkipAst(context.skipAst(consumers));
      var request = new BridgeServer.ProjectAnalysisRequest(
        files,
        checks.enabledEslintRules(),
        configuration
      );
      request.setCssRules(cssRules.getStylelintRules());
      return request;
    }

    public CompletableFuture<Void> getFuture() {
      return handle;
    }

    @Override
    public SensorContext getContext() {
      return context.getSensorContext();
    }

    @Override
    public void handleMessage(JsonObject jsonObject) {
      var messageType = jsonObject.get("messageType").getAsString();
      if ("fileResult".equals(messageType)) {
        var filePath = jsonObject.get("filename").getAsString();
        var response = BridgeServer.AnalysisResponse.fromDTO(
          GSON.fromJson(jsonObject, BridgeServer.AnalysisResponseDTO.class)
        );
        var file = fileToInputFile.get(filePath);
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
          handle.completeExceptionally(new IllegalStateException(e));
        }
        acceptAstResponse(response.ast(), file);
      } else if ("meta".equals(messageType)) {
        var meta = GSON.fromJson(jsonObject, BridgeServer.ProjectAnalysisMetaResponse.class);
        meta.warnings().forEach(analysisWarnings::addUnique);
        handle.complete(null);
      } else if ("cancelled".equals(messageType)) {
        handle.completeExceptionally(
          new CancellationException(
            "Analysis interrupted because the SensorContext is in cancelled state"
          )
        );
      }
    }

    @Override
    public void onClose(int code, String reason, boolean remote) {
      handle.completeExceptionally(
        new IllegalStateException("WebSocket connection closed abnormally: " + reason)
      );
    }

    @Override
    public void onError(Exception ex) {
      handle.completeExceptionally(new IllegalStateException("WebSocket connection error", ex));
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
