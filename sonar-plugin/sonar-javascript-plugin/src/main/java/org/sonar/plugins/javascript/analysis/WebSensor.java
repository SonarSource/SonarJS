/*
 * SonarQube JavaScript Plugin
 * Copyright (C) SonarSource Sàrl
 * mailto:info AT sonarsource DOT com
 *
 * You can redistribute and/or modify this program under the terms of
 * the Sonar Source-Available License Version 1, as published by SonarSource Sàrl.
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

import java.io.IOException;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
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
import org.sonar.api.scanner.sensor.ProjectSensor;
import org.sonar.css.CssLanguage;
import org.sonar.css.CssRules;
import org.sonar.plugins.javascript.CancellationException;
import org.sonar.plugins.javascript.JavaScriptFilePredicate;
import org.sonar.plugins.javascript.JavaScriptLanguage;
import org.sonar.plugins.javascript.TypeScriptLanguage;
import org.sonar.plugins.javascript.analysis.cache.CacheAnalysis;
import org.sonar.plugins.javascript.analysis.cache.CacheStrategies;
import org.sonar.plugins.javascript.analysis.cache.CacheStrategy;
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalyzeProjectRequest;
import org.sonar.plugins.javascript.analyzeproject.grpc.AnalyzeProjectStreamResponse;
import org.sonar.plugins.javascript.analyzeproject.grpc.FileResultMessage;
import org.sonar.plugins.javascript.analyzeproject.grpc.ProjectAnalysisFileResult;
import org.sonar.plugins.javascript.analyzeproject.grpc.ProjectAnalysisMeta;
import org.sonar.plugins.javascript.analyzeproject.grpc.ProjectAnalysisTelemetry;
import org.sonar.plugins.javascript.analyzeproject.grpc.ProjectConfiguration;
import org.sonar.plugins.javascript.analyzeproject.grpc.ProjectFileInput;
import org.sonar.plugins.javascript.api.AnalysisMode;
import org.sonar.plugins.javascript.api.JsFile;
import org.sonar.plugins.javascript.api.estree.ESTree;
import org.sonar.plugins.javascript.bridge.AnalysisWarningsWrapper;
import org.sonar.plugins.javascript.bridge.AnalyzeProjectMessages;
import org.sonar.plugins.javascript.bridge.AstProtoUtils;
import org.sonar.plugins.javascript.bridge.BridgeServer;
import org.sonar.plugins.javascript.bridge.BridgeServerConfig;
import org.sonar.plugins.javascript.bridge.ESTreeFactory;
import org.sonar.plugins.javascript.bridge.EslintRule;
import org.sonar.plugins.javascript.bridge.JstsGoBundle;
import org.sonar.plugins.javascript.bridge.ProjectAnalysisHandler;
import org.sonar.plugins.javascript.bridge.ServerAlreadyFailedException;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzerGrpcServer;
import org.sonar.plugins.javascript.bridge.grpc.AnalyzerGrpcServerImpl;
import org.sonar.plugins.javascript.bridge.protobuf.Node;
import org.sonar.plugins.javascript.external.EslintReportImporter;
import org.sonar.plugins.javascript.external.ExternalIssue;
import org.sonar.plugins.javascript.external.ExternalIssueRepository;
import org.sonar.plugins.javascript.nodejs.NodeCommandException;
import org.sonar.plugins.javascript.sonarlint.FSListener;

@DependedUpon("js-analysis")
public class WebSensor implements ProjectSensor {

  private static final Logger LOG = LoggerFactory.getLogger(WebSensor.class);
  private static final String LANG = "JS/TS";
  private static final Set<String> PROJECT_METADATA_FILENAMES = Set.of(
    "tsconfig.json",
    "package.json",
    "deno.json",
    "deno.jsonc",
    "pnpm-workspace.yaml"
  );

  private final JsTsChecks checks;
  private final AnalysisConsumers consumers;
  private final AnalysisProcessor analysisProcessor;
  private final AnalysisWarningsWrapper analysisWarnings;
  private final CssRules cssRules;
  private final BridgeServer bridgeServer;
  private final WebSensorModuleConfiguration moduleConfiguration;
  @Nullable
  private final JstsGoBundle jstsGoBundle;
  private ProjectConfiguration.Builder configurationBuilder;
  private JsTsContext<?> context;
  @Nullable
  private AnalyzerGrpcServer jstsGoServer;
  FSListener fsListener;

  public WebSensor(
    JsTsChecks checks,
    BridgeServer bridgeServer,
    AnalysisProcessor analysisProcessor,
    AnalysisWarningsWrapper analysisWarnings,
    AnalysisConsumers consumers,
    CssRules cssRules,
    JstsGoBundle jstsGoBundle,
    WebSensorModuleConfiguration moduleConfiguration
  ) {
    this(
      checks,
      bridgeServer,
      analysisProcessor,
      analysisWarnings,
      consumers,
      cssRules,
      jstsGoBundle,
      null,
      moduleConfiguration
    );
  }

  public WebSensor(
    JsTsChecks checks,
    BridgeServer bridgeServer,
    AnalysisProcessor analysisProcessor,
    AnalysisWarningsWrapper analysisWarnings,
    AnalysisConsumers consumers,
    CssRules cssRules,
    @Nullable FSListener fsListener,
    WebSensorModuleConfiguration moduleConfiguration
  ) {
    this(
      checks,
      bridgeServer,
      analysisProcessor,
      analysisWarnings,
      consumers,
      cssRules,
      null,
      fsListener,
      moduleConfiguration
    );
  }

  public WebSensor(
    JsTsChecks checks,
    BridgeServer bridgeServer,
    AnalysisProcessor analysisProcessor,
    AnalysisWarningsWrapper analysisWarnings,
    AnalysisConsumers consumers,
    CssRules cssRules,
    @Nullable JstsGoBundle jstsGoBundle,
    @Nullable FSListener fsListener,
    WebSensorModuleConfiguration moduleConfiguration
  ) {
    this.checks = checks;
    this.consumers = consumers;
    this.analysisProcessor = analysisProcessor;
    this.fsListener = fsListener;
    this.analysisWarnings = analysisWarnings;
    this.cssRules = cssRules;
    this.bridgeServer = bridgeServer;
    this.moduleConfiguration = moduleConfiguration;
    this.jstsGoBundle = jstsGoBundle;
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
      this.context = contextWithCollectedTsConfigPaths(sensorContext);
      configurationBuilder = AnalyzeProjectMessages.newProjectConfigurationBuilder(
        sensorContext.fileSystem().baseDir().getAbsolutePath(),
        context
      );
      bridgeServer.startServerLazily(BridgeServerConfig.fromSensorContext(sensorContext));
      startJstsGo();
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
      stopJstsGo();
      moduleConfiguration.clear();
      CacheStrategies.logReport();
    }
  }

  private JsTsContext<SensorContext> contextWithCollectedTsConfigPaths(
    SensorContext sensorContext
  ) {
    var baseContext = new JsTsContext<>(sensorContext);
    Set<String> collectedTsConfigPaths = moduleConfiguration.tsConfigPaths(baseContext);
    return new JsTsContext<>(sensorContext) {
      @Override
      public Set<String> getTsConfigPaths() {
        return collectedTsConfigPaths;
      }
    };
  }

  private void startJstsGo() {
    if (jstsGoBundle == null) {
      return;
    }
    try {
      jstsGoBundle.deploy();
      if (!jstsGoBundle.isAvailable()) {
        LOG.info("jsts-go binary not available, skipping jsts-go analysis");
        return;
      }
      var enabledRules = checks.enabledJstsGoRules();
      if (enabledRules.isEmpty()) {
        LOG.debug("No jsts-go rules enabled in quality profile");
        return;
      }
      jstsGoServer = new AnalyzerGrpcServerImpl(jstsGoBundle.binary());
      jstsGoServer.start();
    } catch (Exception e) {
      LOG.error("Failed to start jsts-go, its rules will produce no issues", e);
      jstsGoServer = null;
    }
  }

  private void stopJstsGo() {
    if (jstsGoServer != null) {
      jstsGoServer.stop();
      jstsGoServer = null;
    }
  }

  private static String normalizePathKey(String path) {
    try {
      return Path.of(path).normalize().toString();
    } catch (InvalidPathException e) {
      return path.replace('\\', '/');
    }
  }

  private void runJstsGoAnalysis(List<InputFile> inputFiles) {
    if (jstsGoServer == null || !jstsGoServer.isAlive()) {
      return;
    }
    var enabledRules = checks.enabledJstsGoRules();
    if (enabledRules.isEmpty()) {
      return;
    }

    // Collect JS/TS files for jsts-go analysis (exclude CSS, HTML, YAML).
    var jstsFiles = inputFiles
      .stream()
      .filter(f -> {
        var lang = f.language();
        return TypeScriptLanguage.KEY.equals(lang) || JavaScriptLanguage.KEY.equals(lang);
      })
      .toList();
    if (jstsFiles.isEmpty()) {
      return;
    }

    LOG.info(
      "Running jsts-go analysis on {} JS/TS files with {} rules",
      jstsFiles.size(),
      enabledRules.size()
    );

    var request = createJstsGoRequest(jstsFiles, enabledRules);

    var fileMap = new HashMap<String, InputFile>();
    for (var f : jstsFiles) {
      var absolutePath = f.absolutePath();
      fileMap.put(absolutePath, f);
      fileMap.put(normalizePathKey(absolutePath), f);
    }

    jstsGoServer.analyzeProject(request, issue -> {
      var inputFile = fileMap.get(issue.getFilePath());
      if (inputFile == null) {
        inputFile = fileMap.get(normalizePathKey(issue.getFilePath()));
      }
      if (inputFile != null) {
        analysisProcessor.saveIssue(context, checks, inputFile, issue);
      }
    });
  }

  private AnalyzeProjectRequest createJstsGoRequest(
    List<InputFile> inputFiles,
    List<EslintRule> enabledRules
  ) {
    var files = new HashMap<String, ProjectFileInput>();
    try {
      for (InputFile inputFile : inputFiles) {
        files.put(
          inputFile.absolutePath(),
          AnalyzeProjectMessages.newProjectFileInput(
            inputFile.type(),
            inputFile.status(),
            context.shouldSendFileContent(inputFile) ? inputFile.contents() : null
          )
        );
      }
    } catch (IOException e) {
      throw new IllegalStateException("Failed to prepare jsts-go analysis request", e);
    }

    return AnalyzeProjectRequest.newBuilder()
      .setConfiguration(configurationBuilder.build())
      .putAllFiles(files)
      .addAllRules(enabledRules.stream().map(AnalyzeProjectMessages::toProtoRule).toList())
      .build();
  }

  private List<InputFile> getInputFiles() {
    FileSystem fileSystem = context.getSensorContext().fileSystem();
    var p = fileSystem.predicates();
    var jsTsPredicate = JavaScriptFilePredicate.getJsTsPredicate(fileSystem);
    // CSS files - include all types (MAIN and TEST). Old CssMetricSensor processed
    // all files for highlighting; old CssRuleSensor only MAIN for issues. The Node.js
    // side keeps this behavior: TEST files get highlighting but no issues/metrics.
    var cssPredicate = p.hasLanguages(CssLanguage.KEY);

    // HTML files for JS-in-HTML analysis - extension based only.
    var jsInHtmlPredicate = JavaScriptFilePredicate.getExtensionsPredicate(
      fileSystem,
      context.getHtmlExtensions()
    );

    // HTML files for CSS-in-HTML analysis - extension-only. ONLY MAIN files raise issues
    var cssInHtmlPredicate = JavaScriptFilePredicate.getExtensionsPredicate(
      fileSystem,
      context.getCssAdditionalExtensions()
    );

    // YAML files (extension based + Helm-safe and SAM template checks)
    var yamlPredicate = JavaScriptFilePredicate.getYamlPredicate(
      fileSystem,
      context.getYamlExtensions()
    );

    return StreamSupport.stream(
      fileSystem
        .inputFiles(
          p.or(jsTsPredicate, jsInHtmlPredicate, cssInHtmlPredicate, yamlPredicate, cssPredicate)
        )
        .spliterator(),
      false
    ).toList();
  }

  private void analyzeFiles(List<InputFile> inputFiles) {
    var eslintImporter = new EslintReportImporter();
    var externalIssues = eslintImporter.execute(
      context,
      moduleConfiguration.eslintReports(context.getSensorContext())
    );
    try {
      var handler = new AnalyzeProjectHandler(context, inputFiles, externalIssues);
      bridgeServer.analyzeProject(handler);
      // Run jsts-go analysis after bridge analysis
      runJstsGoAnalysis(inputFiles);
      new PluginTelemetry(
        context,
        bridgeServer,
        handler.getProjectAnalysisTelemetry()
      ).reportTelemetry();
      consumers.doneAnalysis(context.getSensorContext());
    } catch (CompletionException e) {
      if (e.getCause() instanceof CancellationException nestedException) {
        throw nestedException;
      }
      if (e.getCause() instanceof java.util.concurrent.CancellationException) {
        throw new CancellationException(
          "Analysis interrupted because the SensorContext is in cancelled state"
        );
      }
      throw e;
    } catch (Exception e) {
      LOG.error("Failed to get response from analysis", e);
      throw e;
    }
  }

  class AnalyzeProjectHandler implements ProjectAnalysisHandler {

    private final JsTsContext<?> context;
    private final Map<String, List<ExternalIssue>> externalIssues;
    private final List<InputFile> inputFiles;
    private final List<InputFile> projectMetadataFiles;
    private final Map<String, InputFile> fileToInputFile = new HashMap<>();
    private final HashMap<String, CacheStrategy> fileToCacheStrategy = new HashMap<>();
    private final CompletableFuture<Void> handle;

    @Nullable
    private ProjectAnalysisTelemetry projectAnalysisTelemetry;

    AnalyzeProjectHandler(
      JsTsContext<?> context,
      List<InputFile> inputFiles,
      Map<String, List<ExternalIssue>> externalIssues
    ) {
      this.inputFiles = inputFiles;
      this.context = context;
      this.projectMetadataFiles = context.canAccessFileSystem()
        ? List.of()
        : collectProjectMetadataFiles();
      this.handle = new CompletableFuture<>();
      this.externalIssues = externalIssues;
    }

    @Override
    public AnalyzeProjectRequest getRequest() {
      var files = new HashMap<String, ProjectFileInput>();
      try {
        addInputFilesToRequest(files);
        addProjectMetadataFilesToRequest(files);
      } catch (IOException e) {
        var failure = new IllegalStateException(e);
        handle.completeExceptionally(failure);
        throw failure;
      }
      if (fsListener != null) {
        configurationBuilder.clearFsEvents().addAllFsEvents(fsListener.listFSEvents().keySet());
      }
      configurationBuilder.setSkipAst(context.skipAst(consumers));
      var bridgeRules =
        jstsGoServer != null && jstsGoServer.isAlive()
          ? checks.enabledBridgeEslintRules()
          : checks.enabledEslintRules();
      return AnalyzeProjectRequest.newBuilder()
        .setConfiguration(configurationBuilder.build())
        .putAllFiles(files)
        .addAllRules(bridgeRules.stream().map(AnalyzeProjectMessages::toProtoRule).toList())
        .addAllCssRules(
          cssRules.getStylelintRules().stream().map(AnalyzeProjectMessages::toProtoRule).toList()
        )
        .build();
    }

    private void addInputFilesToRequest(Map<String, ProjectFileInput> files) throws IOException {
      for (InputFile inputFile : inputFiles) {
        addInputFileToRequest(files, inputFile);
      }
    }

    private void addInputFileToRequest(Map<String, ProjectFileInput> files, InputFile inputFile)
      throws IOException {
      if (shouldUseCache(inputFile)) {
        handleCachedInputFile(files, inputFile);
      } else {
        // CSS and extension-based HTML/YAML/CSS-additional files: always analyze, no caching.
        addFileToAnalyze(files, inputFile);
      }
    }

    private boolean shouldUseCache(InputFile inputFile) {
      var language = inputFile.language();
      return (
        isJsTsFile(inputFile) ||
        JavaScriptFilePredicate.WEB_LANGUAGE.equals(language) ||
        JavaScriptFilePredicate.YAML_LANGUAGE.equals(language)
      );
    }

    private void handleCachedInputFile(Map<String, ProjectFileInput> files, InputFile inputFile)
      throws IOException {
      CacheStrategy cacheStrategy = CacheStrategies.getStrategyFor(context, inputFile);
      if (cacheStrategy.isAnalysisRequired()) {
        addFileToAnalyze(files, inputFile);
        fileToCacheStrategy.put(inputFile.absolutePath(), cacheStrategy);
        return;
      }

      if (isJsTsFile(inputFile)) {
        LOG.debug("Processing cache analysis of file: {}", inputFile.uri());
        var cacheAnalysis = cacheStrategy.readAnalysisFromCache();
        analysisProcessor.processCacheAnalysis(context, inputFile, cacheAnalysis);
        acceptAstResponse(cacheAnalysis.getAst(), inputFile);
      }
    }

    private void addProjectMetadataFilesToRequest(Map<String, ProjectFileInput> files)
      throws IOException {
      for (InputFile metadataFile : projectMetadataFiles) {
        addFileToAnalyze(files, metadataFile);
      }
    }

    private List<InputFile> collectProjectMetadataFiles() {
      FileSystem fileSystem = context.getSensorContext().fileSystem();
      return StreamSupport.stream(
        fileSystem.inputFiles(fileSystem.predicates().all()).spliterator(),
        false
      )
        .filter(AnalyzeProjectHandler::isProjectMetadataFile)
        .toList();
    }

    private static boolean isProjectMetadataFile(InputFile inputFile) {
      return PROJECT_METADATA_FILENAMES.contains(inputFile.filename().toLowerCase(Locale.ROOT));
    }

    public CompletableFuture<Void> getFuture() {
      return handle;
    }

    @Nullable
    ProjectAnalysisTelemetry getProjectAnalysisTelemetry() {
      return projectAnalysisTelemetry;
    }

    @Override
    public SensorContext getContext() {
      return context.getSensorContext();
    }

    @Override
    public void handleMessage(AnalyzeProjectStreamResponse message) {
      switch (message.getMessageCase()) {
        case FILE_RESULT -> handleFileResult(message.getFileResult());
        case META -> handleMeta(message.getMeta());
        case CANCELLED -> handle.completeExceptionally(
          new CancellationException(
            "Analysis interrupted because the SensorContext is in cancelled state"
          )
        );
        case MESSAGE_NOT_SET -> {
          // no-op
        }
      }
    }

    private void handleFileResult(FileResultMessage fileResultMessage) {
      var filePath = fileResultMessage.getFilePath();
      var response = fileResultMessage.getResult();
      try {
        var file = fileToInputFile.get(filePath);
        if (file == null) {
          LOG.warn("Skipping analysis result for unknown file path: {}", filePath);
          return;
        }
        if (response.hasError() && !response.getError().isBlank()) {
          // The HTTP transport used to drop per-file runtime errors after logging them in Node.js.
          // Keep the project analysis running, but surface the failure explicitly on the file.
          analysisProcessor.processFileError(context, file, response.getError());
          saveExternalIssues(filePath, List.of());
          return;
        }
        var issues = analysisProcessor.processResponse(context, checks, file, response);
        saveExternalIssues(filePath, issues);
        // Only cache JS/TS file results -- non-JS/TS files (CSS, HTML, YAML) skip caching.
        var cacheStrategy = fileToCacheStrategy.get(filePath);
        Node responseAst = responseAst(response);
        if (cacheStrategy != null) {
          writeAnalysisToCache(cacheStrategy, response, responseAst, file);
        }
        acceptAstResponse(responseAst, file);
      } catch (IOException e) {
        handle.completeExceptionally(
          new IllegalStateException("Failed to decode analysis AST for " + filePath, e)
        );
      }
    }

    private void saveExternalIssues(
      String filePath,
      List<org.sonar.plugins.javascript.analyzeproject.grpc.Issue> issues
    ) {
      var dedupedIssues = ExternalIssueRepository.deduplicateIssues(
        externalIssues.get(filePath),
        issues
      );
      if (!dedupedIssues.isEmpty()) {
        ExternalIssueRepository.saveESLintIssues(context.getSensorContext(), dedupedIssues);
      }
      externalIssues.remove(filePath);
    }

    private void handleMeta(ProjectAnalysisMeta meta) {
      meta.getWarningsList().forEach(analysisWarnings::addUnique);
      projectAnalysisTelemetry = meta.hasTelemetry() ? meta.getTelemetry() : null;
      handle.complete(null);
    }

    private void writeAnalysisToCache(
      CacheStrategy cacheStrategy,
      ProjectAnalysisFileResult response,
      @Nullable Node responseAst,
      InputFile file
    ) {
      try {
        cacheStrategy.writeAnalysisToCache(
          CacheAnalysis.fromResponse(response.getCpdTokensList(), responseAst),
          file
        );
      } catch (IOException e) {
        handle.completeExceptionally(new IllegalStateException(e));
      }
    }

    private void addFileToAnalyze(Map<String, ProjectFileInput> files, InputFile inputFile)
      throws IOException {
      files.put(
        inputFile.absolutePath(),
        AnalyzeProjectMessages.newProjectFileInput(
          inputFile.type(),
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

    @Nullable
    private Node responseAst(ProjectAnalysisFileResult response) throws IOException {
      return response.getAst().isEmpty()
        ? null
        : AstProtoUtils.readProtobufFromBytes(response.getAst().toByteArray());
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
