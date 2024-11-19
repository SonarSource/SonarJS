/*
 * SonarLint Language Server
 * Copyright (C) 2009-2024 SonarSource SA
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
package com.sonar.javascript.it.plugin.sonarlint.tests;

import static java.util.concurrent.TimeUnit.MINUTES;
import static java.util.concurrent.TimeUnit.SECONDS;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.groups.Tuple.tuple;
import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import static org.sonarsource.sonarlint.ls.settings.SettingsManager.SONARLINT_CONFIGURATION_NAMESPACE;

import com.google.protobuf.Message;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import java.util.regex.Pattern;
import mockwebserver3.Dispatcher;
import mockwebserver3.MockResponse;
import mockwebserver3.MockWebServer;
import mockwebserver3.RecordedRequest;
import okio.Buffer;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.filefilter.FalseFileFilter;
import org.apache.commons.io.filefilter.RegexFileFilter;
import org.apache.commons.lang3.ArrayUtils;
import org.assertj.core.api.iterable.ThrowingExtractor;
import org.awaitility.core.ThrowingRunnable;
import org.eclipse.lsp4j.ClientCapabilities;
import org.eclipse.lsp4j.ClientInfo;
import org.eclipse.lsp4j.ConfigurationParams;
import org.eclipse.lsp4j.Diagnostic;
import org.eclipse.lsp4j.DiagnosticSeverity;
import org.eclipse.lsp4j.DidChangeConfigurationParams;
import org.eclipse.lsp4j.DidChangeTextDocumentParams;
import org.eclipse.lsp4j.DidChangeWorkspaceFoldersParams;
import org.eclipse.lsp4j.DidCloseNotebookDocumentParams;
import org.eclipse.lsp4j.DidCloseTextDocumentParams;
import org.eclipse.lsp4j.DidOpenTextDocumentParams;
import org.eclipse.lsp4j.InitializeParams;
import org.eclipse.lsp4j.InitializedParams;
import org.eclipse.lsp4j.MessageActionItem;
import org.eclipse.lsp4j.MessageParams;
import org.eclipse.lsp4j.NotebookDocumentClientCapabilities;
import org.eclipse.lsp4j.NotebookDocumentIdentifier;
import org.eclipse.lsp4j.NotebookDocumentSyncClientCapabilities;
import org.eclipse.lsp4j.ProgressParams;
import org.eclipse.lsp4j.PublishDiagnosticsParams;
import org.eclipse.lsp4j.ShowMessageRequestParams;
import org.eclipse.lsp4j.TextDocumentContentChangeEvent;
import org.eclipse.lsp4j.TextDocumentIdentifier;
import org.eclipse.lsp4j.TextDocumentItem;
import org.eclipse.lsp4j.VersionedTextDocumentIdentifier;
import org.eclipse.lsp4j.WindowClientCapabilities;
import org.eclipse.lsp4j.WorkDoneProgressCreateParams;
import org.eclipse.lsp4j.WorkspaceFolder;
import org.eclipse.lsp4j.WorkspaceFoldersChangeEvent;
import org.eclipse.lsp4j.jsonrpc.CompletableFutures;
import org.eclipse.lsp4j.jsonrpc.Launcher;
import org.eclipse.lsp4j.launch.LSPLauncher;
import org.jetbrains.annotations.NotNull;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.AfterEachCallback;
import org.junit.jupiter.api.extension.BeforeEachCallback;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.sonarsource.sonarlint.core.rpc.protocol.client.binding.AssistBindingParams;
import org.sonarsource.sonarlint.core.rpc.protocol.client.binding.SuggestBindingParams;
import org.sonarsource.sonarlint.core.rpc.protocol.client.connection.SuggestConnectionParams;
import org.sonarsource.sonarlint.core.serverapi.proto.sonarqube.ws.Components;
import org.sonarsource.sonarlint.ls.ServerMain;
import org.sonarsource.sonarlint.ls.SonarLintExtendedLanguageClient;
import org.sonarsource.sonarlint.ls.SonarLintExtendedLanguageServer;
import org.sonarsource.sonarlint.ls.commands.ShowAllLocationsCommand;
import org.sonarsource.sonarlint.ls.settings.SettingsManager;
import org.sonarsource.sonarlint.ls.telemetry.SonarLintTelemetry;
import picocli.CommandLine;

public class LanguageServerMediumTests {
  private static final Set<Path> staticTempDirs = new HashSet<>();
  private final Set<Path> instanceTempDirs = new HashSet<>();
  Path temp;
  protected Set<String> toBeClosed = new HashSet<>();
  protected Set<String> notebooksToBeClosed = new HashSet<>();
  protected Set<String> foldersToRemove = new HashSet<>();
  private static ServerSocket serverSocket;
  protected static SonarLintExtendedLanguageServer lsProxy;
  protected static FakeLanguageClient client;

  private static final String CONNECTION_ID = "known";
  private static final String TOKEN = "token";
  @RegisterExtension
  private final MockWebServerExtension mockWebServerExtension = new MockWebServerExtension();
  private static Path analysisDir;

  @BeforeAll
  static void startServer() throws Exception {
    System.setProperty(SonarLintTelemetry.DISABLE_PROPERTY_KEY, "true");
    SettingsManager.setSonarLintUserHomeOverride(makeStaticTempDir());
    serverSocket = new ServerSocket(0);
    var port = serverSocket.getLocalPort();

    client = new FakeLanguageClient();

    var executor = Executors.newFixedThreadPool(2);
    var future = executor.submit(() -> {
      Socket socket = serverSocket.accept();
      Launcher<SonarLintExtendedLanguageServer> clientSideLauncher = new LSPLauncher.Builder<SonarLintExtendedLanguageServer>()
        .setLocalService(client)
        .setRemoteInterface(SonarLintExtendedLanguageServer.class)
        .setInput(socket.getInputStream())
        .setOutput(socket.getOutputStream())
        .create();
      clientSideLauncher.startListening();
      return clientSideLauncher.getRemoteProxy();
    });

    var js = fullPathToJar("^sonar-javascript-plugin-([0-9.]+)(-SNAPSHOT)*.jar$");
    String[] languageServerArgs = new String[]{"-port", "" + port, "-analyzers", js};

    try {
      var cmd = new CommandLine(new ServerMain());
      var cmdOutput = new StringWriter();
      cmd.setErr(new PrintWriter(cmdOutput));
      cmd.setOut(new PrintWriter(cmdOutput));

      var clonedArgs = ArrayUtils.clone(languageServerArgs);
      executor.submit(() -> cmd.execute(clonedArgs));
      executor.shutdown();
    } catch (Exception e) {
      e.printStackTrace();
      future.get(1, TimeUnit.SECONDS);
      if (!future.isDone()) {
        future.cancel(true);
      }
      throw e;
    }

    lsProxy = future.get();
  }

  protected static String fullPathToJar(String pattern) {
    return FileUtils
      .listFiles(Paths.get("../../../sonar-plugin/sonar-javascript-plugin/target/").toAbsolutePath().normalize().toFile(), new RegexFileFilter(pattern),
        FalseFileFilter.FALSE)
      .iterator().next().toPath().toString();
  }

  protected static void initialize(Map<String, Object> initializeOptions, WorkspaceFolder... initFolders) throws InterruptedException, ExecutionException {
    var initializeParams = getInitializeParams(initializeOptions, initFolders);
    initializeParams.getCapabilities().setWindow(new WindowClientCapabilities());
    lsProxy.initialize(initializeParams).get();
    lsProxy.initialized(new InitializedParams());
  }

  @NotNull
  private static InitializeParams getInitializeParams(Map<String, Object> initializeOptions, WorkspaceFolder[] initFolders) {
    var initializeParams = new InitializeParams();
    initializeParams.setTrace("messages");

    var actualInitOptions = new HashMap<>(initializeOptions);
    if (initializeOptions.containsKey("additionalAttributes")) {
      var additionalAttributes = new HashMap<>((Map<String, String>) initializeOptions.get("additionalAttributes"));
      actualInitOptions.put("additionalAttributes", additionalAttributes);
    }
    initializeParams.setInitializationOptions(actualInitOptions);

    initializeParams.setWorkspaceFolders(List.of(initFolders));
    initializeParams.setClientInfo(new ClientInfo("SonarLint LS Medium tests", "1.0"));
    var clientCapabilities = new ClientCapabilities();
    var notebookDocument = new NotebookDocumentClientCapabilities();
    var synchronization = new NotebookDocumentSyncClientCapabilities();
    synchronization.setDynamicRegistration(true);
    synchronization.setExecutionSummarySupport(true);
    notebookDocument.setSynchronization(synchronization);
    clientCapabilities.setNotebookDocument(notebookDocument);
    initializeParams.setCapabilities(clientCapabilities);
    return initializeParams;
  }

  @AfterAll
  public static void stopServer() throws Exception {
    staticTempDirs.forEach(tempDirPath -> FileUtils.deleteQuietly(tempDirPath.toFile()));
    staticTempDirs.clear();
    System.clearProperty(SonarLintTelemetry.DISABLE_PROPERTY_KEY);
    try {
      if (lsProxy != null) {
        // 20 seconds should be way enough time for the backend to stop
        lsProxy.shutdown().get(20, SECONDS);
        lsProxy.exit();
      }
    } finally {
      serverSocket.close();
    }
  }

  @BeforeEach
  void cleanup() throws Exception {
    temp = makeInstanceTempDir();
    // Reset state on LS side
    client.clear();
    toBeClosed.clear();
    notebooksToBeClosed.clear();

    setupGlobalSettings(client.globalSettings);
    setUpFolderSettings(client.folderSettings);

    notifyConfigurationChangeOnClient();
    verifyConfigurationChangeOnClient();
  }

  protected void setupGlobalSettings(Map<String, Object> globalSettings) {
    // do nothing by default
  }

  protected void setUpFolderSettings(Map<String, Map<String, Object>> folderSettings) {
    addSonarQubeConnection(client.globalSettings, CONNECTION_ID, mockWebServerExtension.url("/"), TOKEN);
  }

  protected void verifyConfigurationChangeOnClient() {
    // do nothing by default
  }

  @AfterEach
  final void closeFiles() {
    // Close all opened files
    for (var uri : toBeClosed) {
      lsProxy.getTextDocumentService().didClose(new DidCloseTextDocumentParams(new TextDocumentIdentifier(uri)));
    }
    for (var uri : notebooksToBeClosed) {
      lsProxy.getNotebookDocumentService().didClose(new DidCloseNotebookDocumentParams(new NotebookDocumentIdentifier(uri), List.of()));
    }
    foldersToRemove.forEach(folderUri -> lsProxy.getWorkspaceService().didChangeWorkspaceFolders(
      new DidChangeWorkspaceFoldersParams(new WorkspaceFoldersChangeEvent(List.of(), List.of(new WorkspaceFolder(folderUri))))));
    instanceTempDirs.forEach(tempDirPath -> FileUtils.deleteQuietly(tempDirPath.toFile()));
    instanceTempDirs.clear();
  }

  @BeforeAll
  static void initialize() throws Exception {
    analysisDir = makeStaticTempDir();
    initialize(Map.of(
      "telemetryStorage", "not/exists",
      "productName", "SLCORE tests",
      "productVersion", "0.1",
      "showVerboseLogs", false,
      "productKey", "productKey"
    ), new WorkspaceFolder(analysisDir.toUri().toString(), "AnalysisDir"));
  }

  @BeforeEach
  void prepare() throws IOException {
    client.isIgnoredByScm = true;
    org.apache.commons.io.FileUtils.cleanDirectory(analysisDir.toFile());
  }

  @BeforeEach
  public void mockSonarQube() {
    mockWebServerExtension.addStringResponse("/api/system/status", "{\"status\": \"UP\", \"version\": \"9.9\", \"id\": \"xzy\"}");
    mockWebServerExtension.addStringResponse("/api/authentication/validate?format=json", "{\"valid\": true}");
    mockWebServerExtension.addProtobufResponse("/api/components/search.protobuf?qualifiers=TRK&ps=500&p=1", Components.SearchWsResponse.newBuilder().build());
  }

  protected static void assertLogContains(String msg) {
    assertLogContainsPattern("\\[.*\\] " + Pattern.quote(msg) + ".*");
  }

  protected static void assertLogContainsPattern(String msgPattern) {
    await().atMost(10, SECONDS).untilAsserted(() -> assertThat(client.logs).anyMatch(p -> p.getMessage().matches(msgPattern)));
  }

  protected static void awaitLatch(CountDownLatch latch) {
    try {
      assertTrue(latch.await(15, TimeUnit.SECONDS));
    } catch (InterruptedException e) {
      fail(e);
    }
  }

  protected static class FakeLanguageClient implements SonarLintExtendedLanguageClient {

    Map<String, List<Diagnostic>> diagnostics = new ConcurrentHashMap<>();
    Map<String, List<Diagnostic>> hotspots = new ConcurrentHashMap<>();
    Queue<MessageParams> logs = new ConcurrentLinkedQueue<>();
    Map<String, Object> globalSettings = new HashMap<>();
    Map<String, Map<String, Object>> folderSettings = new HashMap<>();
    Map<String, GetJavaConfigResponse> javaConfigs = new HashMap<>();
    Map<String, String> referenceBranchNameByFolder = new HashMap<>();
    Map<String, Boolean> scopeReadyForAnalysis = new HashMap<>();
    CountDownLatch settingsLatch = new CountDownLatch(0);
    CountDownLatch showRuleDescriptionLatch = new CountDownLatch(0);
    CountDownLatch suggestBindingLatch = new CountDownLatch(0);
    CountDownLatch readyForTestsLatch = new CountDownLatch(0);
    ShowAllLocationsCommand.Param showIssueParams;
    ShowFixSuggestionParams showFixSuggestionParams;
    SuggestBindingParams suggestedBindings;
    ShowRuleDescriptionParams ruleDesc;
    boolean isIgnoredByScm = true;
    boolean shouldAnalyseFile = true;
    final AtomicInteger needCompilationDatabaseCalls = new AtomicInteger();
    final Set<String> openedLinks = new HashSet<>();
    final Set<MessageParams> shownMessages = new HashSet<>();
    final Map<String, NewCodeDefinitionDto> newCodeDefinitionCache = new HashMap<>();

    void clearHotspotsAndIssuesAndConfigScopeReadiness() {
      scopeReadyForAnalysis.clear();
      diagnostics.clear();
      hotspots.clear();
    }

    void clear() {
      clearHotspotsAndIssuesAndConfigScopeReadiness();
      logs.clear();
      shownMessages.clear();
      globalSettings = new HashMap<>();
      globalSettings.put("disableTelemetry", true);
      globalSettings.put("output", new HashMap<String, Object>() {{
        put("showAnalyzerLogs", true);
        put("showVerboseLogs", true);
      }});
      folderSettings.clear();
      settingsLatch = new CountDownLatch(0);
      showRuleDescriptionLatch = new CountDownLatch(0);
      suggestBindingLatch = new CountDownLatch(0);
      readyForTestsLatch = new CountDownLatch(0);
      needCompilationDatabaseCalls.set(0);
      shouldAnalyseFile = true;
      suggestedBindings = null;
    }

    @Override
    public void telemetryEvent(Object object) {
    }

    List<Diagnostic> getDiagnostics(String uri) {
      return diagnostics.getOrDefault(uri, List.of());
    }

    List<Diagnostic> getHotspots(String uri) {
      return hotspots.getOrDefault(uri, List.of());
    }

    @Override
    public void publishDiagnostics(PublishDiagnosticsParams diagnostics) {
      this.diagnostics.put(diagnostics.getUri(), diagnostics.getDiagnostics());
    }

    @Override
    public void publishSecurityHotspots(PublishDiagnosticsParams diagnostics) {
      this.hotspots.put(diagnostics.getUri(), diagnostics.getDiagnostics());
    }

    @Override
    public void showMessage(MessageParams messageParams) {
      shownMessages.add(messageParams);
    }

    @Override
    public CompletableFuture<MessageActionItem> showMessageRequest(ShowMessageRequestParams requestParams) {
      return CompletableFuture.completedFuture(null);
    }

    @Override
    public void logMessage(MessageParams message) {
      // SSLRSQBR-72 This log is produced by analyzers ProgressReport, and keeps coming long after the analysis has completed. Just ignore
      // it
      if (!message.getMessage().contains("1/1 source files have been analyzed")) {
        logs.add(message);
      }
      System.out.println(message.getMessage());
    }

    @Override
    public void notifyProgress(ProgressParams params) {
      System.out.println(params);
    }

    @Override
    public CompletableFuture<Void> createProgress(WorkDoneProgressCreateParams params) {
      return CompletableFuture.completedFuture(null);
    }

    @Override
    public CompletableFuture<List<Object>> configuration(ConfigurationParams configurationParams) {
      return CompletableFutures.computeAsync(cancelToken -> {
        List<Object> result;
        try {
          result = new ArrayList<>(configurationParams.getItems().size());
          for (var item : configurationParams.getItems()) {
            if (item.getScopeUri() == null && item.getSection().equals(SONARLINT_CONFIGURATION_NAMESPACE)) {
              result.add(globalSettings);
            }
          }
        } finally {
          settingsLatch.countDown();
        }
        return result;
      });
    }

    @Override
    public void readyForTests() {
      readyForTestsLatch.countDown();
    }

    @Override
    public CompletableFuture<Boolean> askSslCertificateConfirmation(SslCertificateConfirmationParams params) {
      return null;
    }

    @Override
    public void showSoonUnsupportedVersionMessage(ShowSoonUnsupportedVersionMessageParams messageParams) {
    }

    @Override
    public void submitNewCodeDefinition(SubmitNewCodeDefinitionParams params) {
      newCodeDefinitionCache.put(params.getFolderUri(),
        new NewCodeDefinitionDto(params.getNewCodeDefinitionOrMessage(), params.isSupported()));
    }

    @Override
    public void suggestBinding(SuggestBindingParams binding) {
      this.suggestedBindings = binding;
      suggestBindingLatch.countDown();
    }

    @Override
    public void suggestConnection(SuggestConnectionParams suggestConnectionParams) {
      throw new UnsupportedOperationException("Not implemented yet");
    }

    @Override
    public CompletableFuture<FindFileByNamesInScopeResponse> listFilesInFolder(FolderUriParams params) {
      return CompletableFuture.completedFuture(new FindFileByNamesInScopeResponse(List.of()));
    }

    @Override
    public void showSonarLintOutput() {
    }

    @Override
    public void openJavaHomeSettings() {
    }

    @Override
    public void openPathToNodeSettings() {
    }

    @Override
    public void doNotShowMissingRequirementsMessageAgain() {

    }

    @Override
    public CompletableFuture<Boolean> canShowMissingRequirementsNotification() {
      return CompletableFuture.completedFuture(false);
    }

    @Override
    public void showRuleDescription(ShowRuleDescriptionParams params) {
      this.ruleDesc = params;
      showRuleDescriptionLatch.countDown();
    }

    @Override
    public void showHotspot(ShowHotspotParams h) {
    }

    @Override
    public void showIssue(ShowAllLocationsCommand.Param issue) {
      this.showIssueParams = issue;
    }

    @Override
    public void showIssueOrHotspot(ShowAllLocationsCommand.Param params) {
    }

    @Override
    public CompletableFuture<Boolean> isIgnoredByScm(String fileUri) {
      return CompletableFutures.computeAsync(cancelToken -> isIgnoredByScm);
    }

    @Override
    public CompletableFuture<ShouldAnalyseFileCheckResult> shouldAnalyseFile(SonarLintExtendedLanguageServer.UriParams fileUri) {
      return CompletableFutures.computeAsync(cancelToken -> new ShouldAnalyseFileCheckResult(shouldAnalyseFile, "reason"));

    }

    @Override
    public CompletableFuture<FileUrisResult> filterOutExcludedFiles(FileUrisParams params) {
      return CompletableFutures.computeAsync(cancelToken -> new FileUrisResult(params.getFileUris()));
    }

    @Override
    public void maybeShowWiderLanguageSupportNotification(List<String> languageLabel) {

    }

    @Override
    public void showFirstSecretDetectionNotification() {
    }

    @Override
    public CompletableFuture<GetJavaConfigResponse> getJavaConfig(String fileUri) {
      return CompletableFutures.computeAsync(cancelToken -> javaConfigs.get(fileUri));
    }

    @Override
    public void browseTo(String link) {
      openedLinks.add(link);
    }

    @Override
    public void openConnectionSettings(boolean isSonarCloud) {
    }

    @Override
    public void removeBindingsForDeletedConnections(List<String> connectionIds) {

    }

    @Override
    public CompletableFuture<AssistCreatingConnectionResponse> assistCreatingConnection(CreateConnectionParams params) {
      return CompletableFuture.completedFuture(new AssistCreatingConnectionResponse("connectionId"));
    }

    @Override
    public CompletableFuture<AssistBindingResponse> assistBinding(AssistBindingParams params) {
      return CompletableFuture.completedFuture(new AssistBindingResponse("folderUri"));
    }

    @Override
    public void showFixSuggestion(ShowFixSuggestionParams params) {
      this.showFixSuggestionParams = params;
    }

    @Override
    public void setReferenceBranchNameForFolder(ReferenceBranchForFolder newReferenceBranch) {
      referenceBranchNameByFolder.put(newReferenceBranch.getFolderUri(), newReferenceBranch.getBranchName());
    }

    @Override
    public void needCompilationDatabase() {
      this.needCompilationDatabaseCalls.incrementAndGet();
    }

    @Override
    public void reportConnectionCheckResult(ConnectionCheckResult result) {
      // NOP
    }

    @Override
    public CompletableFuture<String> getTokenForServer(String serverId) {
      return CompletableFutures.computeAsync(server -> "token");
    }

  }

  protected class MockWebServerExtension implements BeforeEachCallback, AfterEachCallback {
    private final Integer port;
    private MockWebServer server;
    protected final Map<String, MockResponse> responsesByPath = new HashMap<>();

    public MockWebServerExtension() {
      this.server = new MockWebServer();
      this.port = null;
    }

    @Override
    public void beforeEach(ExtensionContext context) throws Exception {
      server = new MockWebServer();
      responsesByPath.clear();
      final Dispatcher dispatcher = new Dispatcher() {
        @Override
        public MockResponse dispatch(RecordedRequest request) {
          if (responsesByPath.containsKey(request.getPath())) {
            return responsesByPath.get(request.getPath());
          }
          return new MockResponse().setResponseCode(404);
        }
      };
      server.setDispatcher(dispatcher);
      if (this.port != null) {
        server.start(this.port);
      } else {
        server.start();
      }
    }

    @Override
    public void afterEach(ExtensionContext context) throws Exception {
      stopServer();
    }

    public void stopServer() throws IOException {
      server.shutdown();
    }

    public void addStringResponse(String path, String body) {
      responsesByPath.put(path, new MockResponse().setBody(body));
    }

    public String url(String path) {
      return server.url(path).toString();
    }

    public void addProtobufResponse(String path, Message m) {
      try (var b = new Buffer()) {
        m.writeTo(b.outputStream());
        responsesByPath.put(path, new MockResponse().setBody(b));
      } catch (IOException e) {
        fail(e);
      }
    }
  }
  protected static void notifyConfigurationChangeOnClient() {
    client.settingsLatch = new CountDownLatch(1);
    lsProxy.getWorkspaceService().didChangeConfiguration(new DidChangeConfigurationParams(Map.of("sonarlint", client.globalSettings)));
    awaitLatch(client.settingsLatch);
    // workspace/configuration has been called by server, but give some time for the response to be processed (settings change listeners)
    try {
      Thread.sleep(200);
    } catch (InterruptedException e) {
      e.printStackTrace();
    }
  }

  protected static void setAnalyzerProperties(Map<String, Object> config, Map<String, String> analyzerProperties) {
    if (analyzerProperties.isEmpty()) {
      config.put("analyzerProperties", analyzerProperties);
    } else {
      config.remove("analyzerProperties");
    }
  }

  protected static void addSonarQubeConnection(Map<String, Object> config, String connectionId, String url, String token) {
    var connectedMode = (Map<String, Object>) config.computeIfAbsent("connectedMode", k -> new HashMap<String, Object>());
    var connections = (Map<String, Object>) connectedMode.computeIfAbsent("connections", k -> new HashMap<String, Object>());
    var sonarqubeConnections = (List) connections.computeIfAbsent("sonarqube", k -> new ArrayList<>());
    sonarqubeConnections.add(Map.of("connectionId", connectionId, "serverUrl", url, "token", token));
  }

  protected static void bindProject(Map<String, Object> config, String connectionId, String projectKey) {
    var connectedMode = (Map<String, Object>) config.computeIfAbsent("connectedMode", k -> new HashMap<String, Object>());
    connectedMode.put("project", Map.of("connectionId", connectionId, "projectKey", projectKey));
  }

  protected static void setRulesConfig(Map<String, Object> config, String... ruleConfigs) {
    if (ruleConfigs.length > 0) {
      config.put("rules", buildRulesMap(ruleConfigs));
    } else {
      config.remove("rules");
    }
  }

  private static Map<String, Object> buildRulesMap(String... ruleConfigs) {
    assertThat(ruleConfigs.length % 2).withFailMessage("ruleConfigs must contain 'rule:key', 'level' pairs").isZero();
    var rules = new Map.Entry[ruleConfigs.length / 2];
    for (var i = 0; i < ruleConfigs.length; i += 2) {
      rules[i / 2] = Map.entry(ruleConfigs[i], Map.of("level", ruleConfigs[i + 1]));
    }
    return Map.ofEntries(rules);
  }

  protected void didChange(String uri, String content) {
    var docId = new VersionedTextDocumentIdentifier(uri, 1);
    lsProxy.getTextDocumentService()
      .didChange(new DidChangeTextDocumentParams(docId, List.of(new TextDocumentContentChangeEvent(content))));
  }

  protected void didOpen(String uri, String languageId, String content) {
    lsProxy.getTextDocumentService()
      .didOpen(new DidOpenTextDocumentParams(new TextDocumentItem(uri, languageId, 1, content)));
    toBeClosed.add(uri);
  }

  protected void didClose(String uri) {
    lsProxy.getTextDocumentService()
      .didClose(new DidCloseTextDocumentParams(new TextDocumentIdentifier(uri)));
    toBeClosed.remove(uri);
  }


  protected ThrowingExtractor<? super MessageParams, String, RuntimeException> withoutTimestamp() {
    return p -> p.getMessage().replaceAll("\\[(\\w*)\\s+-\\s[\\d:.]*\\]", "[$1]");
  }

  protected ThrowingExtractor<? super MessageParams, String, RuntimeException> withoutTimestampAndMillis() {
    return p -> p.getMessage().replaceAll("\\[(\\w*)\\s+-\\s[\\d:.]*\\]", "[$1]").replaceAll("\\d+ms", "XXXms");
  }

  protected Function<? super Diagnostic, ?> code() {
    return d -> d.getCode().getLeft();
  }

  protected Function<? super Diagnostic, ?> endCharacter() {
    return d -> d.getRange().getEnd().getCharacter();
  }

  protected Function<? super Diagnostic, ?> endLine() {
    return d -> d.getRange().getEnd().getLine();
  }

  protected Function<? super Diagnostic, ?> startCharacter() {
    return d -> d.getRange().getStart().getCharacter();
  }

  protected Function<? super Diagnostic, ?> startLine() {
    return d -> d.getRange().getStart().getLine();
  }

  protected void awaitUntilAsserted(ThrowingRunnable assertion) {
    await().atMost(2, MINUTES).untilAsserted(assertion);
  }


  protected Map<String, Object> getFolderSettings(String folderUri) {
    return client.folderSettings.computeIfAbsent(folderUri, f -> new HashMap<>());
  }

  /**
   * Use this instead of {@link org.junit.jupiter.api.io.TempDir} that has issues on Windows
   */
  protected Path makeInstanceTempDir() throws Exception {
    var newTempDir = Files.createTempDirectory(null);
    instanceTempDirs.add(newTempDir);
    return newTempDir;
  }

  /**
   * Use this instead of {@link org.junit.jupiter.api.io.TempDir} that has issues on Windows
   */
  protected static Path makeStaticTempDir() throws IOException {
    var newTempDir = Files.createTempDirectory(null);
    staticTempDirs.add(newTempDir);
    return newTempDir;
  }

  static class NewCodeDefinitionDto {
    String newCodeDefinitionOrMessage;
    boolean isSupported;

    public NewCodeDefinitionDto(String newCodeDefinitionOrMessage, boolean isSupported) {
      this.newCodeDefinitionOrMessage = newCodeDefinitionOrMessage;
      this.isSupported = isSupported;
    }

    public String getNewCodeDefinitionOrMessage() {
      return newCodeDefinitionOrMessage;
    }

    public boolean isSupported() {
      return isSupported;
    }
  }

  private static String upsertFile(Path folderPath, String fileName, String content) {
    var filePath = folderPath.resolve(fileName);
    try {
      Files.writeString(filePath, content);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
    return filePath.toUri().toString();
  }

  @Test
  void analyzeSimpleJsFileOnOpen() {
    var uri = upsertFile(analysisDir, "analyzeSimpleJsFileOnOpen.js", "");
    didOpen(uri, "javascript", "function foo() {\n  let toto = 0;\n  let plouf = 0;\n}");

    awaitUntilAsserted(() -> assertThat(client.getDiagnostics(uri))
      .extracting(startLine(), startCharacter(), endLine(), endCharacter(), code(), Diagnostic::getSource, Diagnostic::getMessage, Diagnostic::getSeverity)
      .containsExactlyInAnyOrder(
        tuple(1, 6, 1, 10, "javascript:S1481", "sonarlint", "Remove the declaration of the unused 'toto' variable.", DiagnosticSeverity.Warning),
        tuple(2, 6, 2, 11, "javascript:S1481", "sonarlint", "Remove the declaration of the unused 'plouf' variable.", DiagnosticSeverity.Warning)));
  }

  @Test
  void noIssueOnTestJSFiles() {
    var jsFilename = "foo.js";
    var jsContent = "function foo() {\n  let toto = 0;\n}";
    var tsConfigFilename = "tsconfig.json";
    var tsConfigContent = "{\"files\": [\"%s\"]}".formatted(jsFilename);

    var tsconfigUri = upsertFile(analysisDir, tsConfigFilename, tsConfigContent);
    var jsFileUri = upsertFile(analysisDir, jsFilename, jsContent);

    didOpen(jsFileUri, "javascript", jsContent);
    awaitUntilAsserted(() -> assertThat(client.logs)
      .extracting(withoutTimestampAndMillis())
      .containsAll(List.of("[Info] Analysis detected 1 issue and 0 Security Hotspots in XXXms"))
      .anyMatch(log -> log.matches("\\[Info] Found 1 tsconfig\\.json file\\(s\\): \\[.*tsconfig.json]"))
      .anyMatch(log -> log.matches("\\[Info] Using tsConfig .*tsconfig\\.json for file source file .*foo.js \\(0/1 tsconfigs not yet checked\\)")));
    awaitUntilAsserted(() -> assertThat(client.getDiagnostics(jsFileUri)).hasSize(1));

    didOpen(tsconfigUri, "", tsConfigContent);

    client.logs.clear();
  }
}
