///*
// * SonarOmnisharp ITs
// * Copyright (C) 2021-2024 SonarSource SA
// * mailto:info AT sonarsource DOT com
// *
// * This program is free software; you can redistribute it and/or
// * modify it under the terms of the GNU Lesser General Public
// * License as published by the Free Software Foundation; either
// * version 3 of the License, or (at your option) any later version.
// *
// * This program is distributed in the hope that it will be useful,
// * but WITHOUT ANY WARRANTY; without even the implied warranty of
// * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// * Lesser General Public License for more details.
// *
// * You should have received a copy of the GNU Lesser General Public License
// * along with this program; if not, write to the Free Software Foundation,
// * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
// */
//
//package com.sonar.javascript.it.plugin.sonarlint.tests;
//
//import static org.assertj.core.api.Assertions.assertThat;
//import static org.assertj.core.api.Assertions.tuple;
//import static org.junit.jupiter.api.Assertions.fail;
//
//import java.io.File;
//import java.io.IOException;
//import java.io.PipedInputStream;
//import java.io.PipedOutputStream;
//import java.net.URI;
//import java.net.URL;
//import java.nio.file.Files;
//import java.nio.file.Path;
//import java.nio.file.Paths;
//import java.util.ArrayList;
//import java.util.Collections;
//import java.util.HashMap;
//import java.util.List;
//import java.util.Map;
//import java.util.Set;
//import java.util.UUID;
//import java.util.concurrent.CancellationException;
//import org.apache.commons.io.FileUtils;
//import org.apache.commons.io.filefilter.FalseFileFilter;
//import org.apache.commons.io.filefilter.RegexFileFilter;
//import org.junit.jupiter.api.AfterAll;
//import org.junit.jupiter.api.AfterEach;
//import org.junit.jupiter.api.BeforeAll;
//import org.junit.jupiter.api.BeforeEach;
//import org.junit.jupiter.api.Test;
//import org.junit.jupiter.api.io.TempDir;
//import org.sonarsource.sonarlint.core.rpc.client.ClientJsonRpcLauncher;
//import org.sonarsource.sonarlint.core.rpc.client.ConfigScopeNotFoundException;
//import org.sonarsource.sonarlint.core.rpc.client.ConnectionNotFoundException;
//import org.sonarsource.sonarlint.core.rpc.client.SonarLintCancelChecker;
//import org.sonarsource.sonarlint.core.rpc.client.SonarLintRpcClientDelegate;
//import org.sonarsource.sonarlint.core.rpc.impl.BackendJsonRpcLauncher;
//import org.sonarsource.sonarlint.core.rpc.protocol.SonarLintRpcServer;
//import org.sonarsource.sonarlint.core.rpc.protocol.backend.analysis.AnalyzeFilesAndTrackParams;
//import org.sonarsource.sonarlint.core.rpc.protocol.backend.analysis.DidChangeAnalysisPropertiesParams;
//import org.sonarsource.sonarlint.core.rpc.protocol.backend.config.binding.BindingSuggestionDto;
//import org.sonarsource.sonarlint.core.rpc.protocol.backend.file.DidUpdateFileSystemParams;
//import org.sonarsource.sonarlint.core.rpc.protocol.backend.initialize.ClientConstantInfoDto;
//import org.sonarsource.sonarlint.core.rpc.protocol.backend.initialize.FeatureFlagsDto;
//import org.sonarsource.sonarlint.core.rpc.protocol.backend.initialize.HttpConfigurationDto;
//import org.sonarsource.sonarlint.core.rpc.protocol.backend.initialize.InitializeParams;
//import org.sonarsource.sonarlint.core.rpc.protocol.backend.initialize.LanguageSpecificRequirements;
//import org.sonarsource.sonarlint.core.rpc.protocol.backend.initialize.TelemetryClientConstantAttributesDto;
//import org.sonarsource.sonarlint.core.rpc.protocol.backend.rules.UpdateStandaloneRulesConfigurationParams;
//import org.sonarsource.sonarlint.core.rpc.protocol.backend.tracking.TaintVulnerabilityDto;
//import org.sonarsource.sonarlint.core.rpc.protocol.client.analysis.RawIssueDto;
//import org.sonarsource.sonarlint.core.rpc.protocol.client.binding.AssistBindingParams;
//import org.sonarsource.sonarlint.core.rpc.protocol.client.binding.AssistBindingResponse;
//import org.sonarsource.sonarlint.core.rpc.protocol.client.binding.NoBindingSuggestionFoundParams;
//import org.sonarsource.sonarlint.core.rpc.protocol.client.connection.AssistCreatingConnectionParams;
//import org.sonarsource.sonarlint.core.rpc.protocol.client.connection.AssistCreatingConnectionResponse;
//import org.sonarsource.sonarlint.core.rpc.protocol.client.connection.ConnectionSuggestionDto;
//import org.sonarsource.sonarlint.core.rpc.protocol.client.event.DidReceiveServerHotspotEvent;
//import org.sonarsource.sonarlint.core.rpc.protocol.client.fix.FixSuggestionDto;
//import org.sonarsource.sonarlint.core.rpc.protocol.client.hotspot.HotspotDetailsDto;
//import org.sonarsource.sonarlint.core.rpc.protocol.client.http.GetProxyPasswordAuthenticationResponse;
//import org.sonarsource.sonarlint.core.rpc.protocol.client.http.ProxyDto;
//import org.sonarsource.sonarlint.core.rpc.protocol.client.http.X509CertificateDto;
//import org.sonarsource.sonarlint.core.rpc.protocol.client.issue.IssueDetailsDto;
//import org.sonarsource.sonarlint.core.rpc.protocol.client.log.LogParams;
//import org.sonarsource.sonarlint.core.rpc.protocol.client.message.MessageType;
//import org.sonarsource.sonarlint.core.rpc.protocol.client.message.ShowSoonUnsupportedMessageParams;
//import org.sonarsource.sonarlint.core.rpc.protocol.client.progress.ReportProgressParams;
//import org.sonarsource.sonarlint.core.rpc.protocol.client.progress.StartProgressParams;
//import org.sonarsource.sonarlint.core.rpc.protocol.client.smartnotification.ShowSmartNotificationParams;
//import org.sonarsource.sonarlint.core.rpc.protocol.client.telemetry.TelemetryClientLiveAttributesResponse;
//import org.sonarsource.sonarlint.core.rpc.protocol.common.ClientFileDto;
//import org.sonarsource.sonarlint.core.rpc.protocol.common.Either;
//import org.sonarsource.sonarlint.core.rpc.protocol.common.Language;
//import org.sonarsource.sonarlint.core.rpc.protocol.common.TokenDto;
//import org.sonarsource.sonarlint.core.rpc.protocol.common.UsernamePasswordDto;
//
//class SonarJSIntegrationTests {
//
//  private static final String SOLUTION1_MODULE_KEY = "solution1";
//  private static final String SOLUTION2_MODULE_KEY = "solution2";
//
//  private static final ClientConstantInfoDto IT_CLIENT_INFO = new ClientConstantInfoDto("clientName", "integrationTests");
//  private static final TelemetryClientConstantAttributesDto IT_TELEMETRY_ATTRIBUTES = new TelemetryClientConstantAttributesDto("SLO# ITs", "SonarLint ITs",
//    "1.2.3", "4.5.6", Collections.emptyMap());
//
//  private static SonarLintRpcServer backend;
//  private static MockSonarLintRpcClientDelegate client;
//
//  @BeforeAll
//  public static void prepare(@TempDir Path tmpDir) throws Exception {
//    var clientToServerOutputStream = new PipedOutputStream();
//    var clientToServerInputStream = new PipedInputStream(clientToServerOutputStream);
//
//    var serverToClientOutputStream = new PipedOutputStream();
//    var serverToClientInputStream = new PipedInputStream(serverToClientOutputStream);
//
//    client = new MockSonarLintRpcClientDelegate() {
//      @Override
//      public void log(LogParams params) {
//        System.out.println(params);
//      }
//    };
//    new BackendJsonRpcLauncher(clientToServerInputStream, serverToClientOutputStream);
//    var clientLauncher = new ClientJsonRpcLauncher(serverToClientInputStream, clientToServerOutputStream, client);
//    backend = clientLauncher.getServerProxy();
//
//    var slHome = tmpDir.resolve("sonarlintHome");
//    Files.createDirectories(slHome);
//    var pluginJar = FileUtils
//      .listFiles(Paths.get("../sonar-plugin/sonar-javascript-plugin/target/").toAbsolutePath().normalize().toFile(), new RegexFileFilter("^sonar-javascript-plugin-([0-9.]+)(-SNAPSHOT)*.jar$"),
//        FalseFileFilter.FALSE)
//      .iterator().next().toPath();
//
//    var featureFlags = new FeatureFlagsDto(false, false, false, false, true, false, false, false, false, false);
//
//    backend.initialize(
//        new InitializeParams(IT_CLIENT_INFO, IT_TELEMETRY_ATTRIBUTES, HttpConfigurationDto.defaultConfig(), null, featureFlags,
//          slHome.resolve("storage"),
//          slHome.resolve("work"),
//          Set.of(pluginJar), Collections.emptyMap(),
//          Set.of(org.sonarsource.sonarlint.core.rpc.protocol.common.Language.JS, org.sonarsource.sonarlint.core.rpc.protocol.common.Language.TS, org.sonarsource.sonarlint.core.rpc.protocol.common.Language.CSS), Collections.emptySet(), Collections.emptySet(), Collections.emptyList(), Collections.emptyList(), slHome.toString(), Map.of(),
//          false, new LanguageSpecificRequirements(null, null, false, null))
//      .get();
//  }
//
//  @BeforeEach
//  public void cleanupClient() {
//    client.clear();
//  }
//
//  @AfterEach
//  public void cleanupBackend() {
//    // Reset rules configuration
//    backend.getRulesService().updateStandaloneRulesConfiguration(new UpdateStandaloneRulesConfigurationParams(Map.of()));
//  }
//
//  @AfterAll
//  @SuppressWarnings("java:S2925")
//  public static void stop() throws InterruptedException {
//    Thread.sleep(5000);
//    backend.shutdown().join();
//  }
//
//  @Test
//  void analyzeNet5Solution(@TempDir Path tmpDir) throws Exception {
//    Path baseDir = prepareTestSolutionAndRestore(tmpDir, "ConsoleAppNet5");
//    var issues = analyzeCSharpFile(SOLUTION1_MODULE_KEY, baseDir.toString(), "ConsoleApp1/Program.cs", "using System;\n" +
//        "\n" +
//        "namespace ConsoleApp1\n" +
//        "{\n" +
//        "    class Program\n" +
//        "    {\n" +
//        "        static void Main(string[] args)\n" +
//        "        {\n" +
//        "            // TODO foo\n" +
//        "            Console.WriteLine(\"Hello World!\");\n" +
//        "        }\n" +
//        "    }\n" +
//        "}",
//      "sonar.cs.internal.useNet6", "true",
//      "sonar.cs.internal.solutionPath", baseDir.resolve("ConsoleApp1.sln").toString());
//
//    assertThat(issues)
//      .extracting(RawIssueDto::getRuleKey, RawIssueDto::getPrimaryMessage)
//      .containsOnly(
//        tuple("csharpsquid:S1118", "Add a 'protected' constructor or the 'static' keyword to the class declaration."),
//        tuple("csharpsquid:S1135", "Complete the task associated to this 'TODO' comment."));
//  }
//
//  private Path prepareTestSolutionAndRestore(Path tmpDir, String name) throws IOException, InterruptedException {
//    Path baseDir = prepareTestSolution(tmpDir, name);
//    restore(baseDir);
//    return baseDir;
//  }
//
//  private Path prepareTestSolution(Path tmpDir, String name) throws IOException {
//    Path baseDir = tmpDir.toRealPath().resolve(name);
//    Files.createDirectories(baseDir);
//    FileUtils.copyDirectory(new File("src/test/projects/" + name), baseDir.toFile());
//    return baseDir;
//  }
//
//  private void restore(Path solutionDirOrFile) throws IOException, InterruptedException {
//    ProcessBuilder pb;
//    if (Files.isRegularFile(solutionDirOrFile)) {
//      pb = new ProcessBuilder("dotnet", "restore", solutionDirOrFile.getFileName().toString())
//        .directory(solutionDirOrFile.getParent().toFile())
//        .inheritIO();
//    } else {
//      pb = new ProcessBuilder("dotnet", "restore")
//        .directory(solutionDirOrFile.toFile())
//        .inheritIO();
//    }
//    Process process = pb.start();
//    if (process.waitFor() != 0) {
//      fail("Unable to run dotnet restore");
//    }
//  }
//
//  private List<RawIssueDto> analyzeCSharpFile(String configScopeId, String baseDir, String filePathStr, String content, String... properties) throws Exception {
//    var filePath = Path.of("projects").resolve(baseDir).resolve(filePathStr);
//    var fileUri = filePath.toUri();
//    backend.getFileService().didUpdateFileSystem(new DidUpdateFileSystemParams(List.of(),
//      List.of(new ClientFileDto(fileUri, Path.of(filePathStr), configScopeId, false, "UTF-8", filePath.toAbsolutePath(), content, Language.CS, true))));
//
//    var propertiesMap = new HashMap<String, String>();
//    for (int i=0; i<properties.length; i+=2) {
//      propertiesMap.put(properties[i], properties[i+1]);
//    }
//    backend.getAnalysisService().didSetUserAnalysisProperties(new DidChangeAnalysisPropertiesParams(configScopeId, propertiesMap));
//    var analyzeResponse = backend.getAnalysisService().analyzeFilesAndTrack(
//      new AnalyzeFilesAndTrackParams(configScopeId, UUID.randomUUID(), List.of(fileUri), propertiesMap, false, System.currentTimeMillis())
//    ).join();
//
//    assertThat(analyzeResponse.getFailedAnalysisFiles()).isEmpty();
//    // it could happen that the notification is not yet received while the analysis request is finished.
//    // await().atMost(Duration.ofMillis(200)).untilAsserted(() -> assertThat(((MockSonarLintRpcClientDelegate) client).getRaisedIssues(configScopeId)).isNotEmpty());
//    Thread.sleep(200);
//    var raisedIssues = ((MockSonarLintRpcClientDelegate) client).getRaisedIssues(configScopeId);
//    ((MockSonarLintRpcClientDelegate) client).getRaisedIssues().clear();
//    return raisedIssues != null ? raisedIssues : List.of();
//  }
//
//  static class MockSonarLintRpcClientDelegate implements SonarLintRpcClientDelegate {
//
//    private final Map<String, List<RawIssueDto>> raisedIssues = new HashMap<>();
//    private final List<String> logs = new ArrayList<>();
//
//    public List<RawIssueDto> getRaisedIssues(String configurationScopeId) {
//      var issues = raisedIssues.get(configurationScopeId);
//      return issues != null ? issues : List.of();
//    }
//
//    public Map<String, List<RawIssueDto>> getRaisedIssues() {
//      return raisedIssues;
//    }
//
//    public List<String> getLogs() {
//      return logs;
//    }
//
//    @Override
//    public void didRaiseIssue(String configurationScopeId, UUID analysisId, RawIssueDto rawIssue) {
//      raisedIssues.computeIfAbsent(configurationScopeId, k -> new ArrayList<>()).add(rawIssue);
//    }
//
//    @Override
//    public void suggestBinding(Map<String, List<BindingSuggestionDto>> suggestionsByConfigScope) {
//
//    }
//
//    @Override
//    public void suggestConnection(Map<String, List<ConnectionSuggestionDto>> suggestionsByConfigScope) {
//
//    }
//
//    @Override
//    public void openUrlInBrowser(URL url) {
//
//    }
//
//    @Override
//    public void showMessage(MessageType type, String text) {
//
//    }
//
//    @Override
//    public void log(LogParams params) {
//      this.logs.add(params.getMessage());
//    }
//
//    @Override
//    public void showSoonUnsupportedMessage(ShowSoonUnsupportedMessageParams params) {
//
//    }
//
//    @Override
//    public void showSmartNotification(ShowSmartNotificationParams params) {
//
//    }
//
//    @Override
//    public String getClientLiveDescription() {
//      return "";
//    }
//
//    @Override
//    public void showHotspot(String configurationScopeId, HotspotDetailsDto hotspotDetails) {
//
//    }
//
//    @Override
//    public void showIssue(String configurationScopeId, IssueDetailsDto issueDetails) {
//
//    }
//
//    @Override
//    public void showFixSuggestion(String configurationScopeId, String issueKey, FixSuggestionDto fixSuggestion) {
//
//    }
//
//    @Override
//    public AssistCreatingConnectionResponse assistCreatingConnection(AssistCreatingConnectionParams params, SonarLintCancelChecker cancelChecker) throws CancellationException {
//      throw new CancellationException("Unsupported in ITS");
//    }
//
//    @Override
//    public AssistBindingResponse assistBinding(AssistBindingParams params, SonarLintCancelChecker cancelChecker) throws CancellationException {
//      throw new CancellationException("Unsupported in ITS");
//    }
//
//    @Override
//    public void startProgress(StartProgressParams params) throws UnsupportedOperationException {
//
//    }
//
//    @Override
//    public void reportProgress(ReportProgressParams params) {
//
//    }
//
//    @Override
//    public void didSynchronizeConfigurationScopes(Set<String> configurationScopeIds) {
//
//    }
//
//    @Override
//    public Either<TokenDto, UsernamePasswordDto> getCredentials(String connectionId) throws ConnectionNotFoundException {
//      throw new ConnectionNotFoundException();
//    }
//
//    @Override
//    public List<ProxyDto> selectProxies(URI uri) {
//      return List.of(ProxyDto.NO_PROXY);
//    }
//
//    @Override
//    public GetProxyPasswordAuthenticationResponse getProxyPasswordAuthentication(String host, int port, String protocol, String prompt, String scheme, URL targetHost) {
//      return new GetProxyPasswordAuthenticationResponse("", "");
//    }
//
//    @Override
//    public boolean checkServerTrusted(List<X509CertificateDto> chain, String authType) {
//      return false;
//    }
//
//    @Override
//    public void didReceiveServerHotspotEvent(DidReceiveServerHotspotEvent params) {
//
//    }
//
//    @Override
//    public String matchSonarProjectBranch(String configurationScopeId, String mainBranchName, Set<String> allBranchesNames, SonarLintCancelChecker cancelChecker)
//      throws ConfigScopeNotFoundException {
//      return mainBranchName;
//    }
//
//    public boolean matchProjectBranch(String configurationScopeId, String branchNameToMatch, SonarLintCancelChecker cancelChecker) throws ConfigScopeNotFoundException {
//      return true;
//    }
//
//    @Override
//    public void didChangeMatchedSonarProjectBranch(String configScopeId, String newMatchedBranchName) {
//
//    }
//
//    @Override
//    public TelemetryClientLiveAttributesResponse getTelemetryLiveAttributes() {
//      System.err.println("Telemetry should be disabled in ITs");
//      throw new CancellationException("Telemetry should be disabled in ITs");
//    }
//
//    @Override
//    public void didChangeTaintVulnerabilities(String configurationScopeId, Set<UUID> closedTaintVulnerabilityIds, List<TaintVulnerabilityDto> addedTaintVulnerabilities,
//      List<TaintVulnerabilityDto> updatedTaintVulnerabilities) {
//
//    }
//
//    @Override
//    public List<ClientFileDto> listFiles(String configScopeId) {
//      return List.of();
//    }
//
//    @Override
//    public void noBindingSuggestionFound(NoBindingSuggestionFoundParams params) {
//    }
//
//    @Override
//    public void didChangeAnalysisReadiness(Set<String> configurationScopeIds, boolean areReadyForAnalysis) {
//
//    }
//
//    public void clear() {
//      raisedIssues.clear();
//      logs.clear();
//    }
//
//  }
//}