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

import static org.sonar.plugins.javascript.nodejs.NodeCommandBuilderImpl.NODE_EXECUTABLE_PROPERTY;

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
import org.sonar.api.batch.sensor.Sensor;
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
import org.sonar.plugins.javascript.api.AnalysisMode;
import org.sonar.plugins.javascript.api.JsFile;
import org.sonar.plugins.javascript.api.estree.ESTree;
import org.sonar.plugins.javascript.bridge.AnalysisWarningsWrapper;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.BridgeServer.ProjectAnalysisRequest;
import org.sonar.plugins.javascript.bridge.BridgeServerConfig;
import org.sonar.plugins.javascript.bridge.ESTreeFactory;
import org.sonar.plugins.javascript.bridge.ServerAlreadyFailedException;
import org.sonar.plugins.javascript.bridge.TsgolintBundle;
import org.sonar.plugins.javascript.bridge.WebSocketMessageHandler;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzerGrpcServer;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzerGrpcServerImpl;
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonar.plugins.javascript.external.EslintReportImporter;
import org.sonar.plugins.javascript.external.ExternalIssue;
import org.sonar.plugins.javascript.external.ExternalIssueRepository;
import org.sonar.plugins.javascript.nodejs.NodeCommandException;
import org.sonar.plugins.javascript.sonarlint.FSListener;

@DependedUpon("js-analysis")
public class WebSensor implements Sensor {

  private static final Logger LOG = LoggerFactory.getLogger(WebSensor.class);
  private static final Gson GSON = new Gson();
  private static final String LANG = "JS/TS";

  private final JsTsChecks checks;
  private final AnalysisConsumers consumers;
  private final AnalysisProcessor analysisProcessor;
  private final AnalysisWarningsWrapper analysisWarnings;
  private final CssRules cssRules;
  private final BridgeServer bridgeServer;
  private final TsgolintBundle tsgolintBundle;
  private BridgeServer.ProjectAnalysisConfiguration configuration;
  private JsTsContext<?> context;
  private AnalyzerGrpcServer tsgolintServer;
  FSListener fsListener;

  public WebSensor(
    JsTsChecks checks,
    BridgeServer bridgeServer,
    AnalysisProcessor analysisProcessor,
    AnalysisWarningsWrapper analysisWarnings,
    AnalysisConsumers consumers,
    CssRules cssRules,
    TsgolintBundle tsgolintBundle
  ) {
    this(
      checks,
      bridgeServer,
      analysisProcessor,
      analysisWarnings,
      consumers,
      cssRules,
      tsgolintBundle,
      null
    );
  }

  public WebSensor(
    JsTsChecks checks,
    BridgeServer bridgeServer,
    AnalysisProcessor analysisProcessor,
    AnalysisWarningsWrapper analysisWarnings,
    AnalysisConsumers consumers,
    CssRules cssRules,
    TsgolintBundle tsgolintBundle,
    @Nullable FSListener fsListener
  ) {
    this.checks = checks;
    this.consumers = consumers;
    this.analysisProcessor = analysisProcessor;
    this.fsListener = fsListener;
    this.analysisWarnings = analysisWarnings;
    this.cssRules = cssRules;
    this.bridgeServer = bridgeServer;
    this.tsgolintBundle = tsgolintBundle;
  }

  @Override
  public void describe(SensorDescriptor descriptor) {
    descriptor
      .onlyOnLanguages(
        JavaScriptLanguage.KEY,
        TypeScriptLanguage.KEY,
        CssLanguage.KEY,
        JavaScriptFilePredicate.YAML_LANGUAGE,
        JavaScriptFilePredicate.WEB_LANGUAGE
      )
      .name("JavaScript/TypeScript/CSS analysis");
  }

  @Override
  public void execute(SensorContext sensorContext) {
    CacheStrategies.reset();
    this.context = new JsTsContext<>(sensorContext);

    try {
      List<InputFile> inputFiles = getInputFiles();
      if (inputFiles.isEmpty()) {
        LOG.info("No input files found for analysis");
        return;
      }
      if (context.getSensorContext().isCancelled()) {
        throw new CancellationException(
          "Analysis interrupted because the SensorContext is in cancelled state"
        );
      }
      var msg =
        context.getAnalysisMode() == AnalysisMode.SKIP_UNCHANGED
          ? "Files which didn't change will only be analyzed for architecture rules, other rules will not be executed"
          : "Analysis of unchanged files will not be skipped (current analysis requires all files to be analyzed)";
      LOG.debug(msg);
      configuration = new BridgeServer.ProjectAnalysisConfiguration(
        sensorContext.fileSystem().baseDir().getAbsolutePath(),
        context
      );
      bridgeServer.startServerLazily(BridgeServerConfig.fromSensorContext(sensorContext));
      startTsgolint();
      analyzeFiles(inputFiles);
    } catch (CancellationException e) {
      // do not propagate the exception
      LOG.info(e.toString());
    } catch (ServerAlreadyFailedException e) {
      LOG.debug(
        "Skipping the start of the bridge server " +
          "as it failed to start during the first analysis or it's not answering anymore"
      );
      LOG.debug("No rules will be executed");
    } catch (NodeCommandException e) {
      LOG.error(e.getMessage(), e);
      throw new IllegalStateException(
        "Error while running Node.js. A supported version of Node.js is required for running the analysis of " +
          LANG +
          " files. Please make sure a supported version of Node.js is available in the PATH or an executable path is provided via '" +
          NODE_EXECUTABLE_PROPERTY +
          "' property. Alternatively, you can exclude " +
          LANG +
          " files from your analysis using the 'sonar.exclusions' configuration property. " +
          "See the docs for configuring the analysis environment: https://docs.sonarsource.com/sonarqube/latest/analyzing-source-code/languages/javascript-typescript-css/",
        e
      );
    } catch (Exception e) {
      LOG.error("Failure during analysis", e);
      throw new IllegalStateException("Analysis of " + LANG + " files failed", e);
    } finally {
      stopTsgolint();
      CacheStrategies.logReport();
    }
  }

  private void startTsgolint() {
    try {
      tsgolintBundle.deploy();
      if (!tsgolintBundle.isAvailable()) {
        LOG.info("tsgolint binary not available, skipping tsgolint analysis");
        return;
      }
      var enabledRules = checks.enabledTsgolintRuleNames();
      if (enabledRules.isEmpty()) {
        LOG.debug("No tsgolint rules enabled in quality profile");
        return;
      }
      tsgolintServer = new AnalyzerGrpcServerImpl(tsgolintBundle.binary());
      tsgolintServer.start();
    } catch (Exception e) {
      LOG.error("Failed to start tsgolint, its rules will produce no issues", e);
      tsgolintServer = null;
    }
  }

  private void stopTsgolint() {
    if (tsgolintServer != null) {
      tsgolintServer.stop();
      tsgolintServer = null;
    }
  }

  private void runTsgolintAnalysis(List<InputFile> inputFiles) {
    if (tsgolintServer == null || !tsgolintServer.isAlive()) {
      return;
    }
    var enabledRules = checks.enabledTsgolintRuleNames();
    if (enabledRules.isEmpty()) {
      return;
    }

    // Collect TypeScript file paths for tsgolint analysis
    var tsFiles = inputFiles
      .stream()
      .filter(f -> TypeScriptLanguage.KEY.equals(f.language()))
      .toList();
    if (tsFiles.isEmpty()) {
      return;
    }

    LOG.info(
      "Running tsgolint analysis on {} TypeScript files with {} rules",
      tsFiles.size(),
      enabledRules.size()
    );

    var filePaths = tsFiles.stream().map(InputFile::absolutePath).toList();

    var request = org.sonar.plugins.javascript.bridge.grpc.AnalyzeProjectRequest.newBuilder()
      .setBaseDir(context.getSensorContext().fileSystem().baseDir().getAbsolutePath())
      .addAllFilePaths(filePaths)
      .addAllRules(enabledRules)
      .addAllTsconfigPaths(
        configuration.tsConfigPaths != null ? configuration.tsConfigPaths : List.of()
      )
      .build();

    var fileMap = new HashMap<String, InputFile>();
    for (var f : tsFiles) {
      fileMap.put(f.absolutePath(), f);
    }

    tsgolintServer.analyzeProject(request, issue -> {
      var inputFile = fileMap.get(issue.filePath());
      if (inputFile != null) {
        analysisProcessor.saveIssue(context, issue);
      }
    });
  }

  private List<InputFile> getInputFiles() {
    FileSystem fileSystem = context.getSensorContext().fileSystem();
    var p = fileSystem.predicates();
    var jsTsPredicate = JavaScriptFilePredicate.getJsTsPredicate(fileSystem);

    // HTML files for JS-in-HTML analysis — requires "web" language (from sonar-html).
    // Extension filter limits to extensions we support (sonar-html also covers .cshtml, .erb, etc.).
    var htmlPredicate = p.and(
      p.hasLanguage(JavaScriptFilePredicate.WEB_LANGUAGE),
      p.or(p.hasExtension("htm"), p.hasExtension("html"), p.hasExtension("xhtml"))
    );

    // HTML files for CSS-in-HTML analysis — extension-only, no language requirement.
    // Matches old CssRuleSensor's webFilePredicate. These files may not have "web"
    // language when sonar-html is not installed.
    var webFilePredicate = p.and(
      p.hasType(InputFile.Type.MAIN),
      p.or(p.hasExtension("htm"), p.hasExtension("html"), p.hasExtension("xhtml"))
    );

    // YAML files (Helm-safe and SAM template checks)
    var yamlPredicate = JavaScriptFilePredicate.getYamlPredicate(fileSystem);

    // CSS files — include all types (MAIN and TEST). Old CssMetricSensor processed
    // all files for highlighting; old CssRuleSensor only MAIN for issues. The Node.js
    // side skips linting for TEST files, so only highlighting is computed for them.
    var cssPredicate = p.hasLanguages(CssLanguage.KEY);

    return StreamSupport.stream(
      fileSystem
        .inputFiles(
          p.or(jsTsPredicate, htmlPredicate, webFilePredicate, yamlPredicate, cssPredicate)
        )
        .spliterator(),
      false
    ).toList();
  }

  private void analyzeFiles(List<InputFile> inputFiles) {
    var eslintImporter = new EslintReportImporter();
    var externalIssues = eslintImporter.execute(context);
    try {
      var handler = new AnalyzeProjectHandler(context, inputFiles, externalIssues);
      bridgeServer.analyzeProject(handler);
      // Run tsgolint analysis after bridge analysis
      runTsgolintAnalysis(inputFiles);
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
          var language = inputFile.language();
          var isJsTs = isJsTsFile(inputFile);
          var isHtmlOrYaml =
            JavaScriptFilePredicate.WEB_LANGUAGE.equals(language) ||
            JavaScriptFilePredicate.YAML_LANGUAGE.equals(language);

          if (isJsTs || isHtmlOrYaml) {
            CacheStrategy cacheStrategy = CacheStrategies.getStrategyFor(context, inputFile);
            if (cacheStrategy.isAnalysisRequired()) {
              addFileToAnalyze(files, inputFile);
              fileToCacheStrategy.put(inputFile.absolutePath(), cacheStrategy);
            } else if (isJsTs) {
              LOG.debug("Processing cache analysis of file: {}", inputFile.uri());
              var cacheAnalysis = cacheStrategy.readAnalysisFromCache();
              analysisProcessor.processCacheAnalysis(context, inputFile, cacheAnalysis);
              acceptAstResponse(cacheAnalysis.getAst(), inputFile);
            }
          } else {
            // CSS and extension-based web files: always analyze, no caching.
            addFileToAnalyze(files, inputFile);
          }
        }
      } catch (IOException e) {
        handle.completeExceptionally(new IllegalStateException(e));
      }
      if (fsListener != null) {
        configuration.setFsEvents(fsListener.listFSEvents());
      }
      configuration.setSkipAst(context.skipAst(consumers));
      // Use bridge rules only (excluding tsgolint-offloaded rules)
      var bridgeRules =
        tsgolintServer != null && tsgolintServer.isAlive()
          ? checks.enabledBridgeEslintRules()
          : checks.enabledEslintRules();
      var request = new BridgeServer.ProjectAnalysisRequest(files, bridgeRules, configuration);
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
        var issues = analysisProcessor.processResponse(context, checks, file, response);
        var dedupedIssues = ExternalIssueRepository.deduplicateIssues(
          externalIssues.get(filePath),
          issues
        );
        if (!dedupedIssues.isEmpty()) {
          ExternalIssueRepository.saveESLintIssues(context.getSensorContext(), dedupedIssues);
        }
        externalIssues.remove(filePath);
        // Only cache JS/TS file results — non-JS/TS files (CSS, HTML, YAML) skip caching
        var cacheStrategy = fileToCacheStrategy.get(filePath);
        if (cacheStrategy != null) {
          try {
            cacheStrategy.writeAnalysisToCache(
              CacheAnalysis.fromResponse(response.cpdTokens(), response.ast()),
              file
            );
          } catch (IOException e) {
            handle.completeExceptionally(new IllegalStateException(e));
          }
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

    private void addFileToAnalyze(Map<String, BridgeServer.JsTsFile> files, InputFile inputFile)
      throws IOException {
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
    }

    private static boolean isJsTsFile(InputFile inputFile) {
      var lang = inputFile.language();
      return JavaScriptLanguage.KEY.equals(lang) || TypeScriptLanguage.KEY.equals(lang);
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
